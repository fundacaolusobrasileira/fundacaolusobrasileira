// services/activity-log.service.ts
import { supabase } from '../supabaseClient';
import { ACTIVITY_LOG, AUTH_SESSION, notifyState } from '../store/app.store';
import type { ActivityLogItem } from '../types';

const normalizeLog = (row: any): ActivityLogItem => ({
  id: row.id,
  action: row.action,
  target: row.target,
  user: row.user_name,
  timestamp: row.created_at,
});

export const syncActivityLog = async () => {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error || !data) return;
  ACTIVITY_LOG.length = 0;
  ACTIVITY_LOG.push(...data.map(normalizeLog));
  notifyState();
};

export const persistLogEntry = async (action: string, target: string) => {
  const payload = {
    action,
    target,
    user_name: AUTH_SESSION.displayName || 'Editor',
    user_id: AUTH_SESSION.userId || null,
  };
  await supabase.from('activity_logs').insert([payload]);
};
