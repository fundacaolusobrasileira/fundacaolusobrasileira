// services/events.service.ts
import { supabase } from '../supabaseClient';
import { EVENTS, PENDING_MEDIA_SUBMISSIONS, notifyState, showToast, logActivity, isEditor, generateId, setEventsLoading, setEventsError } from '../store/app.store';
import type { Event, GalleryItem } from '../types';

// Validate URL is safe (prevents javascript:, data: XSS)
const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const normalizeEvent = (e: any): Event => {
  const normalized: any = { ...e };
  normalized.coverImage = e.cover_image;
  normalized.socialLinks = e.social_links || {};
  normalized.descriptionShort = e.description_short;
  normalized.endDate = e.end_date;
  normalized.endTime = e.end_time;
  normalized.cardImage = e.card_image;
  // FIX DATA-001: try-catch for gallery JSON.parse
  try {
    normalized.gallery = typeof e.gallery === 'string' ? JSON.parse(e.gallery) : (e.gallery || []);
  } catch {
    normalized.gallery = [];
  }
  delete normalized.cover_image;
  delete normalized.social_links;
  delete normalized.description_short;
  delete normalized.end_date;
  delete normalized.end_time;
  delete normalized.card_image;
  return normalized;
};

export const syncEvents = async () => {
  setEventsLoading(true);
  setEventsError(null);
  notifyState();
  const { data, error } = await supabase.from('events').select('*').order('created_at', { ascending: false });
  if (error || !data) {
    setEventsError(error?.message ?? 'Erro ao carregar eventos.');
    setEventsLoading(false);
    notifyState();
    return;
  }
  EVENTS.length = 0;
  EVENTS.push(...data.map(normalizeEvent));
  setEventsLoading(false);
  notifyState();
};

export const getPublicEvents = (): Event[] =>
  EVENTS.filter(e => e.status === 'published');

export const createEvent = async (data: Partial<Event>): Promise<Event | null> => {
  if (!isEditor()) return null;
  const payload: any = {
    title: data.title || 'Novo Evento',
    subtitle: data.subtitle,
    description: data.description,
    description_short: data.descriptionShort,
    date: data.date,
    time: data.time,
    end_date: data.endDate,
    end_time: data.endTime,
    location: data.location,
    address: data.address,
    city: data.city,
    country: data.country,
    category: data.category || 'Outros',
    tags: data.tags,
    image: data.image,
    cover_image: data.coverImage,
    card_image: data.cardImage,
    social_links: data.socialLinks,
    gallery: data.gallery || [],
    links: data.links,
    status: data.status || 'draft',
    featured: data.featured || false,
    objective: data.objective,
    experience: data.experience,
    sponsors: data.sponsors,
    notes: data.notes,
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

// All editable columns in the events table (excludes id, created_at, updated_at)
const EVENT_DB_COLUMNS = new Set([
  'title', 'subtitle', 'description', 'description_short', 'objective', 'experience',
  'sponsors', 'date', 'time', 'end_date', 'end_time', 'location', 'address', 'city',
  'country', 'category', 'tags', 'image', 'cover_image', 'card_image', 'gallery',
  'links', 'social_links', 'status', 'featured', 'notes',
]);

// FIX SEC-003: Update Supabase FIRST, then update store only on success
// BUG 6 FIX: whitelist DB columns to prevent 400 from non-existent fields
export const updateEvent = async (id: string, patch: Partial<Event>, notify = true) => {
  if (!isEditor()) return;
  const raw: any = { ...patch };
  const mappings: [string, string][] = [
    ['coverImage', 'cover_image'],
    ['socialLinks', 'social_links'],
    ['descriptionShort', 'description_short'],
    ['endDate', 'end_date'],
    ['endTime', 'end_time'],
    ['cardImage', 'card_image'],
  ];
  for (const [camel, snake] of mappings) {
    if (camel in raw) { raw[snake] = raw[camel]; delete raw[camel]; }
  }

  const payload: any = {};
  for (const key of Object.keys(raw)) {
    if (EVENT_DB_COLUMNS.has(key)) payload[key] = raw[key];
  }

  const { error } = await supabase.from('events').update(payload).eq('id', id);
  if (!error) {
    const idx = EVENTS.findIndex(e => e.id === id);
    if (idx !== -1) { EVENTS[idx] = { ...EVENTS[idx], ...patch }; }
    logActivity('Editou evento', EVENTS.find(e => e.id === id)?.title || id);
    notifyState();
    if (notify) showToast('Evento salvo.', 'success');
  } else {
    showToast('Erro ao salvar.', 'error');
  }
};

export const deleteEvent = async (id: string) => {
  if (!isEditor()) return;
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (!error) {
    const idx = EVENTS.findIndex(e => e.id === id);
    if (idx !== -1) {
      const title = EVENTS[idx].title;
      EVENTS.splice(idx, 1);
      logActivity('Removeu evento', title);
      notifyState();
      showToast('Evento removido.', 'success');
    }
  }
};

const addGalleryItem = async (eventId: string, item: Omit<GalleryItem, 'id' | 'createdAt' | 'order'>) => {
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

export const addMediaToEvent = async (eventId: string, file: File) => {
  if (!isEditor()) return;
  try {
    const { saveMediaBlob } = await import('./media.service');
    const publicUrl = await saveMediaBlob(file);
    await addGalleryItem(eventId, {
      kind: file.type.startsWith('video') ? 'video' : 'image',
      srcType: 'url',
      url: publicUrl,
      source: 'oficial',
      status: 'published',
    });
    showToast('Imagem enviada.', 'success');
  } catch (e: any) {
    console.error('Failed to add media', e);
    showToast(`Erro no upload: ${e?.message || 'erro desconhecido'}`, 'error');
  }
};

// FIX SEC-002: Validate URL before adding to gallery
export const addUrlMediaToEvent = (eventId: string, url: string) => {
  if (!isEditor()) return;
  if (!isValidUrl(url)) {
    showToast('URL inválida. Use apenas HTTP ou HTTPS.', 'error');
    return;
  }
  addGalleryItem(eventId, {
    kind: 'image',
    srcType: 'url',
    url,
    source: 'oficial',
    status: 'published',
  });
};

export const addEventImagesFromFiles = async (eventId: string, files: FileList | File[]) => {
  const fileList = files instanceof FileList ? Array.from(files) : files;
  for (const file of fileList) {
    await addMediaToEvent(eventId, file);
  }
};

export const approveCommunityMedia = async (eventId: string, submissionId: string) => {
  if (!isEditor()) return;
  const sub = PENDING_MEDIA_SUBMISSIONS.find(s => s.id === submissionId);
  if (!sub) return;
  await addGalleryItem(eventId, {
    kind: sub.type, srcType: 'url', url: sub.url,
    caption: `Enviado por ${sub.authorName}`,
    source: 'comunidade', status: 'published',
  });
  const idx = PENDING_MEDIA_SUBMISSIONS.findIndex(s => s.id === submissionId);
  if (idx !== -1) PENDING_MEDIA_SUBMISSIONS.splice(idx, 1);
  const event = EVENTS.find(e => e.id === eventId);
  logActivity('Aprovou mídia', event?.title || eventId);
  notifyState();
  showToast('Mídia aprovada.', 'success');
};

export const rejectCommunityMedia = (submissionId: string) => {
  if (!isEditor()) return;
  const idx = PENDING_MEDIA_SUBMISSIONS.findIndex(s => s.id === submissionId);
  if (idx !== -1) {
    PENDING_MEDIA_SUBMISSIONS.splice(idx, 1);
    logActivity('Rejeitou mídia', submissionId);
    notifyState();
    showToast('Mídia rejeitada.', 'info');
  }
};
