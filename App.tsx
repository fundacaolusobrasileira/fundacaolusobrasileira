import React from 'react';
import { HashRouter } from 'react-router-dom';
import { Header, Footer, SmartInviteModal } from './components/domain';
import { ToastContainer } from './components/ui';
import { AppRouter } from './router';
import { supabase } from './supabaseClient';
import { syncMembers } from './services/members.service';
import { syncEvents } from './services/events.service';
import { resolveUserRole } from './services/auth.service';
import {
  AUTH_SESSION,
  EVENTS, PARTNERS, PRECADASTROS,
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

  // Events
  const { data: events, error: eError } = await supabase
    .from('events').select('*').order('created_at', { ascending: false });
  if (events && !eError) {
    EVENTS.length = 0;
    EVENTS.push(...events.map((e: any) => ({
      ...e,
      coverImage: e.cover_image,
      socialLinks: e.social_links || {},
      descriptionShort: e.description_short,
      endDate: e.end_date,
      endTime: e.end_time,
      cardImage: e.card_image,
      gallery: (() => { try { return typeof e.gallery === 'string' ? JSON.parse(e.gallery) : (e.gallery || []); } catch { return []; } })(),
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

const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
  if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && session?.user) {
    const userRole = await resolveUserRole(session.user.id);
    setAuthSession({
      isLoggedIn: true,
      role: userRole,
      displayName: session.user.email || 'Editor',
      userId: session.user.id,
      lastLoginAt: new Date().toISOString(),
    });
    syncFromSupabase();
    syncMembers();
    syncEvents();
  } else if (event === 'INITIAL_SESSION' && !session) {
    setAuthSession({ isLoggedIn: false, role: 'viewer' });
  } else if (event === 'SIGNED_OUT') {
    setAuthSession({ isLoggedIn: false, role: 'viewer' });
    syncFromSupabase();
    syncMembers();
    syncEvents();
  }

  if (event === 'INITIAL_SESSION') {
    setAuthLoading(false);
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
