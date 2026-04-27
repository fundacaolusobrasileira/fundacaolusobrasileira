// services/precadastros.service.test.ts
// Unit: normalizePreCadastro (snake→camel), CreatePreCadastroSchema constraints.
// Integration: full CRUD + validation blocking + store mutations + orchestration.
// E2E: SKIPPED per test-strategy.md 1.1 — covered in Phase 3 (precadastro-flow.spec.ts).

import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---
const mockInsertSingle = vi.fn<any>().mockResolvedValue({
  data: {
    id: 'pc-new',
    name: 'Ana',
    email: 'a@a.com',
    type: 'individual',
    registrationType: null,
    message: 'Olá',
    status: 'novo',
    created_at: '2026-04-26T00:00:00Z',
    updated_at: '2026-04-26T00:00:00Z',
  },
  error: null,
});
const mockInsertSelect = vi.fn<any>(() => ({ single: mockInsertSingle }));
const mockInsert = vi.fn<any>(() => ({ error: null, select: mockInsertSelect }));
// Update + Delete chains now use .select() to detect RLS silent-filter.
const mockUpdateEqSelect = vi.fn<any>().mockResolvedValue({ data: [{ id: 'mock-pre' }], error: null });
const mockUpdateEq = vi.fn<any>(() => ({ select: mockUpdateEqSelect }));
const mockDeleteEqSelect = vi.fn<any>().mockResolvedValue({ data: [{ id: 'mock-pre' }], error: null });
// mockEq remains as the inner eq mock (used by both delete and update chains for `.eq` call assertions)
const mockEq = vi.fn<any>(() => ({ select: mockDeleteEqSelect }));
const mockUpdate = vi.fn<any>(() => ({ eq: mockUpdateEq }));
const mockDelete = vi.fn<any>(() => ({ eq: mockEq }));
const mockOrder = vi.fn<any>().mockResolvedValue({
  data: [{ id: 'pc-1', name: 'João', email: 'j@e.com', type: 'pessoa', status: 'novo', created_at: '2026-03-30T10:00:00Z', updated_at: '2026-03-30T10:00:00Z' }],
  error: null,
});
const mockSelect = vi.fn<any>(() => ({ order: mockOrder }));
const mockFrom = vi.fn<any>(() => ({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
}));

const mockCreateMember = vi.fn<any>().mockResolvedValue({ id: 'new-member-1', name: '' });
const mockUpdateMember = vi.fn<any>().mockResolvedValue(true);

vi.mock('../supabaseClient', () => ({ supabase: { from: mockFrom } }));
vi.mock('./members.service', () => ({
  createMember: (...args: any[]) => mockCreateMember(...args),
  updateMember: (...args: any[]) => mockUpdateMember(...args),
}));
vi.mock('../store/app.store', async () => {
  const actual = await vi.importActual('../store/app.store');
  return {
    ...actual as any,
    isEditor: vi.fn(() => true),
    showToast: vi.fn(),
    logActivity: vi.fn(),
  };
});

// --- Helpers ---
const seedStore = async () => {
  const { PRECADASTROS } = await import('../store/app.store');
  const { syncPreCadastros } = await import('./precadastros.service');
  PRECADASTROS.length = 0;
  await syncPreCadastros();
};

// ============================================================
// UNIT — normalizePreCadastro (via syncPreCadastros side-effect)
// ============================================================
describe('normalizePreCadastro (unit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrder.mockResolvedValue({
      data: [{ id: 'pc-1', name: 'João', email: 'j@e.com', type: 'pessoa', registrationType: 'membro', status: 'novo', notes: 'ok', created_at: '2026-03-30T10:00:00Z', updated_at: '2026-03-30T10:01:00Z' }],
      error: null,
    });
  });

  it('maps created_at to createdAt', async () => {
    await seedStore();
    const { PRECADASTROS } = await import('../store/app.store');
    expect(PRECADASTROS[0].createdAt).toBe('2026-03-30T10:00:00Z');
  });

  it('strips created_at and updated_at snake_case fields', async () => {
    await seedStore();
    const { PRECADASTROS } = await import('../store/app.store');
    expect((PRECADASTROS[0] as any).created_at).toBeUndefined();
    expect((PRECADASTROS[0] as any).updated_at).toBeUndefined();
  });

  it('preserves all other fields (registrationType, notes, status)', async () => {
    await seedStore();
    const { PRECADASTROS } = await import('../store/app.store');
    expect(PRECADASTROS[0].registrationType).toBe('membro');
    expect(PRECADASTROS[0].notes).toBe('ok');
    expect(PRECADASTROS[0].status).toBe('novo');
  });
});

// ============================================================
// UNIT — CreatePreCadastroSchema validation
// ============================================================
describe('CreatePreCadastroSchema (unit)', () => {
  // Access the schema via the behavior of createPreCadastro (no direct export)
  // Integration-level: Supabase NOT called when schema fails

  beforeEach(() => {
    vi.clearAllMocks();
    mockInsertSingle.mockResolvedValue({
      data: {
        id: 'pc-new',
        name: 'Ana',
        email: 'a@a.com',
        type: 'individual',
        registrationType: null,
        message: undefined,
        status: 'novo',
        created_at: '2026-04-26T00:00:00Z',
        updated_at: '2026-04-26T00:00:00Z',
      },
      error: null,
    });
  });

  it('rejects name shorter than 2 chars — Supabase NOT called', async () => {
    const { createPreCadastro } = await import('./precadastros.service');
    const result = await createPreCadastro({ name: 'A', email: 'a@a.com' });
    expect(result).toBeNull();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('rejects name longer than 100 chars — Supabase NOT called', async () => {
    const { createPreCadastro } = await import('./precadastros.service');
    const result = await createPreCadastro({ name: 'a'.repeat(101), email: 'a@a.com' });
    expect(result).toBeNull();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('rejects invalid email — Supabase NOT called', async () => {
    const { createPreCadastro } = await import('./precadastros.service');
    const result = await createPreCadastro({ name: 'Ana', email: 'not-an-email' });
    expect(result).toBeNull();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('rejects message longer than 1000 chars — Supabase NOT called', async () => {
    const { createPreCadastro } = await import('./precadastros.service');
    const result = await createPreCadastro({ name: 'Ana', email: 'a@a.com', message: 'x'.repeat(1001) });
    expect(result).toBeNull();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('shows toast when schema rejects', async () => {
    const { createPreCadastro } = await import('./precadastros.service');
    const { showToast } = await import('../store/app.store');
    await createPreCadastro({ name: 'A', email: 'a@a.com' });
    expect(showToast).toHaveBeenCalledWith(expect.any(String), 'error');
  });
});

// ============================================================
// INTEGRATION — syncPreCadastros
// ============================================================
describe('syncPreCadastros (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrder.mockResolvedValue({
      data: [
        { id: 'pc-1', name: 'João', email: 'j@e.com', type: 'pessoa', status: 'novo', created_at: '2026-03-30T10:00:00Z', updated_at: '2026-03-30T10:00:00Z' },
        { id: 'pc-2', name: 'Maria', email: 'm@m.com', type: 'empresarial', status: 'contatado', created_at: '2026-03-29T10:00:00Z', updated_at: '2026-03-29T10:00:00Z' },
      ],
      error: null,
    });
  });

  it('replaces store content entirely on re-sync (no duplicates)', async () => {
    const { PRECADASTROS } = await import('../store/app.store');
    PRECADASTROS.length = 0;
    const { syncPreCadastros } = await import('./precadastros.service');
    await syncPreCadastros();
    await syncPreCadastros();
    expect(PRECADASTROS).toHaveLength(2);
  });

  it('queries ordered by created_at descending', async () => {
    const { syncPreCadastros } = await import('./precadastros.service');
    await syncPreCadastros();
    expect(mockFrom).toHaveBeenCalledWith('precadastros');
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('silently ignores Supabase error (store unchanged)', async () => {
    const { PRECADASTROS } = await import('../store/app.store');
    PRECADASTROS.length = 0;
    mockOrder.mockResolvedValue({ data: null, error: { message: 'DB error' } });
    const { syncPreCadastros } = await import('./precadastros.service');
    await syncPreCadastros();
    expect(PRECADASTROS).toHaveLength(0);
  });
});

// ============================================================
// INTEGRATION — createPreCadastro
// ============================================================
describe('createPreCadastro (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsertSingle.mockResolvedValue({
      data: {
        id: 'pc-new',
        name: 'Ana',
        email: 'a@a.com',
        type: 'individual',
        registrationType: null,
        message: 'Olá',
        status: 'novo',
        created_at: '2026-04-26T00:00:00Z',
        updated_at: '2026-04-26T00:00:00Z',
      },
      error: null,
    });
  });

  it('sends only DB-safe fields (no camelCase createdAt in payload)', async () => {
    const { createPreCadastro } = await import('./precadastros.service');
    await createPreCadastro({ name: 'Ana', email: 'a@a.com', type: 'individual', message: 'Olá' });
    const payload = mockInsert.mock.calls[0][0][0] as any;
    expect(payload.name).toBe('Ana');
    expect(payload.email).toBe('a@a.com');
    expect(payload.status).toBe('novo');
    // camelCase fields must NOT be present
    expect(payload.createdAt).toBeUndefined();
    expect(payload.registrationType).toBeNull();
  });

  it('preserves registrationType when provided', async () => {
    const { createPreCadastro } = await import('./precadastros.service');
    await createPreCadastro({ name: 'Ana', email: 'a@a.com', registrationType: 'parceiro' });
    const payload = mockInsert.mock.calls[0][0][0] as any;
    expect(payload.registrationType).toBe('parceiro');
  });

  it('returns null and shows error toast when Supabase fails', async () => {
    mockInsertSingle.mockResolvedValue({ data: null, error: { message: 'DB constraint violation' } });
    const { createPreCadastro } = await import('./precadastros.service');
    const { showToast } = await import('../store/app.store');
    const result = await createPreCadastro({ name: 'Ana', email: 'a@a.com' });
    expect(result).toBeNull();
    expect(showToast).toHaveBeenCalledWith(expect.any(String), 'error');
  });

  it('returns { success: true } on success', async () => {
    const { createPreCadastro } = await import('./precadastros.service');
    const result = await createPreCadastro({ name: 'Ana', email: 'a@a.com' });
    expect(result).toEqual({ success: true });
  });

  it('uses the real database id in PRECADASTROS when submitting while logged in', async () => {
    const { PRECADASTROS } = await import('../store/app.store');
    PRECADASTROS.length = 0;
    const { createPreCadastro } = await import('./precadastros.service');
    await createPreCadastro({ name: 'Ana', email: 'a@a.com', message: 'Olá' });
    expect(PRECADASTROS[0]?.id).toBe('pc-new');
    expect(PRECADASTROS[0]?.createdAt).toBe('2026-04-26T00:00:00Z');
  });

  it('uses plain insert without select for anonymous/public submission', async () => {
    const { isEditor, PRECADASTROS } = await import('../store/app.store');
    PRECADASTROS.length = 0;
    vi.mocked(isEditor).mockReturnValueOnce(false);
    const { createPreCadastro } = await import('./precadastros.service');
    const result = await createPreCadastro({ name: 'Ana', email: 'a@a.com' });
    expect(result).toEqual({ success: true });
    expect(mockInsert).toHaveBeenCalled();
    expect(mockInsertSelect).not.toHaveBeenCalled();
    expect(PRECADASTROS).toHaveLength(0);
  });
});

// ============================================================
// INTEGRATION — updatePreCadastro
// ============================================================
describe('updatePreCadastro (integration)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockUpdateEqSelect.mockResolvedValue({ data: [{ id: 'pc-1' }], error: null });
    mockOrder.mockResolvedValue({
      data: [{ id: 'pc-1', name: 'João', email: 'j@e.com', type: 'pessoa', status: 'novo', created_at: '2026-03-30T10:00:00Z', updated_at: '2026-03-30T10:00:00Z' }],
      error: null,
    });
    await seedStore();
  });

  it('strips camelCase and non-DB fields from payload', async () => {
    const { updatePreCadastro } = await import('./precadastros.service');
    await updatePreCadastro('pc-1', { status: 'contatado', createdAt: '2026-01-01' } as any);
    const payload = mockUpdate.mock.calls[0][0] as any;
    expect(payload.status).toBe('contatado');
    // createdAt is not in PRECADASTRO_DB_COLUMNS — must be excluded
    expect(payload.createdAt).toBeUndefined();
  });

  it('updates PRECADASTROS store in memory after success', async () => {
    const { updatePreCadastro } = await import('./precadastros.service');
    const { PRECADASTROS } = await import('../store/app.store');
    await updatePreCadastro('pc-1', { status: 'contatado', notes: 'Ligado hoje' });
    expect(PRECADASTROS[0].status).toBe('contatado');
    expect(PRECADASTROS[0].notes).toBe('Ligado hoje');
  });

  it('does NOT update store when Supabase returns error', async () => {
    mockUpdateEqSelect.mockResolvedValue({ data: null, error: { message: 'RLS violation' } });
    const { updatePreCadastro } = await import('./precadastros.service');
    const { PRECADASTROS } = await import('../store/app.store');
    const ok = await updatePreCadastro('pc-1', { status: 'aprovado' });
    expect(ok).toBe(false);
    expect(PRECADASTROS[0].status).toBe('novo');
  });

  it('returns early without calling Supabase when not editor', async () => {
    const { isEditor } = await import('../store/app.store');
    vi.mocked(isEditor).mockReturnValueOnce(false);
    const { updatePreCadastro } = await import('./precadastros.service');
    const ok = await updatePreCadastro('pc-1', { status: 'aprovado' });
    expect(ok).toBe(false);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('rejects invalid email patch before calling Supabase', async () => {
    const { updatePreCadastro } = await import('./precadastros.service');
    const ok = await updatePreCadastro('pc-1', { email: 'not-an-email' } as any);
    expect(ok).toBe(false);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('rejects invalid status patch before calling Supabase', async () => {
    const { updatePreCadastro } = await import('./precadastros.service');
    const ok = await updatePreCadastro('pc-1', { status: 'qualquer-coisa' } as any);
    expect(ok).toBe(false);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('all 6 valid status values are accepted', async () => {
    const { updatePreCadastro } = await import('./precadastros.service');
    const statuses: Array<import('../types').PreCadastro['status']> = [
      'novo', 'contatado', 'aprovado', 'pausado', 'rejeitado', 'convertido',
    ];
    for (const status of statuses) {
      vi.clearAllMocks();
      mockUpdateEqSelect.mockResolvedValue({ data: [{ id: 'pc-1' }], error: null });
      const ok = await updatePreCadastro('pc-1', { status });
      expect(ok).toBe(true);
      expect(mockUpdate).toHaveBeenCalled();
    }
  });

  it('shows actionable migration error when newsletter pause hits legacy DB constraint', async () => {
    mockUpdateEqSelect.mockResolvedValueOnce({
      data: null,
      error: {
        code: '23514',
        message: 'new row for relation "precadastros" violates check constraint "precadastros_status_check"',
      },
    });
    const { showToast } = await import('../store/app.store');
    const { updatePreCadastro } = await import('./precadastros.service');
    const ok = await updatePreCadastro('pc-1', { status: 'pausado' });
    expect(ok).toBe(false);
    expect(showToast).toHaveBeenCalledWith(
      'A pausa da newsletter depende da migration 20260425_precadastros_status_pausado.sql no banco.',
      'error',
    );
  });
});

// ============================================================
// INTEGRATION — deletePreCadastro
// ============================================================
describe('deletePreCadastro (integration)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockDeleteEqSelect.mockResolvedValue({ data: [{ id: 'pc-1' }], error: null });
    mockOrder.mockResolvedValue({
      data: [{ id: 'pc-1', name: 'João', email: 'j@e.com', type: 'pessoa', status: 'novo', created_at: '2026-03-30T10:00:00Z', updated_at: '2026-03-30T10:00:00Z' }],
      error: null,
    });
    await seedStore();
  });

  it('removes entry from PRECADASTROS store after success', async () => {
    const { deletePreCadastro } = await import('./precadastros.service');
    const { PRECADASTROS } = await import('../store/app.store');
    expect(PRECADASTROS).toHaveLength(1);
    await deletePreCadastro('pc-1');
    expect(PRECADASTROS).toHaveLength(0);
  });

  it('calls Supabase delete with correct id', async () => {
    const { deletePreCadastro } = await import('./precadastros.service');
    await deletePreCadastro('pc-1');
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', 'pc-1');
  });

  it('does NOT remove from store when Supabase returns error', async () => {
    mockDeleteEqSelect.mockResolvedValue({ data: null, error: { message: 'FK violation' } });
    const { deletePreCadastro } = await import('./precadastros.service');
    const { PRECADASTROS } = await import('../store/app.store');
    const ok = await deletePreCadastro('pc-1');
    expect(ok).toBe(false);
    expect(PRECADASTROS).toHaveLength(1);
  });

  it('returns early without calling Supabase when not editor', async () => {
    const { isEditor } = await import('../store/app.store');
    vi.mocked(isEditor).mockReturnValueOnce(false);
    const { deletePreCadastro } = await import('./precadastros.service');
    const ok = await deletePreCadastro('pc-1');
    expect(ok).toBe(false);
    expect(mockDelete).not.toHaveBeenCalled();
  });
});

// ============================================================
// INTEGRATION — convertPreCadastroToMember (orchestration)
// ============================================================
describe('convertPreCadastroToMember (integration)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockUpdateEqSelect.mockResolvedValue({ data: [{ id: 'pc-1' }], error: null });
    mockCreateMember.mockResolvedValue({ id: 'new-member-1', name: '' });
    mockUpdateMember.mockResolvedValue(true);
    mockOrder.mockResolvedValue({
      data: [{ id: 'pc-1', name: 'João Silva', email: 'j@e.com', type: 'individual', registrationType: 'parceiro', message: 'Quero participar', status: 'aprovado', created_at: '2026-03-30T10:00:00Z', updated_at: '2026-03-30T10:00:00Z' }],
      error: null,
    });
    await seedStore();
  });

  it('returns true when conversion succeeds', async () => {
    const { convertPreCadastroToMember } = await import('./precadastros.service');
    const result = await convertPreCadastroToMember('pc-1');
    expect(result).toBe(true);
  });

  it('calls createMember to create a blank member entry', async () => {
    const { convertPreCadastroToMember } = await import('./precadastros.service');
    await convertPreCadastroToMember('pc-1');
    expect(mockCreateMember).toHaveBeenCalled();
  });

  it('calls updateMember with name, category and bio from precadastro', async () => {
    const { convertPreCadastroToMember } = await import('./precadastros.service');
    await convertPreCadastroToMember('pc-1');
    const [memberId, patch] = mockUpdateMember.mock.calls[0] as any;
    expect(memberId).toBe('new-member-1');
    expect(patch.name).toBe('João Silva');
    // registrationType: 'parceiro' → category 'Parceiro Silver'
    expect(patch.category).toBe('Parceiro Silver');
    expect(patch.bio).toBe('Quero participar');
  });

  it('sets precadastro status to convertido after successful conversion', async () => {
    const { convertPreCadastroToMember } = await import('./precadastros.service');
    await convertPreCadastroToMember('pc-1');
    const statusUpdate = mockUpdate.mock.calls.find((c: any) => c[0]?.status === 'convertido') as any;
    expect(statusUpdate).toBeDefined();
  });

  it('returns null early when not editor — no createMember called', async () => {
    const { isEditor } = await import('../store/app.store');
    vi.mocked(isEditor).mockReturnValueOnce(false);
    const { convertPreCadastroToMember } = await import('./precadastros.service');
    const result = await convertPreCadastroToMember('pc-1');
    expect(result).toBe(false);
    expect(mockCreateMember).not.toHaveBeenCalled();
  });

  it('does nothing when precadastro id not found in store', async () => {
    const { convertPreCadastroToMember } = await import('./precadastros.service');
    const result = await convertPreCadastroToMember('pc-nonexistent');
    expect(result).toBe(false);
    expect(mockCreateMember).not.toHaveBeenCalled();
  });

  it('returns false when createMember fails', async () => {
    mockCreateMember.mockResolvedValueOnce(null);
    const { convertPreCadastroToMember } = await import('./precadastros.service');
    const result = await convertPreCadastroToMember('pc-1');
    expect(result).toBe(false);
  });

  it('returns false when updateMember fails', async () => {
    mockUpdateMember.mockResolvedValueOnce(false);
    const { convertPreCadastroToMember } = await import('./precadastros.service');
    const result = await convertPreCadastroToMember('pc-1');
    expect(result).toBe(false);
  });
});

// ============================================================
// INTEGRATION — subscribeToNewsletter
// ============================================================
describe('subscribeToNewsletter (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsertSingle.mockResolvedValue({
      data: {
        id: 'pc-news',
        name: 'Newsletter',
        email: 'news@e.com',
        type: 'newsletter',
        registrationType: null,
        message: 'Inscrição via Site',
        status: 'novo',
        created_at: '2026-04-26T00:00:00Z',
        updated_at: '2026-04-26T00:00:00Z',
      },
      error: null,
    });
  });

  it('inserts with type newsletter and correct email', async () => {
    const { subscribeToNewsletter } = await import('./precadastros.service');
    await subscribeToNewsletter('news@e.com');
    const payload = mockInsert.mock.calls[0][0][0] as any;
    expect(payload.type).toBe('newsletter');
    expect(payload.email).toBe('news@e.com');
    expect(payload.name).toBe('Newsletter');
  });
});

// ============================================================================
// BUG 2 (HIGH) — RLS silent-filter false positive
// PostgREST returns { error: null, data: [] } when RLS USING denies UPDATE/DELETE.
// updatePreCadastro must NOT mutate store nor show success toast in that case.
// ============================================================================
describe('updatePreCadastro silent-filter false positive (BUG 2)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    await seedStore();
  });

  it('returns false and does NOT show success toast when RLS silently filters (0 rows affected)', async () => {
    // Simulate RLS denial: error null but no rows affected
    mockUpdateEqSelect.mockResolvedValueOnce({ data: [], error: null });

    const store = await import('../store/app.store');
    const { updatePreCadastro } = await import('./precadastros.service');

    const result = await updatePreCadastro('pc-1', { status: 'aprovado' });

    expect(result).toBe(false);
    expect(store.showToast).not.toHaveBeenCalledWith('Atualizado.', 'success');
  });

  it('does NOT mutate store when RLS silently filters', async () => {
    mockUpdateEqSelect.mockResolvedValueOnce({ data: [], error: null });

    const { PRECADASTROS } = await import('../store/app.store');
    const before = PRECADASTROS.find(p => p.id === 'pc-1')?.status;

    const { updatePreCadastro } = await import('./precadastros.service');
    await updatePreCadastro('pc-1', { status: 'aprovado' });

    const after = PRECADASTROS.find(p => p.id === 'pc-1')?.status;
    expect(after).toBe(before);
  });
});

// ============================================================================
// DELETE silent-filter (HIGH) — RLS USING denial returns { error: null, data: [] }.
// deletePreCadastro must NOT remove from store nor show success toast.
// ============================================================================
describe('deletePreCadastro silent-filter false positive', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    await seedStore();
  });

  it('returns false and keeps row in store when RLS silently filters DELETE', async () => {
    mockDeleteEqSelect.mockResolvedValueOnce({ data: [], error: null });

    const { PRECADASTROS } = await import('../store/app.store');
    const { deletePreCadastro } = await import('./precadastros.service');

    const before = PRECADASTROS.length;
    const result = await deletePreCadastro('pc-1');

    expect(result).toBe(false);
    expect(PRECADASTROS).toHaveLength(before);
  });
});

// ============================================================================
// BUG 3 (HIGH) — convertPreCadastroToMember not idempotent
// If updatePreCadastro fails AFTER createMember+updateMember succeed,
// retry must NOT create a second partner row.
// ============================================================================
describe('convertPreCadastroToMember idempotency (BUG 3)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    await seedStore();
  });

  it('does NOT create a duplicate member when retried after updatePreCadastro fails', async () => {
    // First attempt: createMember OK, updateMember OK, but updatePreCadastro fails
    mockUpdateEqSelect.mockResolvedValueOnce({ data: null, error: { message: 'Network error' } });

    const { convertPreCadastroToMember } = await import('./precadastros.service');
    const firstResult = await convertPreCadastroToMember('pc-1');
    expect(firstResult).toBe(false);
    expect(mockCreateMember).toHaveBeenCalledTimes(1);

    // Retry: createMember should NOT be called again — must reuse the cached
    // memberId from the failed conversion to prevent duplicate partner rows.
    mockUpdateEqSelect.mockResolvedValueOnce({ data: [{ id: 'pc-1' }], error: null });
    const secondResult = await convertPreCadastroToMember('pc-1');

    // Either it should succeed using the previously-created member,
    // OR refuse cleanly without creating a second partner.
    expect(mockCreateMember).toHaveBeenCalledTimes(1);
  });
});
