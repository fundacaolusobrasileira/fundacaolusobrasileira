// services/media.service.ts
import { supabase } from '../supabaseClient';
import { logActivity, showToast } from '../store/app.store';
import { MediaUploadSchema } from '../validation/schemas';

// FIX: previous version used Date.now() which collided on parallel uploads
// in the same millisecond with the same source filename. crypto.randomUUID()
// guarantees uniqueness independently of timing.
const safeFileName = (originalName: string): string => {
  const sanitized = originalName.replace(/[^a-zA-Z0-9.]/g, '');
  return `${crypto.randomUUID()}-${sanitized}`;
};

export const saveMediaBlob = async (file: File): Promise<string> => {
  const fileName = safeFileName(file.name);
  const { error } = await supabase.storage.from('media').upload(fileName, file, { cacheControl: '3600', upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('media').getPublicUrl(fileName);
  logActivity('Upload mídia', fileName);
  return data.publicUrl;
};

// Upload a single file and return its public URL, or null on failure.
// Use this for cover image and card image uploads (not gallery).
export const uploadSingleImage = async (file: File): Promise<string | null> => {
  const parsed = MediaUploadSchema.safeParse(file);
  if (!parsed.success) {
    showToast(parsed.error.issues[0]?.message || 'Arquivo inválido.', 'error');
    return null;
  }
  try {
    return await saveMediaBlob(file);
  } catch (e: any) {
    showToast(`Erro no upload: ${e?.message || 'erro desconhecido'}`, 'error');
    return null;
  }
};

export async function resolveGalleryItemSrc(item: { url: string }): Promise<string | null> {
  return item.url || null;
}

// Upload para a pasta community/ — não requer autenticação (política RLS específica)
export const saveCommunityMediaBlob = async (file: File): Promise<string> => {
  const parsed = MediaUploadSchema.safeParse(file);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || 'Arquivo inválido.');
  }
  const fileName = `community/${safeFileName(file.name)}`;
  const { error } = await supabase.storage.from('media').upload(fileName, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('media').getPublicUrl(fileName);
  return data.publicUrl;
};

export const deleteMediaBlob = async (url: string): Promise<void> => {
  try {
    if (!url) return;
    const parsedUrl = new URL(url);
    const marker = '/storage/v1/object/public/media/';
    const path = parsedUrl.pathname.includes(marker)
      ? parsedUrl.pathname.split(marker)[1]
      : parsedUrl.pathname.replace(/^\/+/, '').split('/').slice(1).join('/');
    const fileName = path ? decodeURIComponent(path) : '';
    if (fileName) await supabase.storage.from('media').remove([fileName]);
  } catch (e) {
    console.error('Error deleting media', e);
  }
};
