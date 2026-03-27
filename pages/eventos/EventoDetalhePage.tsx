import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SectionWrapper, Card, Button, AccessDeniedModal, LoginModal, ConfirmDialog, PremiumLoader } from '../../components/ui';
import { Lightbox, AsyncImage, ShareActions, SocialIcons } from '../../component.ui';
import { EventDetailHeader, GallerySection } from '../../component.domain';
import { ExpandableText } from '../../components/ui/ExpandableText';
import { EventEditorModal } from '../../component.ui';
import { EVENTS, FLB_STATE_EVENT, isEditor, resolveGalleryItemSrc } from '../../store/app.store';
import { deleteEvent } from '../../services/events.service';
import { usePageMeta } from '../../hooks/usePageMeta';
import type { Event } from '../../types';
import { Camera, Upload, Image as ImageIcon, Edit, Trash2, ArrowLeft, Plus } from 'lucide-react';

export const EventoDetalhePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<Event | undefined>(undefined);
  const [filter, setFilter] = useState<'todos' | 'oficial' | 'comunidade'>('todos');
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Lightbox State
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [activeMediaSet, setActiveMediaSet] = useState<any[]>([]);

  useEffect(() => {
    window.scrollTo(0, 0);
    setTimeout(() => {
      const found = EVENTS.find(e => e.id === id);
      setEvent(found);
      setLoading(false);
    }, 600);

    const handleUpdate = () => {
        const found = EVENTS.find((e: any) => e.id === id);
        if(!found) {
            // If event was deleted, it might be handled by navigation, or simply stay undefined
        } else {
            setEvent({...found});
        }
    };
    window.addEventListener(FLB_STATE_EVENT, handleUpdate);
    return () => window.removeEventListener(FLB_STATE_EVENT, handleUpdate);
  }, [id]);

  usePageMeta(
    event ? `Evento: ${event.title}` : "Evento nao encontrado",
    event ? `Veja detalhes, fotos e videos do evento ${event.title} da Fundacao Luso-Brasileira.` : ""
  );

  const handleDeleteClick = () => {
      if (!isEditor()) {
          setShowAccessDenied(true);
          return;
      }
      setIsDeleting(true);
  };

  const handleEditClick = () => {
      if (!isEditor()) {
          setShowAccessDenied(true);
          return;
      }
      setIsEditModalOpen(true);
  };

  const confirmDelete = () => {
      if (id) {
          deleteEvent(id);
          setIsDeleting(false); // Close dialog first
          navigate('/eventos', { replace: true });
      }
  };

  const openLightbox = async (index: number, source: 'gallery' | 'media') => {
      let items: any[] = [];

      if (source === 'gallery' && event?.gallery) {
          // Resolve all items to be viewable
          const resolvedItems = await Promise.all(event.gallery.map(async (item) => {
              const src = await resolveGalleryItemSrc(item);
              return {
                  ...item,
                  src: src || '',
                  source: 'oficial',
                  type: 'image'
              };
          }));
          items = resolvedItems.filter(i => i.src);
      } else if (source === 'media' && event?.media) {
          // Legacy/Community media already has 'url'
          items = event.media.map((m: any) => ({
             ...m,
             src: m.url, // Map to standard 'src' expected by Lightbox
          }));
      }

      setActiveMediaSet(items);
      setLightboxIndex(index);
      setLightboxOpen(true);
  };

  const galleryItems = event?.gallery || [];
  const displayGallery = galleryItems.slice(0, 6);
  const remainingGallery = Math.max(0, galleryItems.length - 6);

  if (loading) {
    return <PremiumLoader />;
  }

  if (!event) {
     return (
        <div className="min-h-screen bg-page flex items-center justify-center">
           <Card className="p-12 text-center max-w-lg border border-slate-200">
              <h2 className="text-3xl font-light text-slate-900 mb-4">Evento nao encontrado</h2>
              <Button onClick={() => navigate('/eventos')} className="gap-2"><ArrowLeft size={16}/> Voltar para Agenda</Button>
           </Card>
        </div>
     );
  }

  return (
    <div className="min-h-screen bg-page pb-32">
      <EventDetailHeader event={event} />

      <SectionWrapper className="pt-16 md:pt-24">
        {/* Actions Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 animate-fadeInUpSlow">
            <div className="flex items-center gap-6">
                <ShareActions title={event.title} url={window.location.href} />
                {event.socialLinks && Object.values(event.socialLinks).some(Boolean) && (
                    <SocialIcons links={event.socialLinks} variant="white" size="sm" />
                )}
            </div>

            {isEditor() && (
                <div className="flex gap-2">
                    <Button onClick={handleEditClick} className="gap-2 text-xs py-3 h-auto">
                        <Edit size={14} /> Editar
                    </Button>
                    <Button onClick={handleDeleteClick} variant="white" className="gap-2 text-xs py-3 h-auto text-red-500 hover:text-red-600">
                        <Trash2 size={14} /> Excluir
                    </Button>
                </div>
            )}
        </div>

        <div className="grid lg:grid-cols-12 gap-12">
           <div className="lg:col-span-4 animate-fadeInUpSlow delay-100">
              <div className="sticky top-32">
                 <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                    <span className="w-8 h-px bg-sand-400"></span> Sobre o Evento
                 </h3>
                 <p className="text-xl text-slate-600 font-light leading-relaxed mb-12 text-justify font-serif">
                    {event.description}
                 </p>

                 <div className="hidden lg:block bg-white p-8 rounded-[2.5rem] shadow-premium border border-slate-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-sand-400/20 to-transparent rounded-bl-[4rem]"></div>
                    <div className="w-14 h-14 bg-sand-50 rounded-2xl flex items-center justify-center text-sand-600 mb-6 relative z-10 group-hover:scale-110 transition-transform duration-500">
                       <Camera size={28} />
                    </div>
                    <h3 className="text-lg font-medium text-brand-900 mb-2 relative z-10">Esteve presente?</h3>
                    <p className="text-slate-500 font-light text-sm mb-8 relative z-10">Contribua com o acervo digital enviando seus registros para a comunidade.</p>
                    <Button onClick={() => navigate(`/eventos/${id}/colaborar`)} className="w-full relative z-10 text-xs">
                       Adicionar Memoria
                    </Button>
                 </div>
              </div>
           </div>

           <div className="lg:col-span-8 animate-fadeInUpSlow delay-200">

              {/* Objective */}
              {(event as any).objective && (
                <div className="mb-10">
                  <h2 className="text-[10px] font-bold uppercase tracking-widest text-sand-500 mb-4 flex items-center gap-2">
                    <span className="w-4 h-px bg-sand-400"></span> Objetivo
                  </h2>
                  <ExpandableText
                    summary={(event as any).objective.length > 200 ? (event as any).objective.slice(0, 200) + '...' : (event as any).objective}
                    full={(event as any).objective.length > 200 ? (event as any).objective : undefined}
                    textClassName="text-base text-slate-600 font-light leading-relaxed"
                  />
                </div>
              )}
              {/* Experience */}
              {(event as any).experience && (
                <div className="mb-10">
                  <h2 className="text-[10px] font-bold uppercase tracking-widest text-sand-500 mb-4 flex items-center gap-2">
                    <span className="w-4 h-px bg-sand-400"></span> Experiencia
                  </h2>
                  <ExpandableText
                    summary={(event as any).experience.length > 200 ? (event as any).experience.slice(0, 200) + '...' : (event as any).experience}
                    full={(event as any).experience.length > 200 ? (event as any).experience : undefined}
                    textClassName="text-base text-slate-600 font-light leading-relaxed"
                  />
                </div>
              )}
              {/* Sponsors */}
              {(event as any).sponsors && (
                <div className="mb-10">
                  <h2 className="text-[10px] font-bold uppercase tracking-widest text-sand-500 mb-4 flex items-center gap-2">
                    <span className="w-4 h-px bg-sand-400"></span> Patrocinadores
                  </h2>
                  <p className="text-base text-slate-600 font-light leading-relaxed">{(event as any).sponsors}</p>
                </div>
              )}
              {/* Gallery placeholder */}
              <div className="mt-12 p-8 border border-dashed border-slate-200 rounded-2xl text-center">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Galeria de imagens - Em breve</p>
              </div>

              {/* OFFICIAL GALLERY SECTION */}
              <div className="mb-20 mt-12">
                  <div className="flex items-center justify-between mb-8">
                     <h2 className="text-3xl font-light text-brand-900 flex items-center gap-3">
                        Acervo Oficial
                     </h2>
                  </div>

                  {galleryItems.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {displayGallery.map((item, idx) => (
                              <div
                                key={item.id}
                                onClick={() => openLightbox(idx, 'gallery')}
                                className="relative aspect-square rounded-2xl overflow-hidden cursor-pointer group shadow-sm hover:shadow-lg transition-all"
                              >
                                  {/* Use AsyncImage to display resolved blob or url */}
                                  <AsyncImage
                                    item={item}
                                    className="w-full h-full object-cover grayscale-[10%] group-hover:grayscale-0 transition-all duration-700"
                                  />
                                  <div className="absolute inset-0 bg-brand-900/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                  {/* Overlay for last item if more exist */}
                                  {idx === 5 && remainingGallery > 0 && (
                                      <div className="absolute inset-0 bg-brand-900/80 flex items-center justify-center backdrop-blur-sm">
                                          <span className="text-white font-light text-xl">+{remainingGallery}</span>
                                      </div>
                                  )}
                              </div>
                          ))}
                      </div>
                  ) : (
                      <div className="bg-white border border-dashed border-slate-200 rounded-[2rem] p-12 text-center">
                          <ImageIcon className="mx-auto text-slate-300 mb-4" size={32} />
                          <p className="text-slate-500 font-light mb-6">A galeria oficial deste evento ainda nao foi publicada.</p>
                          {isEditor() && (
                              <Button onClick={handleEditClick} variant="outline" className="text-xs">
                                  <Plus size={14} className="mr-2"/> Adicionar Imagens
                              </Button>
                          )}
                      </div>
                  )}
              </div>

              {/* COMMUNITY GALLERY (Keep existing structure, passing filtered media) */}
              {event.media && event.media.length > 0 && (
                  <div className="border-t border-slate-100 pt-20">
                    <GallerySection
                        mediaList={event.media || []}
                        filter={filter}
                        onFilterChange={(f: any) => setFilter(f)}
                        onMediaClick={(idx: number) => {
                            // Find the global index in mediaList
                            const filtered = (event.media || []).filter((m: any) => filter === 'todos' ? true : m.source === filter);
                            // Need to resolve for lightbox
                            openLightbox(idx, 'media');
                        }}
                        emptyStateSlot={<></>}
                    />
                  </div>
              )}
           </div>
        </div>
      </SectionWrapper>

      <div className="lg:hidden fixed bottom-6 left-0 w-full px-6 z-40 flex justify-center pointer-events-none">
         <button
            onClick={() => navigate(`/eventos/${id}/colaborar`)}
            className="pointer-events-auto bg-brand-900 text-white px-8 py-4 rounded-full shadow-premium flex items-center gap-3 text-xs font-bold uppercase tracking-wider hover:scale-105 active:scale-95 transition-all border border-white/10 backdrop-blur-md"
         >
            <Upload size={16} /> Adicionar Memoria
         </button>
      </div>

      <Lightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        media={activeMediaSet}
        currentIndex={lightboxIndex}
        onNext={() => setLightboxIndex((prev) => (prev + 1) % activeMediaSet.length)}
        onPrev={() => setLightboxIndex((prev) => (prev - 1 + activeMediaSet.length) % activeMediaSet.length)}
      />

      <AccessDeniedModal isOpen={showAccessDenied} onClose={() => setShowAccessDenied(false)} onLogin={() => setShowLogin(true)} />
      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
      <ConfirmDialog
        isOpen={isDeleting}
        title="Confirmar exclusao"
        description="Esta acao e permanente e nao pode ser desfeita."
        confirmLabel="Excluir definitivamente"
        onConfirm={confirmDelete}
        onCancel={() => setIsDeleting(false)}
      />

      {/* CANONICAL MODAL */}
      <EventEditorModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} event={event} />
    </div>
  );
};
