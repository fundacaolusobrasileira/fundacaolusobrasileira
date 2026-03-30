import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase before importing App
// Chains: from().select().order() → { data, error }
//         from().insert().select() → { data, error }
//         from().select().eq().single() → { data, error }
const resolved = (data: any = [], error: any = null) =>
  Promise.resolve({ data, error });

const makeBuilder = (overrides: any = {}): any => {
  const builder: any = {
    select: vi.fn(() => makeBuilder(overrides)),
    insert: vi.fn(() => makeBuilder(overrides)),
    update: vi.fn(() => makeBuilder(overrides)),
    delete: vi.fn(() => makeBuilder(overrides)),
    order: vi.fn(() => resolved(overrides.data ?? [], overrides.error ?? null)),
    eq: vi.fn(() => makeBuilder(overrides)),
    single: vi.fn(() => resolved(overrides.data ?? null, overrides.error ?? null)),
    then: undefined as any,
  };
  // Make the builder itself thenable so `await builder` works
  builder.then = (resolve: any, reject: any) =>
    resolved(overrides.data ?? [], overrides.error ?? null).then(resolve, reject);
  return builder;
};

const mockFrom = vi.fn(() => makeBuilder());

vi.mock('./supabaseClient', () => ({
  supabase: {
    get from() { return mockFrom; },
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    storage: { from: vi.fn() },
  },
}));

vi.mock('./services/members.service', () => ({ syncMembers: vi.fn() }));
vi.mock('./services/events.service', () => ({ syncEvents: vi.fn() }));
vi.mock('./data/members.data', () => ({ MEMBERS_SEED: [] }));

describe('createMember', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null and shows error toast when Supabase insert fails', async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: { message: 'RLS violation' } }));

    const { setAuthSession } = await import('./store/app.store');
    setAuthSession({ isLoggedIn: true, role: 'editor' });

    const toastEvents: any[] = [];
    window.addEventListener('flb_toast_event', (e: any) => toastEvents.push(e.detail), { once: true });

    const { createMember } = await import('./App');
    const result = await createMember(false);

    expect(result).toBeNull();
    expect(toastEvents.some((t: any) => t.type === 'error')).toBe(true);
  });

  it('returns the new member when Supabase insert succeeds', async () => {
    const fakeRow = { id: 'p-1', name: 'Novo Membro', type: 'pessoa', category: 'Parceiro Silver', active: true, social_links: {} };
    mockFrom.mockReturnValue(makeBuilder({ data: [fakeRow], error: null }));

    const { setAuthSession } = await import('./store/app.store');
    setAuthSession({ isLoggedIn: true, role: 'editor' });

    const { createMember } = await import('./App');
    const result = await createMember(false);

    expect(result).not.toBeNull();
    expect(result?.id).toBe('p-1');
  });

  it('returns null without calling Supabase when user is not editor', async () => {
    const { setAuthSession } = await import('./store/app.store');
    setAuthSession({ isLoggedIn: false, role: 'viewer' });

    const { createMember } = await import('./App');
    const result = await createMember(false);

    expect(result).toBeNull();
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
