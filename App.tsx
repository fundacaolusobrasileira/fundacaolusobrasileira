import React from 'react';
import { HashRouter } from 'react-router-dom';
import { Header, Footer, SmartInviteModal } from './components/domain';
import { ToastContainer } from './components/ui';
import { AppRouter } from './router';
import { supabase } from './supabaseClient';
import { syncMembers } from './services/members.service';
import { syncEvents } from './services/events.service';
import { syncActivityLog } from './services/activity-log.service';
import { resolveUserRole } from './services/auth.service';
import {
  AUTH_SESSION, AUTH_LOADING,
  PARTNERS, PRECADASTROS,
  setAuthSession, setAuthLoading, notifyState,
} from './store/app.store';

// --- Data Sync ---

const syncFromSupabase = async () => {
  // Partners
  const { data: partners, error: pError } = await supabase
    .from('partners').select('*').order('created_at', { ascending: false });
  if (partners && !pError) {
    PARTNERS.length = 0;
    PARTNERS.push(...partners.map((p: any) => ({
      ...p,
      type: p.type || (p.category === 'Governança' ? 'pessoa' : 'empresa'),
      socialLinks: p.social_links || {},
    })));
  }

  // PreCadastros (only for authenticated users)
  if (AUTH_SESSION.isLoggedIn) {
    const { data: pres } = await supabase.from('precadastros').select('*');
    if (pres) {
      PRECADASTROS.length = 0;
      PRECADASTROS.push(...pres.map((p: any) => ({
        ...p,
        createdAt: p.created_at,
      })));
    }
  }

  notifyState();
};

// --- Initial Load ---

syncFromSupabase();
syncMembers();
syncEvents();

// --- Auth Listener ---

let authGeneration = 0;

const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
  const generation = ++authGeneration;

  console.log(`[AUTH] event=${event} gen=${generation} user=${session?.user?.email ?? 'none'}`);

  if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && session?.user) {
    // On SIGNED_IN (token refresh), skip re-resolving if we already have a non-viewer role
    // for the same user — resolveUserRole can timeout and would downgrade the role to viewer.
    // Skip DB role query on SIGNED_IN when:
    // 1. Already have a non-viewer role for this user (token refresh), OR
    // 2. No session yet (SIGNED_IN fired before INITIAL_SESSION — Supabase _recoverAndRefresh race)
    //    In case 2, INITIAL_SESSION will arrive shortly and resolve the role correctly.
    const alreadyResolved =
      event === 'SIGNED_IN' && (
        (AUTH_SESSION.isLoggedIn && AUTH_SESSION.userId === session.user.id && AUTH_SESSION.role !== 'viewer') ||
        AUTH_LOADING  // INITIAL_SESSION hasn't fired yet — it will handle this SIGNED_IN
      );

    if (alreadyResolved) {
      console.log(`[AUTH] SIGNED_IN skipped — isLoggedIn=${AUTH_SESSION.isLoggedIn} role=${AUTH_SESSION.role}`);
      notifyState();
      return;
    }

    syncFromSupabase();
    syncMembers();
    syncEvents();
    syncActivityLog();

    console.log(`[AUTH] resolving role for user=${session.user.id} gen=${generation}`);
    const t0 = Date.now();
    const userRole = await resolveUserRole(session.user.id);
    console.log(`[AUTH] role resolved: role=${userRole} elapsed=${Date.now() - t0}ms gen=${generation} current=${authGeneration}`);

    if (generation !== authGeneration) {
      console.warn(`[AUTH] stale result discarded gen=${generation}`);
      return;
    }

    setAuthSession({
      isLoggedIn: true,
      role: userRole,
      displayName: session.user.email || 'Editor',
      userId: session.user.id,
      lastLoginAt: new Date().toISOString(),
    });
    setAuthLoading(false);
    console.log(`[AUTH] session ready role=${userRole}`);
  } else if (event === 'INITIAL_SESSION' && !session) {
    setAuthSession({ isLoggedIn: false, role: 'viewer' });
    setAuthLoading(false);
    syncEvents();   // garante sync após auth context estabelecido para utilizadores anónimos
    console.log(`[AUTH] no session, loading=false`);
  } else if (event === 'SIGNED_OUT') {
    setAuthSession({ isLoggedIn: false, role: 'viewer' });
    setAuthLoading(false);
    console.log(`[AUTH] signed out`);
    syncFromSupabase();
    syncMembers();
    syncEvents();
  }

  notifyState();
});

// Cleanup stale listeners on HMR
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    authSubscription.unsubscribe();
  });
}

// --- App Component ---

export default function App() {
  return (
    <HashRouter>
      <div className="flex flex-col min-h-screen font-sans selection:bg-brand-500/30 selection:text-brand-900">
        <Header />
        <div className="flex-grow">
          <AppRouter />
        </div>
        <Footer />
        <SmartInviteModal />
        <ToastContainer />
      </div>
    </HashRouter>
  );
}
