// store/app.store.ts
import type { Event, Partner, PreCadastro, PendingMediaSubmission, ActivityLogItem, AuthSession } from '../types';

export const FLB_STATE_EVENT = 'flb_state_update';
export const FLB_TOAST_EVENT = 'flb_toast_event';

export const EVENTS: Event[] = [];
export const PARTNERS: Partner[] = [];
export const PRECADASTROS: PreCadastro[] = [];
export const PENDING_MEDIA_SUBMISSIONS: PendingMediaSubmission[] = [];
export const ACTIVITY_LOG: ActivityLogItem[] = [];
export let AUTH_SESSION: AuthSession = { isLoggedIn: false, role: 'viewer' };

export const setAuthSession = (session: AuthSession) => { AUTH_SESSION = session; };

export const notifyState = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(FLB_STATE_EVENT));
};

export const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
  if (typeof window !== 'undefined')
    window.dispatchEvent(new CustomEvent(FLB_TOAST_EVENT, { detail: { message, type } }));
};

export const generateId = (prefix: string) =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}`;

export const logActivity = (action: string, target: string) => {
  ACTIVITY_LOG.unshift({
    id: generateId('log'),
    action,
    target,
    timestamp: new Date().toISOString(),
    user: AUTH_SESSION.displayName || 'Editor',
  });
  if (ACTIVITY_LOG.length > 50) ACTIVITY_LOG.pop();
};

export const isEditor = () => AUTH_SESSION.isLoggedIn && AUTH_SESSION.role === 'editor';

export const resolveGalleryItemSrc = (item: { srcType: string; url: string }) => item.url;

export const exportState = () => { showToast('Exportação desativada no modo Supabase.', 'info'); };
export const importState = (_jsonString: string) => ({ success: false, message: 'Importação desativada.' });
