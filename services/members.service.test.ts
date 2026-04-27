import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Supabase mock ──────────────────────────────────────────────────────────
// Update + Delete chains now use .select() to detect RLS silent-filter.
const mockUpdateEqSelect = vi.fn<any>().mockResolvedValue({ data: [{ id: 'mock-partner' }], error: null });
const mockEq = vi.fn<any>(() => ({ select: mockUpdateEqSelect }));
const mockDeleteEqSelect = vi.fn<any>().mockResolvedValue({ data: [{ id: 'mock-partner' }], error: null });
const mockDeleteEq = vi.fn<any>(() => ({ select: mockDeleteEqSelect }));
const mockUpdateChain = vi.fn<any>(() => ({ eq: mockEq }));
const mockSingle = vi.fn();
const mockInsertSelectSingle = vi.fn(() => ({ single: mockSingle }));
const mockInsertSelect = vi.fn(() => ({ select: vi.fn().mockResolvedValue({ data: [{ id: 'new-uuid', name: 'Novo Membro', type: 'pessoa', category: 'Parceiro Silver', active: true }], error: null }) }));
const mockInsert = vi.fn(() => mockInsertSelect());
const mockOrder = vi.fn();
const mockSelectChain = vi.fn(() => ({ order: mockOrder }));
const mockFrom = vi.fn(() => ({
  select: mockSelectChain,
  insert: mockInsert,
  update: mockUpdateChain,
  delete: vi.fn(() => ({ eq: mockDeleteEq })),
}));
vi.mock('../supabaseClient', () => ({ supabase: { from: mockFrom } }));

// ─── Store mock ─────────────────────────────────────────────────────────────
const mockShowToast = vi.fn();
const mockNotifyState = vi.fn();
const mockLogActivity = vi.fn();
const PARTNERS: any[] = [];
vi.mock('../store/app.store', () => ({
  isEditor: vi.fn(() => true),
  showToast: mockShowToast,
  notifyState: mockNotifyState,
  logActivity: mockLogActivity,
  PARTNERS,
}));

// ─── Helpers ────────────────────────────────────────────────────────────────
const UUID = '00000000-0000-0000-0000-000000000001';

// Safety net: even if a test throws before its beforeEach runs, the next
// describe block sees a clean PARTNERS array. Prevents cross-test bleed.
afterEach(() => {
  PARTNERS.length = 0;
});

// ============================================================================
// CREATE
// ============================================================================
describe('createMember', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    PARTNERS.length = 0;
    mockInsert.mockImplementation(() => ({
      select: vi.fn().mockResolvedValue({
        data: [{ id: UUID, name: 'Novo Membro', type: 'pessoa', category: 'Parceiro Silver', active: true }],
        error: null,
      }),
    }));
  });

  it('inserts a new member into the database', async () => {
    const { createMember } = await import('./members.service');
    await createMember();
    expect(mockInsert).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'Novo Membro', type: 'pessoa', active: true }),
    ]);
  });

  it('adds the new member to the PARTNERS store', async () => {
    const { createMember } = await import('./members.service');
    await createMember();
    expect(PARTNERS).toHaveLength(1);
    expect(PARTNERS[0].id).toBe(UUID);
  });

  it('shows success toast when notify=true', async () => {
    const { createMember } = await import('./members.service');
    await createMember(true);
    expect(mockShowToast).toHaveBeenCalledWith('Membro criado.', 'success');
  });

  it('does NOT show toast when notify=false', async () => {
    const { createMember } = await import('./members.service');
    await createMember(false);
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('returns null when not editor', async () => {
    const store = await import('../store/app.store');
    (store.isEditor as any).mockReturnValueOnce(false);
    const { createMember } = await import('./members.service');
    const result = await createMember();
    expect(result).toBeNull();
  });

  it('returns null when supabase returns error', async () => {
    mockInsert.mockImplementationOnce(() => ({
      select: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
    }));
    const { createMember } = await import('./members.service');
    const result = await createMember();
    expect(result).toBeNull();
  });
});

// ============================================================================
// READ (syncMembers)
// ============================================================================
describe('syncMembers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    PARTNERS.length = 0;
  });

  it('populates PARTNERS store from database rows', async () => {
    mockOrder.mockResolvedValue({
      data: [
        { id: UUID, name: 'Ana Costa', type: 'pessoa', category: 'Governança', social_links: {} },
      ],
      error: null,
    });
    const { syncMembers } = await import('./members.service');
    await syncMembers();
    expect(PARTNERS.some(p => p.name === 'Ana Costa')).toBe(true);
  });

  it('maps social_links → socialLinks on each partner', async () => {
    mockOrder.mockResolvedValue({
      data: [{ id: UUID, name: 'Test', type: 'pessoa', category: 'Governança', social_links: { linkedin: 'li.com' } }],
      error: null,
    });
    const { syncMembers } = await import('./members.service');
    await syncMembers();
    const p = PARTNERS.find(x => x.name === 'Test');
    expect(p?.socialLinks).toEqual({ linkedin: 'li.com' });
    expect((p as any)?.social_links).toBeUndefined();
  });

  it('calls notifyState after sync', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });
    const { syncMembers } = await import('./members.service');
    await syncMembers();
    expect(mockNotifyState).toHaveBeenCalled();
  });

  it('falls back to seed data when supabase returns error', async () => {
    mockOrder.mockResolvedValue({ data: null, error: new Error('Network error') });
    const { syncMembers } = await import('./members.service');
    await syncMembers();
    // Seed data has members — store should not be empty
    expect(PARTNERS.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// UPDATE
// ============================================================================
describe('updateMember — field completeness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    PARTNERS.length = 0;
    PARTNERS.push({ id: UUID, name: 'Existing', type: 'pessoa', category: 'Governança' });
  });

  it('sends summary to the database', async () => {
    const { updateMember } = await import('./members.service');
    await updateMember(UUID, { summary: 'Short bio text' });
    const payload: any = (mockUpdateChain.mock.calls as any)[0][0];
    expect(payload).toHaveProperty('summary', 'Short bio text');
  });

  it('sends full to the database', async () => {
    const { updateMember } = await import('./members.service');
    await updateMember(UUID, { full: 'Long biography content' });
    const payload: any = (mockUpdateChain.mock.calls as any)[0][0];
    expect(payload).toHaveProperty('full', 'Long biography content');
  });

  it('sends country to the database', async () => {
    const { updateMember } = await import('./members.service');
    await updateMember(UUID, { country: 'Portugal' });
    const payload: any = (mockUpdateChain.mock.calls as any)[0][0];
    expect(payload).toHaveProperty('country', 'Portugal');
  });

  it('sends active to the database', async () => {
    const { updateMember } = await import('./members.service');
    await updateMember(UUID, { active: false });
    const payload: any = (mockUpdateChain.mock.calls as any)[0][0];
    expect(payload).toHaveProperty('active', false);
  });

  it('sends featured to the database', async () => {
    const { updateMember } = await import('./members.service');
    await updateMember(UUID, { featured: true });
    const payload: any = (mockUpdateChain.mock.calls as any)[0][0];
    expect(payload).toHaveProperty('featured', true);
  });

  it('sends order to the database', async () => {
    const { updateMember } = await import('./members.service');
    await updateMember(UUID, { order: 3 });
    const payload: any = (mockUpdateChain.mock.calls as any)[0][0];
    expect(payload).toHaveProperty('order', 3);
  });

  it('sends bio to the database', async () => {
    const { updateMember } = await import('./members.service');
    await updateMember(UUID, { bio: 'Biography text' });
    const payload: any = (mockUpdateChain.mock.calls as any)[0][0];
    expect(payload).toHaveProperty('bio', 'Biography text');
  });

  it('converts socialLinks → social_links', async () => {
    const { updateMember } = await import('./members.service');
    await updateMember(UUID, { socialLinks: { linkedin: 'li.com' } });
    const payload: any = (mockUpdateChain.mock.calls as any)[0][0];
    expect(payload.social_links).toEqual({ linkedin: 'li.com' });
    expect(payload.socialLinks).toBeUndefined();
  });

  it('does not send unknown fields to the database', async () => {
    const { updateMember } = await import('./members.service');
    await updateMember(UUID, { name: 'Valid', id: 'should-not-appear' } as any);
    const payload: any = (mockUpdateChain.mock.calls as any)[0][0];
    expect(payload.name).toBe('Valid');
    expect(payload.id).toBeUndefined();
  });

  it('updates PARTNERS store on success', async () => {
    const { updateMember } = await import('./members.service');
    const ok = await updateMember(UUID, { name: 'Updated Name' });
    expect(ok).toBe(true);
    const p = PARTNERS.find(x => x.id === UUID);
    expect(p?.name).toBe('Updated Name');
  });

  it('shows error toast when supabase update fails', async () => {
    mockUpdateEqSelect.mockResolvedValueOnce({ data: null, error: new Error('Update failed') });
    const { updateMember } = await import('./members.service');
    const ok = await updateMember(UUID, { name: 'Fail' });
    expect(ok).toBe(false);
    expect(mockShowToast).toHaveBeenCalledWith('Erro ao atualizar membro.', 'error');
  });

  it('does nothing when not editor', async () => {
    const store = await import('../store/app.store');
    (store.isEditor as any).mockReturnValueOnce(false);
    const { updateMember } = await import('./members.service');
    await updateMember(UUID, { name: 'Should not save' });
    expect(mockUpdateChain).not.toHaveBeenCalled();
  });

  it('sends all fields together without dropping any', async () => {
    const { updateMember } = await import('./members.service');
    await updateMember(UUID, {
      name: 'João Silva', role: 'Presidente', bio: 'Bio curta',
      summary: 'Resumo', full: 'Biografia completa', country: 'Brasil',
      active: true, featured: false, order: 1,
    });
    const payload: any = (mockUpdateChain.mock.calls as any)[0][0];
    expect(payload.name).toBe('João Silva');
    expect(payload.bio).toBe('Bio curta');
    expect(payload.summary).toBe('Resumo');
    expect(payload.full).toBe('Biografia completa');
    expect(payload.country).toBe('Brasil');
    expect(payload.active).toBe(true);
    expect(payload.featured).toBe(false);
    expect(payload.order).toBe(1);
  });
});

// ============================================================================
// DELETE
// ============================================================================
describe('deleteMember', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    PARTNERS.length = 0;
    PARTNERS.push({ id: UUID, name: 'To Delete', type: 'pessoa', category: 'Governança' });
    mockDeleteEqSelect.mockResolvedValue({ data: [{ id: UUID }], error: null });
  });

  it('removes the member from the database', async () => {
    const { deleteMember } = await import('./members.service');
    await deleteMember(UUID);
    expect(mockDeleteEq).toHaveBeenCalledWith('id', UUID);
  });

  it('removes the member from the PARTNERS store', async () => {
    const { deleteMember } = await import('./members.service');
    await deleteMember(UUID);
    expect(PARTNERS.find(p => p.id === UUID)).toBeUndefined();
  });

  it('shows success toast after deletion', async () => {
    const { deleteMember } = await import('./members.service');
    await deleteMember(UUID);
    expect(mockShowToast).toHaveBeenCalledWith('Membro removido.', 'success');
  });

  it('does NOT remove from store when supabase returns error', async () => {
    mockDeleteEqSelect.mockResolvedValueOnce({ data: null, error: new Error('Delete failed') });
    const { deleteMember } = await import('./members.service');
    await deleteMember(UUID);
    expect(PARTNERS).toHaveLength(1);
  });

  it('does nothing when not editor', async () => {
    const store = await import('../store/app.store');
    (store.isEditor as any).mockReturnValueOnce(false);
    const { deleteMember } = await import('./members.service');
    await deleteMember(UUID);
    expect(mockDeleteEq).not.toHaveBeenCalled();
    expect(PARTNERS).toHaveLength(1);
  });

  it('blocks deletion for non-UUID seed ids', async () => {
    PARTNERS[0] = { id: 'membro-seed', name: 'Seed Member', type: 'pessoa', category: 'Governança' } as any;
    const { deleteMember } = await import('./members.service');
    const ok = await deleteMember('membro-seed');
    expect(ok).toBe(false);
    expect(mockDeleteEq).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(
      'Este membro ainda é do seed inicial. Salve-o primeiro para gerar um registo editável.',
      'warning',
    );
  });
});

// ============================================================================
// UNIT — normalize (via syncMembers side-effect)
// ============================================================================
describe('normalize (unit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    PARTNERS.length = 0;
  });

  it('maps social_links snake_case to socialLinks camelCase', async () => {
    mockOrder.mockResolvedValue({
      data: [{ id: UUID, name: 'João', type: 'pessoa', social_links: { linkedin: 'li.com' } }],
      error: null,
    });
    const { syncMembers } = await import('./members.service');
    await syncMembers();
    const partner = PARTNERS.find(p => p.id === UUID);
    expect(partner?.socialLinks).toEqual({ linkedin: 'li.com' });
    expect((partner as any)?.social_links).toBeUndefined();
  });

  it('defaults gallery to [] when null', async () => {
    mockOrder.mockResolvedValue({
      data: [{ id: UUID, name: 'João', type: 'pessoa', gallery: null }],
      error: null,
    });
    const { syncMembers } = await import('./members.service');
    await syncMembers();
    const partner = PARTNERS.find(p => p.id === UUID);
    expect(partner?.gallery).toEqual([]);
  });

  it('defaults albums to [] when null', async () => {
    mockOrder.mockResolvedValue({
      data: [{ id: UUID, name: 'João', type: 'pessoa', albums: null }],
      error: null,
    });
    const { syncMembers } = await import('./members.service');
    await syncMembers();
    const partner = PARTNERS.find(p => p.id === UUID);
    expect(partner?.albums).toEqual([]);
  });

  it('defaults type to pessoa when null', async () => {
    mockOrder.mockResolvedValue({
      data: [{ id: UUID, name: 'João', type: null }],
      error: null,
    });
    const { syncMembers } = await import('./members.service');
    await syncMembers();
    const partner = PARTNERS.find(p => p.id === UUID);
    expect(partner?.type).toBe('pessoa');
  });
});

// ============================================================================
// INTEGRATION — syncMembers seed merge (BUG 0 scenario)
// ============================================================================
describe('syncMembers — seed merge (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    PARTNERS.length = 0;
  });

  it('merges seed member with DB record when names match — DB UUID replaces slug id', async () => {
    // The seed members.data.ts has members with slug IDs like 'membro-joao-silva'
    // When DB has same name, the DB UUID should win as the id
    mockOrder.mockResolvedValue({
      data: [
        // This DB record matches a seed member by name
        { id: UUID, name: 'João', type: 'pessoa', social_links: {}, gallery: [] },
        // This DB record is NOT in seed — appears as extra
        { id: '00000000-0000-0000-0000-000000000002', name: 'DB Only Partner', type: 'empresa', social_links: {}, gallery: [] },
      ],
      error: null,
    });
    const { syncMembers } = await import('./members.service');
    await syncMembers();
    // DB-only partner should also be in store
    expect(PARTNERS.some(p => p.name === 'DB Only Partner')).toBe(true);
  });

  it('extra DB partners (not in seed) are appended to store', async () => {
    mockOrder.mockResolvedValue({
      data: [
        { id: '99999999-9999-9999-9999-999999999999', name: 'Parceiro Novo', type: 'empresa', social_links: {} },
      ],
      error: null,
    });
    const { syncMembers } = await import('./members.service');
    await syncMembers();
    expect(PARTNERS.some(p => p.name === 'Parceiro Novo')).toBe(true);
  });

  it('no duplicate entries on re-sync', async () => {
    mockOrder.mockResolvedValue({
      data: [{ id: UUID, name: 'João', type: 'pessoa', social_links: {} }],
      error: null,
    });
    const { syncMembers } = await import('./members.service');
    await syncMembers();
    const countBefore = PARTNERS.length;
    await syncMembers();
    expect(PARTNERS.length).toBe(countBefore);
  });
});

// ============================================================================
// INTEGRATION — updateMember slug ID → INSERT-then-UPDATE (BUG 0)
// ============================================================================
describe('updateMember — slug ID first edit (integration)', () => {
  // Slug IDs are non-UUID strings like 'membro-joao-silva'
  const SLUG_ID = 'membro-joao-silva';
  const NEW_UUID = 'aaaabbbb-0000-0000-0000-000000000001';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    PARTNERS.length = 0;
    // Seed member with slug id is in store
    PARTNERS.push({ id: SLUG_ID, name: 'João Silva', type: 'pessoa', socialLinks: {}, gallery: [], albums: [] } as any);
    // mock insert().select().single() chain for slug path
    mockSingle.mockResolvedValue({ data: { id: NEW_UUID, name: 'João Silva' }, error: null });
    mockInsertSelectSingle.mockReturnValue({ single: mockSingle });
    mockInsert.mockReturnValue({ select: mockInsertSelectSingle });
  });

  it('calls INSERT (not UPDATE) when id is not a UUID', async () => {
    const { updateMember } = await import('./members.service');
    await updateMember(SLUG_ID, { name: 'João Silva', bio: 'Bio nova' });
    expect(mockInsert).toHaveBeenCalled();
    expect(mockUpdateChain).not.toHaveBeenCalled();
  });

  it('replaces slug id with new UUID in PARTNERS store after first edit', async () => {
    const { updateMember } = await import('./members.service');
    await updateMember(SLUG_ID, { name: 'João Silva', bio: 'Bio nova' });
    const partner = PARTNERS.find(p => p.name === 'João Silva');
    expect(partner?.id).toBe(NEW_UUID);
  });

  it('shows toast on successful first edit', async () => {
    const { updateMember } = await import('./members.service');
    await updateMember(SLUG_ID, { name: 'João Silva' }, true);
    expect(mockShowToast).toHaveBeenCalledWith('Membro salvo.', 'success');
  });

  it('shows error toast and does NOT update store when INSERT fails', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } });
    const { updateMember } = await import('./members.service');
    await updateMember(SLUG_ID, { name: 'João Silva' });
    expect(mockShowToast).toHaveBeenCalledWith('Erro ao salvar membro.', 'error');
    // ID must still be the slug — store not updated
    expect(PARTNERS[0].id).toBe(SLUG_ID);
  });

  it('calls UPDATE (not INSERT) on second edit when id is already a UUID', async () => {
    // Simulate second edit: store already has UUID
    PARTNERS[0] = { ...PARTNERS[0], id: NEW_UUID };
    mockUpdateEqSelect.mockResolvedValue({ data: [{ id: NEW_UUID }], error: null });
    const { updateMember } = await import('./members.service');
    await updateMember(NEW_UUID, { bio: 'Updated bio' });
    expect(mockUpdateChain).toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  // BUG 2 (HIGH) — RLS silent-filter false positive
  // PostgREST returns { error: null, data: [] } when RLS USING denies UPDATE/DELETE.
  // updateMember must NOT mutate store nor show success toast in that case.
  it('returns false and does NOT show success toast when RLS silently filters (BUG 2)', async () => {
    // Store already has the UUID — simulate UPDATE path
    PARTNERS[0] = { ...PARTNERS[0], id: NEW_UUID, name: 'Original Name' };
    mockUpdateEqSelect.mockResolvedValueOnce({ data: [], error: null });

    const { updateMember } = await import('./members.service');
    const result = await updateMember(NEW_UUID, { name: 'Renamed by viewer' });

    expect(result).toBe(false);
    expect(mockShowToast).not.toHaveBeenCalledWith('Membro atualizado.', 'success');
    // Store must remain at original
    expect(PARTNERS[0].name).toBe('Original Name');
  });

  // DELETE silent-filter — same RLS pattern but for DELETE.
  it('deleteMember returns false and keeps row in store when RLS silently filters DELETE', async () => {
    PARTNERS[0] = { ...PARTNERS[0], id: NEW_UUID, name: 'Persistent Member' };
    mockDeleteEqSelect.mockResolvedValueOnce({ data: [], error: null });

    const { deleteMember } = await import('./members.service');
    const result = await deleteMember(NEW_UUID);

    expect(result).toBe(false);
    expect(mockShowToast).not.toHaveBeenCalledWith('Membro removido.', 'success');
    expect(PARTNERS[0].id).toBe(NEW_UUID);
  });
});
