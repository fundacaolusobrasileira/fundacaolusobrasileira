// services/events.service.ts
import { supabase } from '../supabaseClient';
import { EVENTS, PENDING_MEDIA_SUBMISSIONS, notifyState, showToast, logActivity, isEditor, generateId } from '../store/app.store';
import type { Event, GalleryItem } from '../types';

const normalizeEvent = (e: any): Event => {
  const normalized: any = { ...e };
  // snake_case → camelCase
  normalized.coverImage = e.cover_image;
  normalized.socialLinks = e.social_links || {};
  normalized.descriptionShort = e.description_short;
  normalized.endDate = e.end_date;
  normalized.endTime = e.end_time;
  normalized.cardImage = e.card_image;
  normalized.gallery = typeof e.gallery === 'string' ? JSON.parse(e.gallery) : (e.gallery || []);
  // Remove snake_case duplicates
  delete normalized.cover_image;
  delete normalized.social_links;
  delete normalized.description_short;
  delete normalized.end_date;
  delete normalized.end_time;
  delete normalized.card_image;
  return normalized;
};

export const syncEvents = async () => {
  const { data, error } = await supabase.from('events').select('*').order('created_at', { ascending: false });
  if (error || !data) return;
  EVENTS.length = 0;
  EVENTS.push(...data.map(normalizeEvent));
  notifyState();
};

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

export const updateEvent = async (id: string, patch: Partial<Event>, notify = true) => {
  if (!isEditor()) return;
  const payload: any = { ...patch };
  // camelCase → snake_case for all mapped fields
  const mappings: [string, string][] = [
    ['coverImage', 'cover_image'],
    ['socialLinks', 'social_links'],
    ['descriptionShort', 'description_short'],
    ['endDate', 'end_date'],
    ['endTime', 'end_time'],
    ['cardImage', 'card_image'],
  ];
  for (const [camel, snake] of mappings) {
    if (camel in payload) { payload[snake] = payload[camel]; delete payload[camel]; }
  }
  delete payload.id; delete payload.created_at; delete payload.updated_at;
  const idx = EVENTS.findIndex(e => e.id === id);
  if (idx !== -1) { EVENTS[idx] = { ...EVENTS[idx], ...patch }; notifyState(); }
  const { error } = await supabase.from('events').update(payload).eq('id', id);
  if (!error) {
    if (notify) showToast('Evento salvo.', 'success');
    logActivity('Editou evento', EVENTS.find(e => e.id === id)?.title || id);
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

// Internal helper to add a gallery item to an event
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

// Upload a file and add it to the event gallery
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
  } catch (e) {
    console.error('Failed to add media', e);
    showToast('Erro no upload.', 'error');
  }
};

// Add a URL directly to the event gallery
export const addUrlMediaToEvent = (eventId: string, url: string) => {
  if (!isEditor()) return;
  addGalleryItem(eventId, {
    kind: 'image',
    srcType: 'url',
    url,
    source: 'oficial',
    status: 'published',
  });
};

// Upload multiple files to an event
export const addEventImagesFromFiles = async (eventId: string, files: FileList | File[]) => {
  const fileList = files instanceof FileList ? Array.from(files) : files;
  let count = 0;
  for (const file of fileList) {
    await addMediaToEvent(eventId, file);
    count++;
  }
  if (count > 0) showToast(`${count} arquivos processados.`, 'success');
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
