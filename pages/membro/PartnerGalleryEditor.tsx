import React, { useRef, useState } from 'react';
import { Upload, Trash2, Plus, Loader2, FolderOpen, X } from 'lucide-react';
import { saveMediaBlob } from '../../services/media.service';
import { generateId, showToast } from '../../store/app.store';
import type { GalleryItem, PartnerAlbum } from '../../types';

interface Props {
  gallery: GalleryItem[];
  albums: PartnerAlbum[];
  onChange: (gallery: GalleryItem[], albums: PartnerAlbum[]) => void;
}

export const PartnerGalleryEditor = ({ gallery, albums, onChange }: Props) => {
  const [uploading, setUploading] = useState(false);
  const [activeAlbum, setActiveAlbum] = useState<string | null>(null);
  const [newAlbumTitle, setNewAlbumTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const newItems: GalleryItem[] = [];
      for (const file of files) {
        const url = await saveMediaBlob(file);
        newItems.push({
          id: generateId(),
          kind: 'image',
          srcType: 'url',
          url,
          source: 'oficial',
          status: 'published',
          createdAt: new Date().toISOString(),
          order: gallery.length + newItems.length,
          ...(activeAlbum ? { album: activeAlbum } : {}),
        });
      }
      onChange([...gallery, ...newItems], albums);
    } catch (err: any) {
      showToast(`Erro no upload: ${err?.message || 'erro desconhecido'}`, 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteItem = (id: string) => {
    onChange(gallery.filter(g => g.id !== id), albums);
  };

  const handleCaptionChange = (id: string, caption: string) => {
    onChange(gallery.map(g => g.id === id ? { ...g, caption } : g), albums);
  };

  const handleCreateAlbum = () => {
    const title = newAlbumTitle.trim();
    if (!title) return;
    const album: PartnerAlbum = {
      id: generateId(),
      title,
      createdAt: new Date().toISOString(),
    };
    onChange(gallery, [...albums, album]);
    setNewAlbumTitle('');
  };

  const handleDeleteAlbum = (albumId: string) => {
    const updatedGallery = gallery.map(g => g.album === albumId ? { ...g, album: undefined } : g);
    onChange(updatedGallery, albums.filter(a => a.id !== albumId));
    if (activeAlbum === albumId) setActiveAlbum(null);
  };

  const visibleItems = activeAlbum
    ? gallery.filter(g => g.album === activeAlbum)
    : gallery;

  return (
    <div className="space-y-6">
      {/* Albums strip */}
      <div>
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-3 block">Álbuns</label>
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            onClick={() => setActiveAlbum(null)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeAlbum === null
                ? 'bg-brand-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas ({gallery.length})
          </button>
          {albums.map(album => (
            <div key={album.id} className="flex items-center gap-1">
              <button
                onClick={() => setActiveAlbum(album.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  activeAlbum === album.id
                    ? 'bg-brand-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <FolderOpen size={11} />
                {album.title} ({gallery.filter(g => g.album === album.id).length})
              </button>
              <button
                onClick={() => handleDeleteAlbum(album.id)}
                className="p-0.5 text-slate-300 hover:text-red-500 transition-colors"
                title="Apagar álbum"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newAlbumTitle}
            onChange={e => setNewAlbumTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreateAlbum()}
            placeholder="Nome do novo álbum..."
            className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-brand-700"
          />
          <button
            onClick={handleCreateAlbum}
            disabled={!newAlbumTitle.trim()}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-medium transition-colors disabled:opacity-40"
          >
            <Plus size={13} /> Criar
          </button>
        </div>
      </div>

      {/* Upload */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 text-sm font-medium text-slate-600 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <><Loader2 size={16} className="animate-spin" /> A carregar...</>
          ) : (
            <><Upload size={16} /> Adicionar fotos{activeAlbum ? ` ao álbum "${albums.find(a => a.id === activeAlbum)?.title}"` : ''}</>
          )}
        </button>
      </div>

      {/* Photo grid */}
      {visibleItems.length === 0 ? (
        <p className="text-center text-slate-400 text-sm py-8">Nenhuma foto. Faça upload acima.</p>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {visibleItems.map(item => (
            <div key={item.id} className="group relative rounded-xl overflow-hidden border border-slate-100">
              <img src={item.url} alt={item.caption || ''} className="w-full aspect-square object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                <input
                  type="text"
                  value={item.caption || ''}
                  onChange={e => handleCaptionChange(item.id, e.target.value)}
                  placeholder="Legenda..."
                  className="w-full text-[10px] bg-white/20 text-white placeholder-white/60 border border-white/30 rounded px-1.5 py-1 outline-none mb-1"
                  onClick={e => e.stopPropagation()}
                />
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="self-end p-1 rounded bg-red-500/80 hover:bg-red-600 text-white transition-colors"
                  title="Remover foto"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
