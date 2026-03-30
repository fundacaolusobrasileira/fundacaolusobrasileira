import { describe, it, expect, beforeEach } from 'vitest';

describe('app.store - AUTH_SESSION', () => {
  beforeEach(async () => {
    vi.resetModules();
  });

  it('starts with isLoggedIn false and role viewer', async () => {
    const { AUTH_SESSION } = await import('./app.store');
    expect(AUTH_SESSION.isLoggedIn).toBe(false);
    expect(AUTH_SESSION.role).toBe('viewer');
  });

  it('setAuthSession updates AUTH_SESSION', async () => {
    const { setAuthSession, AUTH_SESSION: before } = await import('./app.store');
    expect(before.isLoggedIn).toBe(false);

    setAuthSession({ isLoggedIn: true, role: 'editor', displayName: 'admin@test.com', userId: 'u1' });

    const { AUTH_SESSION: after } = await import('./app.store');
    expect(after.isLoggedIn).toBe(true);
    expect(after.role).toBe('editor');
    expect(after.displayName).toBe('admin@test.com');
  });

  it('isEditor returns false when not logged in', async () => {
    const { isEditor } = await import('./app.store');
    expect(isEditor()).toBe(false);
  });

  it('isEditor returns true when logged in as editor', async () => {
    const { setAuthSession, isEditor } = await import('./app.store');
    setAuthSession({ isLoggedIn: true, role: 'editor' });
    expect(isEditor()).toBe(true);
  });

  it('isEditor returns false when logged in as viewer', async () => {
    const { setAuthSession, isEditor } = await import('./app.store');
    setAuthSession({ isLoggedIn: true, role: 'viewer' });
    expect(isEditor()).toBe(false);
  });
});

describe('app.store - AUTH_LOADING', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('starts as true (auth not yet determined)', async () => {
    const { AUTH_LOADING } = await import('./app.store');
    expect(AUTH_LOADING).toBe(true);
  });

  it('setAuthLoading(false) marks auth as resolved', async () => {
    const { AUTH_LOADING: before, setAuthLoading } = await import('./app.store');
    expect(before).toBe(true);

    setAuthLoading(false);

    const { AUTH_LOADING: after } = await import('./app.store');
    expect(after).toBe(false);
  });
});

describe('app.store - notifyState fires FLB_STATE_EVENT', () => {
  it('dispatches FLB_STATE_EVENT on window', async () => {
    const { notifyState, FLB_STATE_EVENT } = await import('./app.store');
    let fired = false;
    window.addEventListener(FLB_STATE_EVENT, () => { fired = true; }, { once: true });
    notifyState();
    expect(fired).toBe(true);
  });
});
