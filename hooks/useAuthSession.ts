import { useState, useEffect } from 'react';
import { AUTH_SESSION, AUTH_LOADING, FLB_STATE_EVENT, setAuthLoading } from '../store/app.store';
import { supabase } from '../supabaseClient';
import type { AuthSession } from '../types';

export type AuthState = AuthSession & { authLoading: boolean };

const AUTH_TIMEOUT_MS = 4000;

// Returns a reactive snapshot of auth state.
// Re-renders whenever FLB_STATE_EVENT fires.
export const useAuthSession = (): AuthState => {
  const [state, setState] = useState<AuthState>(() => ({
    ...AUTH_SESSION,
    authLoading: AUTH_LOADING,
  }));

  useEffect(() => {
    const sync = () => setState({ ...AUTH_SESSION, authLoading: AUTH_LOADING });
    window.addEventListener(FLB_STATE_EVENT, sync);
    // Sync immediately in case state changed between initial render and effect
    sync();

    // Safety net: if AUTH_LOADING is still true after timeout (e.g. HMR stale
    // reference, or Supabase SDK failing to fire INITIAL_SESSION), resolve it
    // by checking Supabase session directly.
    let timeout: ReturnType<typeof setTimeout> | null = null;
    if (AUTH_LOADING) {
      timeout = setTimeout(async () => {
        if (AUTH_LOADING) {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            setAuthLoading(false);
            sync();
          }
          // If session exists, onAuthStateChange should handle it.
          // If it didn't, force resolve anyway.
          setAuthLoading(false);
          sync();
        }
      }, AUTH_TIMEOUT_MS);
    }

    return () => {
      window.removeEventListener(FLB_STATE_EVENT, sync);
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  return state;
};
