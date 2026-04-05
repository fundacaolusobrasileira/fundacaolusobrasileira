import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Supabase mock ──────────────────────────────────────────────────────────
const mockEq = vi.fn().mockResolvedValue({ error: null });
const mockDeleteEq = vi.fn().mockResolvedValue({ error: null });
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
    await updateMember(UUID, { name: 'Updated Name' });
    const p = PARTNERS.find(x => x.id === UUID);
    expect(p?.name).toBe('Updated Name');
  });

  it('shows error toast when supabase update fails', async () => {
    mockEq.mockResolvedValueOnce({ error: new Error('Update failed') });
    const { updateMember } = await import('./members.service');
    await updateMember(UUID, { name: 'Fail' });
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
    mockDeleteEq.mockResolvedValue({ error: null });
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
    mockDeleteEq.mockResolvedValueOnce({ error: new Error('Delete failed') });
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
});
