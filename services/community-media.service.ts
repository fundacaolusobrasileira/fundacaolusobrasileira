import { supabase } from '../supabaseClient';
import { PENDING_MEDIA_SUBMISSIONS, AUTH_SESSION, notifyState, showToast } from '../store/app.store';
import type { PendingMediaSubmission } from '../types';

const normalize = (row: any): PendingMediaSubmission => ({
  id: row.id,
  eventId: row.event_id,
  authorName: row.author_name,
  email: row.email,
  url: row.url,
  type: row.type,
  message: row.message,
  status: row.status,
  createdAt: row.created_at,
});

export const syncCommunityMedia = async () => {
  const { data, error } = await supabase
    .from('community_media_submissions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error || !data) return;
  PENDING_MEDIA_SUBMISSIONS.length = 0;
  PENDING_MEDIA_SUBMISSIONS.push(...data.map(normalize));
  notifyState();
};

export const submitCommunityMedia = async (
  submission: Omit<PendingMediaSubmission, 'id' | 'createdAt' | 'status'>
): Promise<PendingMediaSubmission | null> => {
  const payload = {
    event_id: submission.eventId,
    author_name: submission.authorName,
    email: submission.email,
    url: submission.url,
    type: submission.type,
    message: submission.message,
    user_id: AUTH_SESSION.userId || null,
  };

  const { data: res, error } = await supabase
    .from('community_media_submissions')
    .insert([payload])
    .select();

  if (error || !res) {
    console.error('submitCommunityMedia error:', error);
    showToast('Erro ao enviar mídia.', 'error');
    return null;
  }

  const normalized = normalize(res[0]);
  PENDING_MEDIA_SUBMISSIONS.push(normalized);
  notifyState();
  return normalized;
};
