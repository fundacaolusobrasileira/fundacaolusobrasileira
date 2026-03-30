import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockInsert = vi.fn<any>();
const mockUpdate = vi.fn<any>(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
const mockDelete = vi.fn<any>(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
const mockSelect = vi.fn<any>().mockReturnValue({
  order: vi.fn().mockResolvedValue({
    data: [{ id: 'pc-1', name: 'João', email: 'j@e.com', type: 'pessoa', status: 'novo', created_at: '2026-03-30T10:00:00Z' }],
    error: null,
  }),
});

vi.mock('../supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
      insert: mockInsert.mockReturnValue({ error: null }),
      update: mockUpdate,
      delete: mockDelete,
    })),
  },
}));

vi.mock('../store/app.store', async () => {
  const actual = await vi.importActual('../store/app.store');
  return {
    ...actual as any,
    isEditor: vi.fn(() => true),
  };
});

describe('precadastros.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockReturnValue({ error: null });
  });

  describe('syncPreCadastros', () => {
    it('maps created_at to createdAt after sync', async () => {
      const { syncPreCadastros } = await import('./precadastros.service');
      const { PRECADASTROS } = await import('../store/app.store');

      await syncPreCadastros();

      expect(PRECADASTROS.length).toBeGreaterThan(0);
      expect(PRECADASTROS[0].createdAt).toBe('2026-03-30T10:00:00Z');
      expect((PRECADASTROS[0] as any).created_at).toBeUndefined();
    });
  });

  describe('createPreCadastro', () => {
    it('persists to Supabase with correct fields', async () => {
      const { createPreCadastro } = await import('./precadastros.service');

      await createPreCadastro({ name: 'Test', email: 'test@e.com', type: 'individual', message: 'Hi' });

      expect(mockInsert).toHaveBeenCalled();
      const payload = mockInsert.mock.calls[0][0][0];
      expect(payload.name).toBe('Test');
      expect(payload.email).toBe('test@e.com');
      expect(payload.status).toBe('novo');
    });
  });

  describe('subscribeToNewsletter', () => {
    it('calls createPreCadastro with type newsletter', async () => {
      const { subscribeToNewsletter } = await import('./precadastros.service');

      await subscribeToNewsletter('news@e.com');

      expect(mockInsert).toHaveBeenCalled();
      const payload = mockInsert.mock.calls[0][0][0];
      expect(payload.type).toBe('newsletter');
      expect(payload.email).toBe('news@e.com');
    });
  });
});
