// services/events.service.ts
import { supabase } from '../supabaseClient';
import { EVENTS, PENDING_MEDIA_SUBMISSIONS, notifyState, showToast, logActivity, isEditor, generateId, setEventsLoading, setEventsError } from '../store/app.store';
import type { Event, GalleryItem } from '../types';
import { isSafeHttpUrl } from '../utils/url';

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
  try {
    normalized.sponsorIds = typeof e.sponsors === 'string' && e.sponsors.startsWith('[')
      ? JSON.parse(e.sponsors)
      : [];
  } catch {
    normalized.sponsorIds = [];
  }
  delete normalized.sponsors;
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

export const getPublicEvents = (): Event[] => [...EVENTS];

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
    sponsors: data.sponsorIds ? JSON.stringify(data.sponsorIds) : null,
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
export const updateEvent = async (id: string, patch: Partial<Event>, notify = true): Promise<boolean> => {
  if (!isEditor()) return false;
  const raw: any = { ...patch };
  if ('sponsorIds' in raw) {
    raw['sponsors'] = JSON.stringify(raw.sponsorIds);
    delete raw.sponsorIds;
  }
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

  // BUG 2 FIX: RLS USING denial returns { error: null, data: [] } — must check
  // rows affected, not just absence of error. Use .select() to detect.
  const { data, error } = await supabase.from('events').update(payload).eq('id', id).select('id');
  if (error) {
    showToast('Erro ao salvar.', 'error');
    return false;
  }
  if (!data || data.length === 0) {
    showToast('Sem permissão para editar este evento.', 'error');
    return false;
  }
  const idx = EVENTS.findIndex(e => e.id === id);
  if (idx !== -1) { EVENTS[idx] = { ...EVENTS[idx], ...patch }; }
  logActivity('Editou evento', EVENTS.find(e => e.id === id)?.title || id);
  notifyState();
  if (notify) showToast('Evento salvo.', 'success');
  return true;
};

export const deleteEvent = async (id: string): Promise<boolean> => {
  if (!isEditor()) return false;
  // BUG 2 PATTERN: RLS USING denial returns { error: null, data: [] } — verify rows affected.
  const { data, error } = await supabase.from('events').delete().eq('id', id).select('id');
  if (error) {
    showToast('Erro ao remover evento.', 'error');
    return false;
  }
  if (!data || data.length === 0) {
    showToast('Sem permissão para remover este evento.', 'error');
    return false;
  }
  const idx = EVENTS.findIndex(e => e.id === id);
  if (idx !== -1) {
    const title = EVENTS[idx].title;
    EVENTS.splice(idx, 1);
    logActivity('Removeu evento', title);
    notifyState();
    showToast('Evento removido.', 'success');
  }
  return true;
};

// BUG 1 FIX: addGalleryItem must serialize parallel calls per event-id.
// Reading `event.gallery.length` and then awaiting allows two concurrent
// callers to compute the same `order` value (collision). We chain calls
// per eventId via a promise queue so the second call only starts after
// the first has fully written.
const galleryWriteChain = new Map<string, Promise<unknown>>();

const addGalleryItem = async (eventId: string, item: Omit<GalleryItem, 'id' | 'createdAt' | 'order'>): Promise<boolean> => {
  if (!isEditor()) return false;
  if (!EVENTS.find(e => e.id === eventId)) return false;

  const previous = galleryWriteChain.get(eventId) ?? Promise.resolve();
  const next = previous.then(async () => {
    // Re-read event from store INSIDE the chained promise so we always pick
    // up the gallery written by the previous call.
    const event = EVENTS.find(e => e.id === eventId);
    if (!event) return false;
    const newItem: GalleryItem = {
      ...item,
      id: generateId('media'),
      createdAt: new Date().toISOString(),
      order: event.gallery.length,
    };
    const nextGallery = [...event.gallery, newItem];
    const updated = await updateEvent(eventId, { gallery: nextGallery }, false);
    if (updated) {
      notifyState();
    }
    return updated;
  });

  galleryWriteChain.set(eventId, next.catch(() => {}));
  return next;
};

export const addMediaToEvent = async (eventId: string, file: File) => {
  if (!isEditor()) return;
  try {
    const { saveMediaBlob } = await import('./media.service');
    const publicUrl = await saveMediaBlob(file);
    const added = await addGalleryItem(eventId, {
      kind: file.type.startsWith('video') ? 'video' : 'image',
      srcType: 'url',
      url: publicUrl,
      source: 'oficial',
      status: 'published',
    });
    if (added) {
      showToast('Imagem enviada.', 'success');
    } else {
      showToast('Erro ao guardar mídia no evento.', 'error');
    }
  } catch (e: any) {
    console.error('Failed to add media', e);
    showToast(`Erro no upload: ${e?.message || 'erro desconhecido'}`, 'error');
  }
};

// FIX SEC-002: Validate URL before adding to gallery
// M-2: always resolves to boolean (never undefined) — consistent service contract.
export const addUrlMediaToEvent = async (eventId: string, url: string, kind: 'image' | 'video' = 'image'): Promise<boolean> => {
  if (!isEditor()) return false;
  if (!isSafeHttpUrl(url)) {
    showToast('URL inválida. Use apenas HTTP ou HTTPS.', 'error');
    return false;
  }
  const added = await addGalleryItem(eventId, {
    kind,
    srcType: 'url',
    url,
    source: 'oficial',
    status: 'published',
  });
  return added === true;
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
  const event = EVENTS.find(e => e.id === eventId);
  if (!event) return;
  const previousGallery = [...event.gallery];
  const added = await addGalleryItem(eventId, {
    kind: sub.type, srcType: 'url', url: sub.url,
    caption: `Enviado por ${sub.authorName}`,
    source: 'comunidade', status: 'published',
  });
  if (!added) {
    showToast('Erro ao aprovar mídia.', 'error');
    return;
  }
  // BUG 2 PATTERN: RLS USING denial returns { error: null, data: [] } — verify rows affected.
  const { data, error } = await supabase
    .from('community_media_submissions')
    .delete()
    .eq('id', submissionId)
    .select('id');
  if (error || !data || data.length === 0) {
    const rolledBack = await updateEvent(eventId, { gallery: previousGallery }, false);
    if (!rolledBack) {
      showToast('Erro ao atualizar submissão de mídia e falha ao reverter publicação.', 'error');
      return;
    }
    showToast('Erro ao atualizar submissão de mídia. A publicação foi revertida.', 'error');
    return;
  }
  const idx = PENDING_MEDIA_SUBMISSIONS.findIndex(s => s.id === submissionId);
  if (idx !== -1) PENDING_MEDIA_SUBMISSIONS.splice(idx, 1);
  logActivity('Aprovou mídia', event?.title || eventId);
  notifyState();
  showToast('Mídia aprovada.', 'success');
};

export const rejectCommunityMedia = async (submissionId: string) => {
  if (!isEditor()) return;
  // BUG 2 PATTERN: RLS USING denial returns { error: null, data: [] } — verify rows affected.
  const { data, error } = await supabase
    .from('community_media_submissions')
    .delete()
    .eq('id', submissionId)
    .select('id');
  if (error || !data || data.length === 0) {
    showToast('Erro ao rejeitar mídia.', 'error');
    return;
  }
  const idx = PENDING_MEDIA_SUBMISSIONS.findIndex(s => s.id === submissionId);
  if (idx !== -1) {
    PENDING_MEDIA_SUBMISSIONS.splice(idx, 1);
    logActivity('Rejeitou mídia', submissionId);
    notifyState();
    showToast('Mídia rejeitada.', 'info');
  }
};
