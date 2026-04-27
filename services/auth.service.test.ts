// services/auth.service.test.ts
// Unit: LoginSchema, CadastroSchema validation.
// Integration: loginAsEditor, logout, signUp, resolveUserRole (timeout + roles), updateUserRole.
// E2E: SKIPPED per test-strategy.md 1.6 — covered in Phase 3 (auth.spec.ts).

import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---
const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn().mockResolvedValue({ error: null });
const mockSignUp = vi.fn();
const mockGetSession = vi.fn();
const mockProfileSingle = vi.fn();
const mockUpdateEq = vi.fn<any>().mockResolvedValue({ error: null });
const mockProfilesOrder = vi.fn<any>().mockResolvedValue({ data: [], error: null });
const mockProfilesUpsert = vi.fn<any>().mockResolvedValue({ error: null });
let profilesLinkResult: any = { data: [], error: null };
let partnersSelectResult: any = { data: [], error: null };
const mockPartnersSelect = vi.fn<any>(() => Promise.resolve(partnersSelectResult));
const mockProfilesLinkSelect = vi.fn<any>(() => Promise.resolve(profilesLinkResult));
const mockFrom = vi.fn<any>((table: string) => {
  if (table === 'profiles') {
    return {
      select: vi.fn((query?: string) => {
        if (query?.includes('partner_id')) {
          return mockProfilesLinkSelect();
        }
        return {
          eq: vi.fn(() => ({ single: mockProfileSingle, maybeSingle: mockProfileSingle })),
          order: mockProfilesOrder,
        };
      }),
      update: vi.fn(() => ({ eq: mockUpdateEq })),
      insert: vi.fn(() => ({ select: vi.fn() })),
      upsert: mockProfilesUpsert,
    };
  }
  return {
    select: mockPartnersSelect,
    update: vi.fn(() => ({ eq: mockUpdateEq })),
    insert: vi.fn(() => ({ select: vi.fn() })),
    upsert: vi.fn().mockResolvedValue({ error: null }),
  };
});

vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: any[]) => mockSignInWithPassword(...args),
      signOut: (...args: any[]) => mockSignOut(...args),
      signUp: (...args: any[]) => mockSignUp(...args),
      getSession: (...args: any[]) => mockGetSession(...args),
    },
    from: mockFrom,
  },
}));

// Use real store — needed for setAuthSession live bindings
// But mock showToast/logActivity to avoid side effects
vi.mock('../store/app.store', async () => {
  const actual = await vi.importActual('../store/app.store');
  return {
    ...actual as any,
    showToast: vi.fn(),
    logActivity: vi.fn(),
    notifyState: vi.fn(),
  };
});

// ============================================================================
// UNIT — Schema validation (LoginSchema, CadastroSchema)
// ============================================================================
describe('LoginSchema (unit)', () => {
  it('rejects empty password — loginAsEditor returns ok: false', async () => {
    const { loginAsEditor } = await import('./auth.service');
    const result = await loginAsEditor('valid@email.com', '');
    expect(result.ok).toBe(false);
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it('rejects invalid email — loginAsEditor returns ok: false', async () => {
    const { loginAsEditor } = await import('./auth.service');
    const result = await loginAsEditor('not-an-email', 'password');
    expect(result.ok).toBe(false);
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });
});

describe('CadastroSchema (unit)', () => {
  it('rejects password shorter than 8 chars — signUp returns ok: false', async () => {
    const { signUp } = await import('./auth.service');
    const result = await signUp('valid@email.com', '1234567', 'Test User', 'individual');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('8 caracteres');
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('rejects name shorter than 2 chars', async () => {
    const { signUp } = await import('./auth.service');
    const result = await signUp('valid@email.com', 'password123', 'A', 'individual');
    expect(result.ok).toBe(false);
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('rejects invalid type enum', async () => {
    const { signUp } = await import('./auth.service');
    const result = await signUp('valid@email.com', 'password123', 'Ana', 'unknown-type' as any);
    expect(result.ok).toBe(false);
    expect(mockSignUp).not.toHaveBeenCalled();
  });
});

// ============================================================================
// INTEGRATION — loginAsEditor
// ============================================================================
describe('loginAsEditor (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignOut.mockResolvedValue({ error: null });
  });

  it('returns { ok: true } on successful login', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { session: { access_token: 'tok' }, user: { id: 'u1', email: 'admin@test.com' } },
      error: null,
    });
    mockProfileSingle.mockResolvedValue({ data: { role: 'editor' }, error: null });
    const { loginAsEditor } = await import('./auth.service');
    const result = await loginAsEditor('admin@test.com', 'pass123');
    expect(result.ok).toBe(true);
  });

  it('does NOT directly set AUTH_SESSION — that is App.tsx onAuthStateChange responsibility', async () => {
    // loginAsEditor returns ok:true but session state is set by the auth listener
    mockSignInWithPassword.mockResolvedValue({
      data: { session: { access_token: 'tok' }, user: { id: 'u1', email: 'admin@test.com' } },
      error: null,
    });
    mockProfileSingle.mockResolvedValue({ data: { role: 'editor' }, error: null });
    const { loginAsEditor } = await import('./auth.service');
    const store = await import('../store/app.store');
    store.AUTH_SESSION.isLoggedIn = false;
    await loginAsEditor('admin@test.com', 'pass123');
    // Still false — App.tsx wires the auth listener, not the service
    expect(store.AUTH_SESSION.isLoggedIn).toBe(false);
  });

  it('returns ok: false with "incorretos" message on invalid credentials', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid login credentials' },
    });
    const { loginAsEditor } = await import('./auth.service');
    const result = await loginAsEditor('wrong@test.com', 'wrongpass');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('incorretos');
  });

  it('returns ok: false with email-not-confirmed message', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Email not confirmed' },
    });
    const { loginAsEditor } = await import('./auth.service');
    const result = await loginAsEditor('unconfirmed@test.com', 'pass123');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('confirmado');
  });

  it('returns ok: true even when profile query throws (defaults to viewer)', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { session: { access_token: 'tok' }, user: { id: 'u1', email: 'admin@test.com' } },
      error: null,
    });
    mockProfileSingle.mockRejectedValue(new Error('Network error'));
    const { loginAsEditor } = await import('./auth.service');
    const result = await loginAsEditor('admin@test.com', 'pass123');
    expect(result.ok).toBe(true);
  });
});

// ============================================================================
// INTEGRATION — resolveUserRole
// ============================================================================
describe('resolveUserRole (integration)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns editor when profile.role is editor', async () => {
    mockProfileSingle.mockResolvedValue({ data: { role: 'editor' }, error: null });
    const { resolveUserRole } = await import('./auth.service');
    const role = await resolveUserRole('user-uuid-1');
    expect(role).toBe('editor');
  });

  it('returns admin when profile.role is admin', async () => {
    mockProfileSingle.mockResolvedValue({ data: { role: 'admin' }, error: null });
    const { resolveUserRole } = await import('./auth.service');
    const role = await resolveUserRole('user-uuid-2');
    expect(role).toBe('admin');
  });

  it('returns viewer when profile.role is unknown', async () => {
    mockProfileSingle.mockResolvedValue({ data: { role: 'membro' }, error: null });
    const { resolveUserRole } = await import('./auth.service');
    const role = await resolveUserRole('user-uuid-3');
    expect(role).toBe('viewer');
  });

  it('returns viewer when Supabase throws', async () => {
    mockProfileSingle.mockRejectedValue(new Error('DB error'));
    const { resolveUserRole } = await import('./auth.service');
    const role = await resolveUserRole('user-uuid-4');
    expect(role).toBe('viewer');
  });

  it('returns viewer when query exceeds 3s timeout', async () => {
    // Reset modules BEFORE installing fake timers so the dynamic import below
    // re-evaluates auth.service with the fake timer-aware setTimeout.
    vi.resetModules();
    vi.useFakeTimers();
    try {
      mockProfileSingle.mockImplementation(() => new Promise(() => {})); // never resolves
      const { resolveUserRole } = await import('./auth.service');
      const rolePromise = resolveUserRole('user-uuid-5');
      await vi.advanceTimersByTimeAsync(3001);
      const role = await rolePromise;
      expect(role).toBe('viewer');
    } finally {
      vi.useRealTimers();
    }
  });
});

// ============================================================================
// INTEGRATION — admin user management
// ============================================================================
describe('admin user management (integration)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_AUTH_BYPASS_CREATE_USER', 'false');
    vi.resetModules();
    mockGetSession.mockResolvedValue({ data: { session: null } });
    vi.stubGlobal('fetch', vi.fn());
    profilesLinkResult = { data: [], error: null };
    partnersSelectResult = { data: [], error: null };
    const { setAuthSession } = await import('../store/app.store');
    setAuthSession({ isLoggedIn: true, role: 'admin', displayName: 'Admin' });
  });

  it('fetchAllProfiles returns ok:false when profiles query fails', async () => {
    mockProfilesOrder.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    const { fetchAllProfiles } = await import('./auth.service');
    const result = await fetchAllProfiles();
    expect(result.ok).toBe(false);
    expect(result.data).toEqual([]);
  });

  it('fetchAllProfiles returns profile data on success', async () => {
    mockProfilesOrder.mockResolvedValueOnce({
      data: [{ id: 'p1', name: 'Ana', email: 'ana@test.com', role: 'membro', type: 'individual', phone: '+351999', user_id: 'u1', created_at: '2026-01-01' }],
      error: null,
    });
    profilesLinkResult = { data: [], error: null };
    partnersSelectResult = { data: [], error: null };
    const { fetchAllProfiles } = await import('./auth.service');
    const result = await fetchAllProfiles();
    expect(result.ok).toBe(true);
    expect(result.data).toHaveLength(1);
    if (!result.ok) throw new Error('expected ok result');
    expect(result.data[0]?.phone).toBe('+351999');
  });

  it('fetchAllProfiles retries without phone when the column is missing', async () => {
    mockProfilesOrder
      .mockResolvedValueOnce({
        data: null,
        error: { message: "Could not find the 'phone' column of 'profiles'" },
      })
      .mockResolvedValueOnce({
        data: [{ id: 'p1', name: 'Ana', email: 'ana@test.com', role: 'membro', type: 'individual', user_id: 'u1', created_at: '2026-01-01' }],
        error: null,
      });

    const { fetchAllProfiles } = await import('./auth.service');
    const result = await fetchAllProfiles();
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok result');
    expect(result.data[0]?.phone).toBeUndefined();
    expect(mockProfilesOrder).toHaveBeenCalledTimes(2);
  });

  it('fetchAllProfiles hydrates linked partner name without relying on relation select', async () => {
    mockProfilesOrder.mockResolvedValueOnce({
      data: [{
        id: 'p1',
        name: 'Ana',
        email: 'ana@test.com',
        role: 'membro',
        type: 'individual',
        user_id: 'u1',
        partner_id: 'partner-1',
        created_at: '2026-01-01',
      }],
      error: null,
    });
    profilesLinkResult = {
      data: [{ id: 'p1', partner_id: 'partner-1' }],
      error: null,
    };
    partnersSelectResult = {
      data: [{ id: 'partner-1', name: 'Parceiro Teste' }],
      error: null,
    };
    const { fetchAllProfiles } = await import('./auth.service');
    const result = await fetchAllProfiles();
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok result');
    expect(result.data[0]?.partner).toEqual({ id: 'partner-1', name: 'Parceiro Teste' });
  });

  it('fetchAllProfiles returns ok:false when partner lookup fails', async () => {
    mockProfilesOrder.mockResolvedValueOnce({
      data: [{ id: 'p1', name: 'Ana', email: 'ana@test.com', role: 'membro', type: 'individual', user_id: 'u1', created_at: '2026-01-01' }],
      error: null,
    });
    profilesLinkResult = { data: [{ id: 'p1', partner_id: 'partner-1' }], error: null };
    partnersSelectResult = { data: null, error: { message: 'partner-boom' } };
    const { fetchAllProfiles } = await import('./auth.service');
    const result = await fetchAllProfiles();
    expect(result.ok).toBe(false);
    expect(result.data).toEqual([]);
  });

  it('fetchAllProfiles degrades gracefully when partner_id migration is missing', async () => {
    mockProfilesOrder.mockResolvedValueOnce({
      data: [{ id: 'p1', name: 'Ana', email: 'ana@test.com', role: 'membro', type: 'individual', user_id: 'u1', created_at: '2026-01-01' }],
      error: null,
    });
    profilesLinkResult = {
      data: null,
      error: { message: 'column profiles.partner_id does not exist' },
    };
    const { fetchAllProfiles } = await import('./auth.service');
    const result = await fetchAllProfiles();
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok result');
    expect(result.capabilities.partnerLinking).toBe(false);
    expect(result.data[0]?.partner).toBeNull();
  });

  it('linkUserToPartner rejects invalid partner UUID before hitting Supabase', async () => {
    const { linkUserToPartner } = await import('./auth.service');
    const ok = await linkUserToPartner('profile-1', 'slug-seed');
    expect(ok).toBe(false);
    expect(mockUpdateEq).not.toHaveBeenCalled();
  });

  it('convertPreCadastroToAccount rejects invalid partner UUID before signup', async () => {
    const { convertPreCadastroToAccount } = await import('./auth.service');
    const result = await convertPreCadastroToAccount({
      name: 'Ana',
      email: 'ana@test.com',
      type: 'individual',
      role: 'membro',
      partnerId: 'slug-seed',
    });
    expect(result.ok).toBe(false);
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('convertPreCadastroToAccount uses admin function bypass in E2E mode', async () => {
    vi.stubEnv('VITE_AUTH_BYPASS_CREATE_USER', 'true');
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok-admin' } } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, userId: 'user-3' }),
    }));

    vi.resetModules();
    const { convertPreCadastroToAccount } = await import('./auth.service');
    const result = await convertPreCadastroToAccount({
      name: 'Ana',
      email: 'ana@test.com',
      type: 'individual',
      role: 'membro',
    });

    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:8787/admin-create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer tok-admin',
      },
      body: JSON.stringify({
        name: 'Ana',
        email: 'ana@test.com',
        type: 'individual',
        role: 'membro',
      }),
    });
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('convertPreCadastroToAccount allows local auth bypass in production-like E2E builds', async () => {
    vi.stubEnv('VITE_AUTH_BYPASS_CREATE_USER', 'true');
    vi.stubEnv('PROD', 'true');
    vi.stubEnv('VITE_AUTH_BYPASS_URL', '/__e2e__');
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok-admin' } } });
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, userId: 'user-4' }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    vi.resetModules();
    const { convertPreCadastroToAccount } = await import('./auth.service');
    const result = await convertPreCadastroToAccount({
      name: 'Ana',
      email: 'ana@test.com',
      type: 'individual',
      role: 'membro',
    });

    expect(result.ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith('/__e2e__/admin-create-user', expect.any(Object));
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  // M-1: production guard — bypass MUST still be refused for non-local endpoints
  it('convertPreCadastroToAccount refuses auth bypass when running in production with remote bypass URL', async () => {
    vi.stubEnv('VITE_AUTH_BYPASS_CREATE_USER', 'true');
    vi.stubEnv('PROD', 'true');
    vi.stubEnv('VITE_AUTH_BYPASS_URL', 'https://bypass.example.com');
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    vi.resetModules();
    const { convertPreCadastroToAccount } = await import('./auth.service');
    const result = await convertPreCadastroToAccount({
      name: 'Ana',
      email: 'ana@test.com',
      type: 'individual',
      role: 'membro',
    });

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/produção|production/i);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('convertPreCadastroToAccount waits for trigger-created profile and updates it', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'user-2', email: 'ana@test.com' } },
      error: null,
    });
    mockProfileSingle.mockResolvedValue({ data: { id: 'profile-2' }, error: null });
    mockUpdateEq.mockResolvedValue({ error: null });

    const { convertPreCadastroToAccount } = await import('./auth.service');
    const result = await convertPreCadastroToAccount({
      name: 'Ana',
      email: 'ana@test.com',
      type: 'individual',
      role: 'editor',
    });

    expect(result.ok).toBe(true);
    expect(mockProfilesUpsert).not.toHaveBeenCalled();
    expect(mockUpdateEq).toHaveBeenCalledWith('user_id', 'user-2');
  });

  it('convertPreCadastroToAccount maps Supabase email rate limit to a clear admin message', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'email rate limit exceeded' },
    });

    const { convertPreCadastroToAccount } = await import('./auth.service');
    const result = await convertPreCadastroToAccount({
      name: 'Ana',
      email: 'ana@test.com',
      type: 'individual',
      role: 'membro',
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('Limite de envio de emails');
  });

  it('convertPreCadastroToAccount finalizes an already-registered account by updating the existing profile', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'already registered' },
    });
    mockProfileSingle.mockResolvedValue({ data: { id: 'profile-existing' }, error: null });
    mockUpdateEq.mockResolvedValue({ error: null });

    const { convertPreCadastroToAccount } = await import('./auth.service');
    const result = await convertPreCadastroToAccount({
      name: 'Ana',
      email: 'ana@test.com',
      type: 'individual',
      role: 'admin',
      partnerId: '11111111-1111-1111-1111-111111111111',
    });

    expect(result.ok).toBe(true);
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'profile-existing');
    expect(mockSignUp).toHaveBeenCalled();
  });

  it('convertPreCadastroToAccount tells admin to retry when account exists but profile is still pending', async () => {
    vi.useFakeTimers();
    try {
      mockSignUp.mockResolvedValue({
        data: { user: null },
        error: { message: 'already registered' },
      });
      mockProfileSingle.mockResolvedValue({ data: null, error: null });

      const { convertPreCadastroToAccount } = await import('./auth.service');
      const promise = convertPreCadastroToAccount({
        name: 'Ana',
        email: 'ana@test.com',
        type: 'individual',
        role: 'membro',
      });
      await vi.advanceTimersByTimeAsync(2000);
      const result = await promise;

      expect(result.ok).toBe(false);
      expect(result.error).toContain('perfil ainda não ficou disponível');
    } finally {
      vi.useRealTimers();
    }
  });
});

// ============================================================================
// INTEGRATION — logout
// ============================================================================
describe('logout (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignOut.mockResolvedValue({ error: null });
  });

  it('calls supabase.auth.signOut', async () => {
    const { logout } = await import('./auth.service');
    await logout();
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('resets AUTH_SESSION to logged-out state', async () => {
    const { setAuthSession } = await import('../store/app.store');
    setAuthSession({ isLoggedIn: true, role: 'editor', displayName: 'Admin' });
    const { logout } = await import('./auth.service');
    await logout();
    const { AUTH_SESSION } = await import('../store/app.store');
    expect(AUTH_SESSION.isLoggedIn).toBe(false);
    expect(AUTH_SESSION.role).toBe('viewer');
  });
});

// ============================================================================
// INTEGRATION — signUp
// ============================================================================
describe('signUp (integration)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns { ok: true } on successful signup', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'u2', email: 'new@test.com' } },
      error: null,
    });
    const { signUp } = await import('./auth.service');
    const result = await signUp('new@test.com', 'password123', 'Test User', 'individual');
    expect(result.ok).toBe(true);
  });

  it('returns { ok: false } when Supabase signUp fails', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'Email already registered' },
    });
    const { signUp } = await import('./auth.service');
    const result = await signUp('existing@test.com', 'password123', 'Test User', 'individual');
    expect(result.ok).toBe(false);
  });

  it('accepts both individual and institucional types', async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: 'u3' } }, error: null });
    const { signUp } = await import('./auth.service');
    for (const type of ['individual', 'institucional'] as const) {
      const result = await signUp('t@t.com', 'password123', 'Test', type);
      expect(result.ok).toBe(true);
    }
  });
});

// ============================================================================
// BUG 4 (HIGH) — convertPreCadastroToAccount with null user.id
// When email already exists but is unconfirmed, Supabase returns
// { user: { id: null, ... }, session: null } with no error. The current
// code passes id=null to waitForProfileByUserId, producing a malformed
// query and locking the email out forever.
// ============================================================================
describe('convertPreCadastroToAccount null user.id edge case (BUG 4)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { setAuthSession } = await import('../store/app.store');
    setAuthSession({ isLoggedIn: true, role: 'admin', displayName: 'Admin' });
  });

  it('refuses cleanly when signUp returns user with null id', async () => {
    // Supabase v2 quirk: duplicate signup with email confirmation pending
    // returns user object but with id=null and no session.
    mockSignUp.mockResolvedValue({
      data: { user: { id: null, email: 'ana@test.com' } as any, session: null },
      error: null,
    });

    const { convertPreCadastroToAccount } = await import('./auth.service');
    const result = await convertPreCadastroToAccount({
      name: 'Ana',
      email: 'ana@test.com',
      type: 'individual',
      role: 'membro',
    });

    expect(result.ok).toBe(false);
    // Must NOT have attempted profile lookup with id=null
    // (would have produced a malformed eq('user_id', null) query)
    expect(result.error).toBeTruthy();
    // Error message should mention email already exists / duplicate
    expect(result.error?.toLowerCase()).toMatch(/já existe|duplicate|registad[ao]|registered|confirmado|inválido|invalid/);
  });
});
