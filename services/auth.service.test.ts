import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase
const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();
const mockSignUp = vi.fn();
const mockProfileSelect = vi.fn();

vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: any[]) => mockSignInWithPassword(...args),
      signOut: (...args: any[]) => mockSignOut(...args),
      signUp: (...args: any[]) => mockSignUp(...args),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockProfileSelect,
        })),
      })),
      insert: vi.fn(() => ({ select: vi.fn() })),
    })),
  },
}));

// Use real store (no mock) — we need live bindings for AUTH_SESSION

describe('auth.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loginAsEditor', () => {
    it('returns { ok: true } on successful login', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { session: { access_token: 'tok' }, user: { id: 'u1', email: 'admin@test.com' } },
        error: null,
      });
      mockProfileSelect.mockResolvedValue({ data: { role: 'editor' }, error: null });

      const { loginAsEditor } = await import('./auth.service');
      const result = await loginAsEditor('admin@test.com', 'pass');

      expect(result.ok).toBe(true);
    });

    it('returns { ok: false } with invalid credentials', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Invalid login credentials' },
      });

      const { loginAsEditor } = await import('./auth.service');
      const result = await loginAsEditor('wrong@test.com', 'wrong');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('incorretos');
    });

    it('does not hang if profile query throws', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { session: { access_token: 'tok' }, user: { id: 'u1', email: 'admin@test.com' } },
        error: null,
      });
      mockProfileSelect.mockRejectedValue(new Error('Network error'));

      const { loginAsEditor } = await import('./auth.service');
      const result = await loginAsEditor('admin@test.com', 'pass');

      // Should succeed even if profile lookup fails — defaults to viewer
      expect(result.ok).toBe(true);
    });

    it('sets AUTH_SESSION.isLoggedIn to true after login', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { session: { access_token: 'tok' }, user: { id: 'u1', email: 'admin@test.com' } },
        error: null,
      });
      mockProfileSelect.mockResolvedValue({ data: { role: 'editor' }, error: null });

      const { loginAsEditor } = await import('./auth.service');
      const store = await import('../store/app.store');

      await loginAsEditor('admin@test.com', 'pass');
      // Read directly from the module's live binding
      expect(store.AUTH_SESSION.isLoggedIn).toBe(true);
      expect(store.AUTH_SESSION.role).toBe('editor');
    });
  });

  describe('logout', () => {
    it('calls signOut and resets AUTH_SESSION', async () => {
      mockSignOut.mockResolvedValue({ error: null });

      const { setAuthSession } = await import('../store/app.store');
      setAuthSession({ isLoggedIn: true, role: 'editor', displayName: 'test' });

      const { logout } = await import('./auth.service');
      await logout();

      const { AUTH_SESSION } = await import('../store/app.store');
      expect(AUTH_SESSION.isLoggedIn).toBe(false);
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  describe('signUp', () => {
    it('returns { ok: true } on successful signup', async () => {
      mockSignUp.mockResolvedValue({
        data: { user: { id: 'u2', email: 'new@test.com' } },
        error: null,
      });

      const { signUp } = await import('./auth.service');
      const result = await signUp('new@test.com', 'password123', 'Test User', 'individual');

      expect(result.ok).toBe(true);
    });

    it('returns { ok: false } if password too short', async () => {
      const { signUp } = await import('./auth.service');
      const result = await signUp('new@test.com', '123', 'Test', 'individual');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('6 caracteres');
    });
  });
});
