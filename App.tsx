import React, { useEffect, useState } from 'react';
import { HashRouter } from 'react-router-dom';
import { 
  BookOpen,
  Landmark,
  Cpu,
  Palette
} from 'lucide-react';
import {
  Header,
  Footer,
  SmartInviteModal
} from './components/domain';
import { ToastContainer } from './components/ui';
import { AppRouter } from './router';
import { supabase } from './supabaseClient';
import { syncMembers } from './services/members.service';
import { syncEvents } from './services/events.service';
import { setAuthSession } from './store/app.store';
import { MEMBERS_SEED } from './data/members.data';

/**
 * ------------------------------------------------------------------
 * UTILS
 * ------------------------------------------------------------------
 */

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// --- GLOBAL FEEDBACK HOOK ---
export const useFeedback = () => {
  return {
    showSuccess: (message: string) => showToast(message, 'success'),
    showError: (message: string) => showToast(message, 'error'),
    showInfo: (message: string) => showToast(message, 'info'),
    showWarning: (message: string) => showToast(message, 'warning'),
  };
};

/**
 * ------------------------------------------------------------------
 * 1. TYPES & CONSTANTS
 * ------------------------------------------------------------------
 */

export type Pillar = {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
};

export interface SocialLinks {
  youtube?: string;
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
}

export type PartnerType = 'pessoa' | 'empresa';

export type Partner = {
  id: string;
  name: string;
  type: PartnerType; // 'pessoa' para membros do conselho, 'empresa' para instituições
  category: 'Parceiro Platinum' | 'Parceiro Gold' | 'Parceiro Silver' | 'Apoio Público' | 'Outro Apoio' | 'Exposição' | 'Governança';
  image: string;
  role?: string;
  country?: string;
  bio?: string;
  website?: string;
  socialLinks?: SocialLinks;
  avatar?: string;
  tags?: string[];
  since?: string;
  active?: boolean;
  featured?: boolean;
  order?: number;
};

export type Space = {
  id: string;
  name: string;
  location: string;
  description: string;
  image: string;
};

export type EventCategory = '33 Anos' | 'Fundação' | 'Embaixada' | 'Outros';

// --- NEW MEDIA TYPES ---
export type MediaSource = 'oficial' | 'comunidade';
export type MediaStatus = 'published' | 'pending' | 'rejected';

export interface GalleryItem {
  id: string;
  kind: 'image' | 'video'; 
  srcType: 'url'; // Simplified to just URL for Supabase
  url: string;      
  caption?: string;
  authorName?: string; // For community submissions
  email?: string; // For community submissions
  source: MediaSource;
  status: MediaStatus;
  createdAt: string;
  order: number;
}

export interface PreCadastro {
  id: string;
  name: string;
  email: string;
  type: string; // 'individual' | 'empresarial' | 'academico' | 'newsletter'
  message?: string;
  status: 'novo' | 'contatado' | 'aprovado' | 'rejeitado' | 'convertido';
  createdAt: string;
  notes?: string;
}

export interface EventLinks {
  registration?: string;
  website?: string;
}

export type Event = {
  id: string;
  title: string;
  subtitle?: string;
  
  // Date & Time
  date: string;
  time?: string;
  endDate?: string;
  endTime?: string;

  // Location
  location: string;
  address?: string;
  city?: string;
  country?: string;

  // Content
  category: EventCategory;
  descriptionShort?: string;
  description: string;
  tags?: string[];

  // Media
  image: string; // Main display image
  coverImage?: string;
  gallery: GalleryItem[];
  media?: any[]; // Legacy support

  // Meta
  links?: EventLinks;
  socialLinks?: SocialLinks;
  status: "draft" | "published";
  featured: boolean;
  notes?: string;
};

export type PendingMediaSubmission = {
  id: string;
  eventId: string;
  type: 'image' | 'video';
  url: string;
  authorName: string;
  email: string;
  message?: string;
  createdAt: string;
};

// --- AUTH TYPES ---
export type AuthSession = {
  isLoggedIn: boolean;
  role: 'editor' | 'viewer';
  displayName?: string;
  lastLoginAt?: string;
  userId?: string;
};

export type ActivityLogItem = {
  id: string;
  action: string;
  target: string;
  timestamp: string;
  user?: string;
};

export const PILLARS: Pillar[] = [
  {
    id: 'p1',
    title: 'Cultural',
    description: 'Promoção de eventos, encontros e iniciativas que celebram a cultura lusófona e o intercâmbio entre artistas, instituições e comunidades.',
    icon: Palette
  },
  {
    id: 'p2',
    title: 'Educativo',
    description: 'Apoio a programas educacionais, intercâmbios acadêmicos e projetos que ampliem conhecimento e cooperação entre universidades.',
    icon: BookOpen
  },
  {
    id: 'p3',
    title: 'Tecnológico',
    description: 'Fomento a parcerias e projetos tecnológicos que incentivem a inovação bilateral entre Portugal e Brasil.',
    icon: Cpu
  },
  {
    id: 'p4',
    title: 'Patrimonial',
    description: 'Apoio à preservação de patrimônios históricos e memória cultural que ligam os dois países.',
    icon: Landmark
  }
];

export const SPACES: Space[] = [
  { 
    id: 'sp1', 
    name: 'Auditório Vieira de Almeida', 
    location: 'Lisboa, Sede', 
    description: 'Espaço moderno para conferências com capacidade para 200 pessoas.',
    image: 'https://picsum.photos/800/600?random=10'
  },
];

/**
 * ------------------------------------------------------------------
 * 2. STORAGE (SUPABASE BUCKET)
 * ------------------------------------------------------------------
 */

export const saveMediaBlob = async (file: File): Promise<string> => {
  const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
  const { data, error } = await supabase.storage
    .from('media')
    .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
    });

  if (error) {
      console.error("Upload error:", error);
      throw error;
  }

  // Get Public URL
  const { data: publicUrlData } = supabase.storage
    .from('media')
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
};

export const deleteMediaBlob = async (url: string): Promise<void> => {
  try {
      const fileName = url.split('/').pop();
      if(fileName) {
          await supabase.storage.from('media').remove([fileName]);
      }
  } catch (e) {
    console.error("Error deleting media", e);
  }
};

/**
 * ------------------------------------------------------------------
 * 3. STATE LOGIC (SUPABASE & REACTIVE)
 * ------------------------------------------------------------------
 */

export const FLB_STATE_EVENT = 'flb_state_update';
export const FLB_TOAST_EVENT = 'flb_toast_event';

// Mutable exports (Synchronized with Supabase)
export const EVENTS: Event[] = [];
export const PARTNERS: Partner[] = [];
export const PRECADASTROS: PreCadastro[] = [];
export const PENDING_MEDIA_SUBMISSIONS: PendingMediaSubmission[] = []; 
export const ACTIVITY_LOG: ActivityLogItem[] = [];

// Auth Session Default
export let AUTH_SESSION: AuthSession = { isLoggedIn: false, role: 'viewer' };

const notifyState = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(FLB_STATE_EVENT));
  }
};

export const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(FLB_TOAST_EVENT, { detail: { message, type } }));
  }
};

export const generateId = (prefix: string) => {
    // Note: Supabase generates UUIDs, this is used for optimistic UI or temp IDs
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}`;
};

export const logActivity = (action: string, target: string) => {
    const item: ActivityLogItem = {
        id: generateId('log'),
        action,
        target,
        timestamp: new Date().toISOString(),
        user: AUTH_SESSION.displayName || 'Editor'
    };
    ACTIVITY_LOG.unshift(item);
    if (ACTIVITY_LOG.length > 50) ACTIVITY_LOG.pop();
    // In a real app, log to a table in Supabase
};

export const generateTestActivity = () => {
    logActivity('Teste', 'Sistema Conectado');
    notifyState();
    showToast('Supabase conectado!', 'info');
};

// --- DATA SYNC ---

const syncFromSupabase = async () => {
    // 1. Fetch Partners
    const { data: partners, error: pError } = await supabase.from('partners').select('*').order('created_at', { ascending: false });
    if (partners && !pError) {
        PARTNERS.length = 0;
        const normalized = partners.map((p: any) => ({
            ...p,
            type: p.type || (p.category === 'Governança' ? 'pessoa' : 'empresa'), // Default type based on category
            socialLinks: p.social_links || {} // Snake_case mapping
        }));
        PARTNERS.push(...normalized);
    }

    // 2. Fetch Events
    const { data: events, error: eError } = await supabase.from('events').select('*').order('created_at', { ascending: false });
    if (events && !eError) {
        EVENTS.length = 0;
        const normalized = events.map((e: any) => ({
            ...e,
            coverImage: e.cover_image, // Snake_case mapping
            socialLinks: e.social_links || {},
            gallery: typeof e.gallery === 'string' ? JSON.parse(e.gallery) : (e.gallery || [])
        }));
        EVENTS.push(...normalized);
    }

    // 3. Fetch PreCadastros (Only if logged in ideally, but fetching public for now to populate struct)
    // Note: In real RLS, this would fail for anon users, handled gracefully
    if (AUTH_SESSION.isLoggedIn) {
        const { data: pres } = await supabase.from('precadastros').select('*');
        if (pres) {
            PRECADASTROS.length = 0;
            PRECADASTROS.push(...pres);
        }
    }

    notifyState();
};

export const exportState = () => {
    showToast('Exportação desativada no modo Supabase.', 'info');
};

export const importState = (jsonString: string): { success: boolean, message: string } => {
    return { success: false, message: "Importação desativada no modo Supabase." };
};

// --- AUTH OPERATIONS ---

export const isEditor = () => AUTH_SESSION.isLoggedIn && AUTH_SESSION.role === 'editor';

export const loginAsEditor = async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    if (!email || !password) {
        return { ok: false, error: 'Email e senha são obrigatórios.' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        if (error.message === 'Invalid login credentials') {
            return { ok: false, error: 'Email ou senha incorretos.' };
        }
        if (error.message === 'Email not confirmed') {
            return { ok: false, error: 'Email não confirmado. Verifique sua caixa de entrada.' };
        }
        return { ok: false, error: error.message };
    }

    if (data.session) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', data.user.id)
            .single();

        const userRole = (profile?.role === 'editor' || profile?.role === 'admin') ? 'editor' : 'viewer';

        AUTH_SESSION = {
            isLoggedIn: true,
            role: userRole,
            displayName: data.user.email || 'Editor',
            userId: data.user.id,
            lastLoginAt: new Date().toISOString()
        };
        setAuthSession(AUTH_SESSION);
        syncFromSupabase();
        notifyState();
        showToast(`Bem-vindo, ${data.user.email}!`, 'success');
        return { ok: true };
    }

    return { ok: false, error: 'Falha no login.' };
};

export const logout = async () => {
    await supabase.auth.signOut();
    AUTH_SESSION = { isLoggedIn: false, role: 'viewer' };
    syncFromSupabase(); // Reset view to public RLS
    notifyState();
    showToast('Sessão encerrada.', 'info');
};

export const signUp = async (email: string, password: string, name: string, type: string): Promise<{ ok: boolean; error?: string }> => {
    if (!email || !password || !name) {
        return { ok: false, error: 'Todos os campos são obrigatórios.' };
    }

    if (password.length < 6) {
        return { ok: false, error: 'A senha deve ter pelo menos 6 caracteres.' };
    }

    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                name: name,
                type: type
            }
        }
    });

    if (error) {
        if (error.message.includes('already registered')) {
            return { ok: false, error: 'Este email já está cadastrado.' };
        }
        return { ok: false, error: error.message };
    }

    if (data.user) {
        // Criar perfil na tabela profiles
        await supabase.from('profiles').insert({
            user_id: data.user.id,
            name: name,
            email: email,
            type: type,
            role: 'membro'
        });

        showToast('Conta criada com sucesso! Verifique seu email para confirmar.', 'success');
        return { ok: true };
    }

    return { ok: false, error: 'Erro ao criar conta.' };
};

// --- CRUD OPERATIONS (SUPABASE) ---

// PreCadastro CRUD
export const createPreCadastro = async (data: Partial<PreCadastro>) => {
    const payload = {
        name: data.name,
        email: data.email,
        type: data.type || 'individual',
        registrationType: data.registrationType || null,
        message: data.message,
        status: 'novo'
    };

    // For public forms, don't use .select() since anon can't read back
    const { error } = await supabase.from('precadastros').insert([payload]);

    if (!error) {
        // Add to local state for editors only
        if (isEditor()) {
            const tempEntry = {
                ...payload,
                id: generateId('pre'),
                createdAt: new Date().toISOString()
            } as PreCadastro;
            PRECADASTROS.unshift(tempEntry);
            notifyState();
        }
        showToast('Enviado com sucesso!', 'success');
        return { success: true };
    } else {
        console.error(error);
        showToast('Erro ao enviar.', 'error');
        return null;
    }
};

export const subscribeToNewsletter = (email: string) => {
    return createPreCadastro({
        name: 'Newsletter',
        email: email,
        type: 'newsletter',
        message: 'Inscrição via Site'
    });
};

export const updatePreCadastro = async (id: string, patch: Partial<PreCadastro>) => {
    if (!isEditor()) return;
    
    const { error } = await supabase.from('precadastros').update(patch).eq('id', id);
    
    if (!error) {
        const idx = PRECADASTROS.findIndex(p => p.id === id);
        if (idx !== -1) {
            PRECADASTROS[idx] = { ...PRECADASTROS[idx], ...patch };
            notifyState();
            showToast('Atualizado.', 'success');
        }
    }
};

export const deletePreCadastro = async (id: string) => {
    if (!isEditor()) return;
    const { error } = await supabase.from('precadastros').delete().eq('id', id);
    if(!error) {
        const idx = PRECADASTROS.findIndex(p => p.id === id);
        if (idx !== -1) {
            PRECADASTROS.splice(idx, 1);
            notifyState();
            showToast('Removido.', 'success');
        }
    }
};

export const convertPreCadastroToMember = (id: string) => {
    if (!isEditor()) return null;
    const pre = PRECADASTROS.find(p => p.id === id);
    if (pre) {
        // This is complex because creating a member is async.
        // Simplified flow:
        createMember(false).then(async (newMember) => {
            if(newMember) {
                await updateMember(newMember.id, {
                    name: pre.name,
                    category: pre.registrationType === 'parceiro' ? 'Parceiro Silver' : 'Outro Apoio',
                    bio: pre.message
                }, false);
                await updatePreCadastro(id, { status: 'convertido' });
                showToast('Convertido em membro com sucesso.', 'success');
            }
        });
    }
    return null;
};

// Events CRUD
export const createEvent = async (data: Partial<Event>) => {
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
    gallery: data.gallery,
    status: data.status || 'draft'
  };

  const { data: res, error } = await supabase.from('events').insert([payload]).select();

  if (!error && res) {
      const newEvent = res[0];
      // Normalize for local usage
      const normalized = {
          ...newEvent,
          coverImage: newEvent.cover_image,
          socialLinks: newEvent.social_links || {},
          gallery: newEvent.gallery || []
      };
      EVENTS.unshift(normalized);
      logActivity('Criou evento', normalized.title);
      notifyState();
      showToast('Evento criado.', 'success');
      return normalized;
  } else {
      console.error(error);
      showToast('Erro ao criar evento.', 'error');
      return null;
  }
};

export const updateEvent = async (id: string, patch: Partial<Event>, notify = true) => {
  if (!isEditor()) return;

  // Transform camelCase to snake_case for DB
  const payload: any = { ...patch };
  if('coverImage' in patch) { payload.cover_image = patch.coverImage; delete payload.coverImage; }
  if('socialLinks' in patch) { payload.social_links = patch.socialLinks; delete payload.socialLinks; }
  // Remove fields that shouldn't be updated
  delete payload.id;
  delete payload.created_at;
  delete payload.updated_at;

  // Local Optimistic Update
  const idx = EVENTS.findIndex(e => e.id === id);
  if (idx !== -1) {
      EVENTS[idx] = { ...EVENTS[idx], ...patch };
      notifyState();
  }

  const { error } = await supabase.from('events').update(payload).eq('id', id);

  if (!error) {
    if(notify) showToast('Evento salvo.', 'success');
  } else {
    console.error('updateEvent error:', error);
    showToast('Erro ao salvar.', 'error');
  }
};

export const deleteEvent = async (id: string) => {
  if (!isEditor()) return;
  const { error } = await supabase.from('events').delete().eq('id', id);
  
  if (!error) {
      const idx = EVENTS.findIndex(e => e.id === id);
      if (idx !== -1) {
        EVENTS.splice(idx, 1);
        notifyState();
        showToast('Evento removido.', 'success');
      }
  }
};

// Members CRUD
export const createMember = async (notify = true) => {
  if (!isEditor()) return null;

  const payload = {
      name: 'Novo Membro',
      type: 'pessoa',
      category: 'Parceiro',
      active: true
  };

  const { data: res, error } = await supabase.from('partners').insert([payload]).select();

  if (!error && res) {
      const newMember = res[0];
      const normalized = {
          ...newMember,
          type: newMember.type || 'pessoa',
          socialLinks: newMember.social_links || {}
      };
      PARTNERS.unshift(normalized);
      notifyState();
      if(notify) showToast('Membro criado.', 'success');
      return normalized;
  }
  return null;
};

export const updateMember = async (id: string, patch: Partial<Partner>, notify = true) => {
  if (!isEditor()) return;

  const payload: any = { ...patch };
  if(patch.socialLinks) { payload.social_links = patch.socialLinks; delete payload.socialLinks; }

  const idx = PARTNERS.findIndex(p => p.id === id);
  if (idx !== -1) {
      PARTNERS[idx] = { ...PARTNERS[idx], ...patch };
      notifyState();
  }

  const { error } = await supabase.from('partners').update(payload).eq('id', id);
  if(!error && notify) showToast('Membro atualizado.', 'success');
};

export const deleteMember = async (id: string) => {
  if (!isEditor()) return;
  const { error } = await supabase.from('partners').delete().eq('id', id);
  if (!error) {
      const idx = PARTNERS.findIndex(p => p.id === id);
      if (idx !== -1) {
          PARTNERS.splice(idx, 1);
          notifyState();
          showToast('Membro removido.', 'success');
      }
  }
};

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const searchFoundation = (query: string) => {
  const q = normalize(query);
  if (!q) return { partners: [], events: [], spaces: [], members: [] };
  return {
    partners: PARTNERS.filter(p => normalize(p.name).includes(q) || normalize(p.category).includes(q)),
    events: EVENTS.filter(e => normalize(e.title).includes(q) || normalize(e.description).includes(q)),
    spaces: SPACES.filter(s => normalize(s.name).includes(q) || normalize(s.location).includes(q)),
    members: MEMBERS_SEED.filter(m =>
      normalize(m.name).includes(q) ||
      normalize(m.role).includes(q) ||
      normalize(m.tier).includes(q)
    ),
  };
};

// Unified Media Helpers
export const addMediaToEvent = async (eventId: string, file: File) => {
    if (!isEditor()) return;
    try {
        const publicUrl = await saveMediaBlob(file);
        const event = EVENTS.find(e => e.id === eventId);
        if (event) {
            const newItem: GalleryItem = {
                id: generateId('media'),
                kind: file.type.startsWith('video') ? 'video' : 'image',
                srcType: 'url',
                url: publicUrl,
                source: 'oficial',
                status: 'published',
                createdAt: new Date().toISOString(),
                order: (event.gallery?.length || 0)
            };
            const newGallery = [...(event.gallery || []), newItem];
            await updateEvent(eventId, { gallery: newGallery }, false);
            showToast('Imagem enviada.', 'success');
        }
    } catch (e) {
        console.error("Failed to add media", e);
        showToast('Erro no upload.', 'error');
    }
};

export const addUrlMediaToEvent = (eventId: string, url: string) => {
    if (!isEditor()) return;
    const event = EVENTS.find(e => e.id === eventId);
    if (event) {
        const newItem: GalleryItem = {
            id: generateId('media'),
            kind: 'image',
            srcType: 'url',
            url: url,
            source: 'oficial',
            status: 'published',
            createdAt: new Date().toISOString(),
            order: (event.gallery?.length || 0)
        };
        updateEvent(eventId, { gallery: [...(event.gallery || []), newItem] });
    }
};

export const addEventImagesFromFiles = async (eventId: string, files: FileList | File[]) => {
    const fileList = files instanceof FileList ? Array.from(files) : files;
    let count = 0;
    for (const file of fileList) {
        await addMediaToEvent(eventId, file);
        count++;
    }
    if(count > 0) showToast(`${count} arquivos processados.`, 'success');
};

export async function resolveGalleryItemSrc(item: GalleryItem): Promise<string | null> {
  // Now simpler, always URL
  return item.url || null;
}

// Legacy Compat Helpers
export const submitCommunityMedia = async (submission: Omit<PendingMediaSubmission, 'id' | 'createdAt'>) => {
  // If it's a URL from Blob (IDB) we need to upload it to Supabase first if possible, 
  // but for now let's assume valid URL or handle blob separately in the component.
  // In a real migration, we'd change the UI to upload directly to Supabase storage.
  
  const newSubmission: PendingMediaSubmission = {
    ...submission,
    id: generateId('sub'),
    createdAt: new Date().toISOString()
  };
  PENDING_MEDIA_SUBMISSIONS.push(newSubmission);
  notifyState();
  return newSubmission;
};

export const approveCommunityMedia = (submissionId: string) => {
  if (!isEditor()) return;
  const index = PENDING_MEDIA_SUBMISSIONS.findIndex(s => s.id === submissionId);
  if (index === -1) return;
  const sub = PENDING_MEDIA_SUBMISSIONS[index];
  const event = EVENTS.find(e => e.id === sub.eventId);
  if (event) {
      const newItem: GalleryItem = {
          id: generateId('media'),
          kind: sub.type,
          srcType: 'url',
          url: sub.url,
          source: 'comunidade',
          status: 'published',
          authorName: sub.authorName,
          email: sub.email,
          createdAt: new Date().toISOString(),
          order: (event.gallery?.length || 0)
      };
      updateEvent(event.id, { gallery: [...(event.gallery || []), newItem] }, false);
  }
  PENDING_MEDIA_SUBMISSIONS.splice(index, 1);
  notifyState();
  showToast('Aprovado.', 'success');
};

export const rejectCommunityMedia = (submissionId: string) => {
  if (!isEditor()) return;
  const index = PENDING_MEDIA_SUBMISSIONS.findIndex(s => s.id === submissionId);
  if (index !== -1) {
    PENDING_MEDIA_SUBMISSIONS.splice(index, 1);
    notifyState();
    showToast('Rejeitado.', 'info');
  }
};

export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    document.title = title;
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', description);
  }, [title, description]);
}

// Initial Load
syncFromSupabase();
syncMembers();
syncEvents();

// Restaurar sessão ao carregar
const initAuth = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    const userRole = (profile?.role === 'editor' || profile?.role === 'admin') ? 'editor' : 'viewer';

    AUTH_SESSION = {
      isLoggedIn: true,
      role: userRole,
      displayName: session.user.email || 'Editor',
      userId: session.user.id,
      lastLoginAt: new Date().toISOString()
    };
    setAuthSession(AUTH_SESSION);
    syncFromSupabase();
    syncMembers();
    syncEvents();
    notifyState();
  }
};
initAuth();

// Listener para mudanças de autenticação
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session?.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    const userRole = (profile?.role === 'editor' || profile?.role === 'admin') ? 'editor' : 'viewer';

    AUTH_SESSION = {
      isLoggedIn: true,
      role: userRole,
      displayName: session.user.email || 'Editor',
      userId: session.user.id,
      lastLoginAt: new Date().toISOString()
    };
    setAuthSession(AUTH_SESSION);
    syncFromSupabase();
    syncMembers();
    syncEvents();
    notifyState();
  } else if (event === 'SIGNED_OUT') {
    AUTH_SESSION = { isLoggedIn: false, role: 'viewer' };
    setAuthSession(AUTH_SESSION);
    syncFromSupabase();
    syncMembers();
    syncEvents();
    notifyState();
  }
});

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
