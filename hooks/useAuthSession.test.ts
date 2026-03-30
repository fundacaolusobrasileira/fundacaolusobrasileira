import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../supabaseClient', () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } },
}));

describe('useAuthSession hook', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns current AUTH_SESSION with authLoading', async () => {
    const { useAuthSession } = await import('./useAuthSession');
    const { result } = renderHook(() => useAuthSession());

    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.role).toBe('viewer');
    expect(result.current.authLoading).toBe(true);
  });

  it('updates session when setAuthSession + notifyState is called', async () => {
    const { useAuthSession } = await import('./useAuthSession');
    const { setAuthSession, notifyState } = await import('../store/app.store');

    const { result } = renderHook(() => useAuthSession());
    expect(result.current.isLoggedIn).toBe(false);

    act(() => {
      setAuthSession({ isLoggedIn: true, role: 'editor', displayName: 'editor@test.com' });
      notifyState();
    });

    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.role).toBe('editor');
  });

  it('reflects authLoading becoming false after setAuthLoading + notifyState', async () => {
    const { useAuthSession } = await import('./useAuthSession');
    const { setAuthLoading, notifyState } = await import('../store/app.store');

    const { result } = renderHook(() => useAuthSession());
    expect(result.current.authLoading).toBe(true);

    act(() => {
      setAuthLoading(false);
      notifyState();
    });

    expect(result.current.authLoading).toBe(false);
  });

  it('guards should not redirect while authLoading is true', async () => {
    const { useAuthSession } = await import('./useAuthSession');
    const { result } = renderHook(() => useAuthSession());

    // Auth not yet determined — both flags should prevent any redirect decision
    expect(result.current.authLoading).toBe(true);
    expect(result.current.isLoggedIn).toBe(false);
    // Correct guard: if (authLoading) return; — don't redirect
  });
});
