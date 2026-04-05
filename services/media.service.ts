// services/media.service.ts
import { supabase } from '../supabaseClient';
import { logActivity, showToast } from '../store/app.store';

export const saveMediaBlob = async (file: File): Promise<string> => {
  const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
  const { error } = await supabase.storage.from('media').upload(fileName, file, { cacheControl: '3600', upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('media').getPublicUrl(fileName);
  logActivity('Upload mídia', fileName);
  return data.publicUrl;
};

// Upload a single file and return its public URL, or null on failure.
// Use this for cover image and card image uploads (not gallery).
export const uploadSingleImage = async (file: File): Promise<string | null> => {
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

export const deleteMediaBlob = async (url: string): Promise<void> => {
  try {
    const fileName = url.split('/').pop();
    if (fileName) await supabase.storage.from('media').remove([fileName]);
  } catch (e) {
    console.error('Error deleting media', e);
  }
};
