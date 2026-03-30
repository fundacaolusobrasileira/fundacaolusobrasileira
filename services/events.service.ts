// services/events.service.ts
import { supabase } from '../supabaseClient';
import { EVENTS, PENDING_MEDIA_SUBMISSIONS, notifyState, showToast, logActivity, isEditor, generateId } from '../store/app.store';
import type { Event, GalleryItem } from '../types';

type RawEventRow = Omit<Event, 'coverImage' | 'socialLinks' | 'gallery'> & {
  cover_image?: string;
  social_links?: Record<string, string>;
  gallery?: string | GalleryItem[];
};

const normalizeEvent = (e: RawEventRow): Event => ({
  ...e,
  coverImage: e.cover_image,
  socialLinks: e.social_links || {},
  gallery: (() => { try { return typeof e.gallery === 'string' ? JSON.parse(e.gallery) : (e.gallery || []); } catch { return []; } })(),
});

export const syncEvents = async () => {
  const { data, error } = await supabase.from('events').select('*').order('created_at', { ascending: false });
  if (error || !data) return;
  EVENTS.length = 0;
  EVENTS.push(...data.map(normalizeEvent));
  notifyState();
};

export const createEvent = async (data: Partial<Event>): Promise<Event | null> => {
  if (!isEditor()) return null;
  const payload = {
    title: data.title || 'Novo Evento',
    date: data.date,
    category: data.category || 'Outros',
    description: data.description,
    location: data.location,
    image: data.image,
    cover_image: data.coverImage,
    social_links: data.socialLinks,
    gallery: data.gallery || [],
    status: data.status || 'draft',
    featured: data.featured || false,
  };
  const { data: res, error } = await supabase.from('events').insert([payload]).select();
  if (error || !res) { showToast('Erro ao criar evento.', 'error'); return null; }
  const newEvent = normalizeEvent(res[0]);
  EVENTS.unshift(newEvent);
  logActivity('Criou evento', newEvent.title);
  notifyState();
  showToast('Evento criado.', 'success');
  return newEvent;
};

export const updateEvent = async (id: string, patch: Partial<Event>, notify = true) => {
  if (!isEditor()) return;
  const payload: Record<string, unknown> = { ...patch };
  if ('coverImage' in patch) { payload.cover_image = patch.coverImage; delete payload.coverImage; }
  if ('socialLinks' in patch) { payload.social_links = patch.socialLinks; delete payload.socialLinks; }
  delete payload.id; delete payload.created_at; delete payload.updated_at;
  const idx = EVENTS.findIndex(e => e.id === id);
  if (idx !== -1) { EVENTS[idx] = { ...EVENTS[idx], ...patch }; notifyState(); }
  const { error } = await supabase.from('events').update(payload).eq('id', id);
  if (!error && notify) showToast('Evento salvo.', 'success');
  else if (error) showToast('Erro ao salvar.', 'error');
};

export const deleteEvent = async (id: string) => {
  if (!isEditor()) return;
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (!error) {
    const idx = EVENTS.findIndex(e => e.id === id);
    if (idx !== -1) { EVENTS.splice(idx, 1); notifyState(); showToast('Evento removido.', 'success'); }
  }
};

export const addUrlMediaToEvent = async (eventId: string, item: Omit<GalleryItem, 'id' | 'createdAt' | 'order'>) => {
  const event = EVENTS.find(e => e.id === eventId);
  if (!event || !isEditor()) return;
  const newItem: GalleryItem = {
    ...item,
    id: generateId('media'),
    createdAt: new Date().toISOString(),
    order: event.gallery.length,
  };
  event.gallery.push(newItem);
  await updateEvent(eventId, { gallery: event.gallery }, false);
  notifyState();
};

export const addMediaToEvent = addUrlMediaToEvent;

export const addEventImagesFromFiles = async (eventId: string, files: File[], saveMediaBlob: (f: File) => Promise<string>) => {
  for (const file of files) {
    const url = await saveMediaBlob(file);
    await addUrlMediaToEvent(eventId, {
      kind: 'image', srcType: 'url', url,
      source: 'oficial', status: 'published',
    });
  }
};

export const approveCommunityMedia = async (eventId: string, submissionId: string) => {
  if (!isEditor()) return;
  const sub = PENDING_MEDIA_SUBMISSIONS.find(s => s.id === submissionId);
  if (!sub) return;
  await addUrlMediaToEvent(eventId, {
    kind: sub.type, srcType: 'url', url: sub.url,
    caption: `Enviado por ${sub.authorName}`,
    source: 'comunidade', status: 'published',
  });
  const idx = PENDING_MEDIA_SUBMISSIONS.findIndex(s => s.id === submissionId);
  if (idx !== -1) PENDING_MEDIA_SUBMISSIONS.splice(idx, 1);
  notifyState();
  showToast('Mídia aprovada.', 'success');
};

export const rejectCommunityMedia = (submissionId: string) => {
  if (!isEditor()) return;
  const idx = PENDING_MEDIA_SUBMISSIONS.findIndex(s => s.id === submissionId);
  if (idx !== -1) { PENDING_MEDIA_SUBMISSIONS.splice(idx, 1); notifyState(); showToast('Mídia rejeitada.', 'info'); }
};
