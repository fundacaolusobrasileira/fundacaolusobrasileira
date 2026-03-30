// services/media.service.ts
import { supabase } from '../supabaseClient';
import { logActivity } from '../store/app.store';

export const saveMediaBlob = async (file: File): Promise<string> => {
  const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
  const { error } = await supabase.storage.from('media').upload(fileName, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('media').getPublicUrl(fileName);
  logActivity('Upload mídia', fileName);
  return data.publicUrl;
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
