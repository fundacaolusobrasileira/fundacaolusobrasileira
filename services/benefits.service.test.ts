// services/benefits.service.test.ts
// Unit: BenefitSchema validation (each constraint = one test).
// Integration: service rejects invalid payload WITHOUT calling Supabase; valid payload calls Supabase.
// E2E: SKIPPED — covered indirectly by Phase 3 E2E "editor cria benefício" flow (test-strategy.md 3.1).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BenefitSchema } from '../validation/schemas';

// --- Mocks ---
const mockEq = vi.fn().mockResolvedValue({ error: null });
// Service chains: insert([...]).select().single() → Promise<{data, error}>
const mockSingle = vi.fn<any>().mockResolvedValue({ data: { id: 'b-new', title: 'Desconto 10%' }, error: null });
const mockInsertSelect = vi.fn<any>(() => ({ single: mockSingle }));
const mockInsert = vi.fn<any>(() => ({ select: mockInsertSelect }));
const mockUpdate = vi.fn<any>(() => ({ eq: mockEq }));
const mockDelete = vi.fn<any>(() => ({ eq: mockEq }));
const mockSelect = vi.fn<any>(() => ({
  eq: vi.fn(() => ({
    order: vi.fn(() => ({
      order: vi.fn().mockResolvedValue({
        data: [{ id: 'b-1', partner_id: 'p-uuid', title: 'Desconto 10%', category: 'desconto', active: true, order: 0, created_at: '2026-04-25T00:00:00Z' }],
        error: null,
      }),
    })),
  })),
  order: vi.fn(() => ({
    order: vi.fn().mockResolvedValue({
      data: [{ id: 'b-1', partner_id: 'p-uuid', title: 'Desconto 10%', category: 'desconto', active: true, order: 0, created_at: '2026-04-25T00:00:00Z' }],
      error: null,
    }),
  })),
}));
const mockFrom = vi.fn<any>(() => ({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
}));

vi.mock('../supabaseClient', () => ({ supabase: { from: mockFrom } }));
vi.mock('../store/app.store', async () => {
  const actual = await vi.importActual('../store/app.store');
  return {
    ...actual as any,
    isEditor: vi.fn(() => true),
    showToast: vi.fn(),
    logActivity: vi.fn(),
  };
});

// --- BenefitSchema unit tests ---

describe('BenefitSchema (unit)', () => {
  const valid = {
    partner_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    title: 'Desconto 10%',
    category: 'desconto' as const,
    active: true,
    order: 0,
  };

  it('accepts a valid benefit payload', () => {
    expect(() => BenefitSchema.parse(valid)).not.toThrow();
  });

  it('rejects empty title', () => {
    expect(() => BenefitSchema.parse({ ...valid, title: '' })).toThrow();
  });

  it('rejects title longer than 200 chars', () => {
    expect(() => BenefitSchema.parse({ ...valid, title: 'a'.repeat(201) })).toThrow();
  });

  it('rejects invalid partner_id (not UUID format)', () => {
    expect(() => BenefitSchema.parse({ ...valid, partner_id: 'not-a-uuid' })).toThrow();
  });

  it('rejects invalid category', () => {
    expect(() => BenefitSchema.parse({ ...valid, category: 'invalid' as any })).toThrow();
  });

  it('rejects negative order', () => {
    expect(() => BenefitSchema.parse({ ...valid, order: -1 })).toThrow();
  });

  it('accepts optional description and link', () => {
    expect(() => BenefitSchema.parse({ ...valid, description: 'Desc', link: 'https://example.com' })).not.toThrow();
  });

  it('rejects unsafe link URL', () => {
    expect(() => BenefitSchema.parse({ ...valid, link: 'javascript:alert(1)' })).toThrow();
  });
});

// --- Integration tests: service validates before calling Supabase ---

describe('createBenefit (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSingle.mockResolvedValue({ data: { id: 'b-new', title: 'Desconto 10%' }, error: null });
  });

  it('calls Supabase insert for a valid benefit', async () => {
    const { createBenefit } = await import('./benefits.service');
    await createBenefit({
      partner_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      title: 'Desconto 10%',
      category: 'desconto',
      active: true,
      order: 0,
    });
    expect(mockFrom).toHaveBeenCalledWith('benefits');
    expect(mockInsert).toHaveBeenCalled();
    const payload = mockInsert.mock.calls[0][0][0];
    expect(payload.title).toBe('Desconto 10%');
  });

  it('rejects empty title WITHOUT calling Supabase', async () => {
    const { createBenefit } = await import('./benefits.service');
    const result = await createBenefit({
      partner_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      title: '',
      category: 'desconto',
      active: true,
      order: 0,
    });
    expect(result).toBeNull();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('rejects invalid partner_id WITHOUT calling Supabase', async () => {
    const { createBenefit } = await import('./benefits.service');
    const result = await createBenefit({
      partner_id: 'not-a-uuid',
      title: 'Benefício',
      category: 'acesso',
      active: true,
      order: 0,
    });
    expect(result).toBeNull();
    expect(mockInsert).not.toHaveBeenCalled();
  });
});

describe('updateBenefit (integration)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls Supabase update for valid patch', async () => {
    const { updateBenefit } = await import('./benefits.service');
    const ok = await updateBenefit('b-1', { title: 'Novo Título', order: 1 });
    expect(ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith({ title: 'Novo Título', order: 1 });
  });

  it('strips unknown fields from valid update patch before calling Supabase', async () => {
    const { updateBenefit } = await import('./benefits.service');
    const ok = await updateBenefit('b-1', { title: 'Novo Título', foo: 'bar' } as any);
    expect(ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({ title: 'Novo Título' });
  });

  it('rejects empty title patch WITHOUT calling Supabase', async () => {
    const { updateBenefit } = await import('./benefits.service');
    const ok = await updateBenefit('b-1', { title: '' });
    expect(ok).toBe(false);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
