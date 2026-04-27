import React, { lazy, Suspense } from 'react';
import { HashRouter } from 'react-router-dom';
import { Header, Footer } from './components/domain';
import { ToastContainer } from './components/ui';

const SmartInviteModal = lazy(() =>
  import('./components/domain').then(m => ({ default: m.SmartInviteModal }))
);
import { AppRouter } from './router';
import { supabase } from './supabaseClient';
import { syncMembers } from './services/members.service';
import { syncEvents } from './services/events.service';
import { syncCommunityMedia } from './services/community-media.service';
import { syncActivityLog } from './services/activity-log.service';
import { syncPreCadastros } from './services/precadastros.service';
import { resolveUserRole } from './services/auth.service';
import {
  AUTH_SESSION, AUTH_LOADING,
  PRECADASTROS, PENDING_MEDIA_SUBMISSIONS, ACTIVITY_LOG,
  setAuthSession, setAuthLoading, notifyState,
} from './store/app.store';

// --- Data Sync ---

const clearEditorOnlyState = () => {
  PRECADASTROS.length = 0;
  PENDING_MEDIA_SUBMISSIONS.length = 0;
  ACTIVITY_LOG.length = 0;
  notifyState();
};

// --- Initial Load ---

syncMembers();
syncEvents();

// --- Auth Listener ---

let authGeneration = 0;

const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
  const generation = ++authGeneration;

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
      notifyState();
      return;
    }

    syncMembers();
    syncEvents();
    clearEditorOnlyState();

    const userRole = await resolveUserRole(session.user.id);

    if (generation !== authGeneration) {
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
    if (userRole === 'admin' || userRole === 'editor') {
      syncPreCadastros();
      syncCommunityMedia();
      syncActivityLog();
    } else {
      clearEditorOnlyState();
    }
  } else if (event === 'INITIAL_SESSION' && !session) {
    setAuthSession({ isLoggedIn: false, role: 'viewer' });
    setAuthLoading(false);
    clearEditorOnlyState();
    syncEvents();   // garante sync após auth context estabelecido para utilizadores anónimos
  } else if (event === 'SIGNED_OUT') {
    setAuthSession({ isLoggedIn: false, role: 'viewer' });
    setAuthLoading(false);
    clearEditorOnlyState();
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
        <Suspense fallback={null}>
          <SmartInviteModal />
        </Suspense>
        <ToastContainer />
      </div>
    </HashRouter>
  );
}
