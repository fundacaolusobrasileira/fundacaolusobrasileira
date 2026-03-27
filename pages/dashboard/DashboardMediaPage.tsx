import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { SectionWrapper, Card, Button } from '../../components/ui';
import { MediaCurationCard } from '../../component.domain';
import { EVENTS, PENDING_MEDIA_SUBMISSIONS, FLB_STATE_EVENT } from '../../store/app.store';
import { approveCommunityMedia, rejectCommunityMedia } from '../../services/events.service';
import { usePageMeta } from '../../hooks/usePageMeta';
import type { Event } from '../../types';
import { ArrowLeft, Check, AlertCircle, Eye, FolderOpen } from 'lucide-react';

export const DashboardEventosPage = () => {
  usePageMeta("Gestao de Midia – Dashboard", "Gerencie os albuns e submissoes da comunidade.");
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const handleStateUpdate = () => setTick(t => t + 1);
    window.addEventListener(FLB_STATE_EVENT, handleStateUpdate);
    return () => window.removeEventListener(FLB_STATE_EVENT, handleStateUpdate);
  }, []);

  return (
    <div className="pt-32 pb-20 bg-[#F8F9FB] min-h-screen">
      <SectionWrapper className="py-0 md:py-0 px-4">
        <div className="mb-10 flex items-center justify-between animate-fadeInUpSlow">
           <div>
              <Button variant="ghost" onClick={() => navigate('/dashboard')} className="pl-0 text-slate-400 mb-2">
                 <ArrowLeft size={16} className="mr-2" /> Voltar ao Dashboard
              </Button>
              <h1 className="text-3xl font-light text-slate-900">Midia de Eventos</h1>
           </div>
        </div>

        <div className="grid gap-6">
           {EVENTS.map((event, idx) => {
              const pendingCount = PENDING_MEDIA_SUBMISSIONS.filter(s => s.eventId === event.id).length;
              const communityCount = event.media?.filter(m => m.source === 'comunidade').length || 0;
              const officialCount = event.media?.filter(m => m.source === 'oficial').length || 0;

              return (
                 <Card
                   key={event.id}
                   className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-premium transition-all lusobrasil-border animate-fade-in-up-small group"
                   style={{ animationDelay: `${idx * 0.1}s` }}
                 >
                    <div className="flex items-center gap-6 w-full md:w-auto">
                       <div className="w-24 h-24 rounded-2xl bg-slate-100 overflow-hidden shrink-0 shadow-sm relative">
                          <img src={event.image} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" alt="" />
                       </div>
                       <div>
                          <h3 className="text-xl font-medium text-slate-900 mb-2">{event.title}</h3>
                          <div className="flex gap-3 text-sm text-slate-500">
                             <span className="bg-slate-100 px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold">{event.category}</span>
                             <span className="flex items-center gap-1"><span className="w-1 h-1 bg-slate-400 rounded-full"></span> {event.date}</span>
                          </div>
                       </div>
                    </div>

                    <div className="flex flex-wrap gap-8 items-center justify-end w-full md:w-auto bg-slate-50/50 p-4 rounded-3xl border border-slate-100">
                       <div className="text-center px-2">
                          <div className="text-2xl font-light text-slate-900">{officialCount}</div>
                          <div className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Oficiais</div>
                       </div>
                       <div className="text-center px-2 border-l border-slate-200">
                          <div className="text-2xl font-light text-slate-900">{communityCount}</div>
                          <div className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Comunidade</div>
                       </div>
                       <div className="text-center px-2 border-l border-slate-200 relative min-w-[80px]">
                          <div className={`text-2xl font-medium ${pendingCount > 0 ? 'text-orange-500' : 'text-slate-300'}`}>{pendingCount}</div>
                          <div className={`text-[9px] uppercase tracking-widest text-slate-400 font-bold ${pendingCount > 0 ? 'animate-pulse-slow' : ''}`}>Pendentes</div>
                          {pendingCount > 0 && <span className="absolute top-0 right-2 w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>}
                       </div>

                       <Link to={`/dashboard/eventos/${event.id}/midias`}>
                          <Button variant={pendingCount > 0 ? 'primary' : 'outline'} className="py-2.5 px-6 text-sm h-auto rounded-xl">
                             Gerir Midia
                          </Button>
                       </Link>
                    </div>
                 </Card>
              );
           })}
        </div>
      </SectionWrapper>
    </div>
  );
};

export const DashboardMediaGerirPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | undefined>(EVENTS.find(e => e.id === id));
  const [tick, setTick] = useState(0);

  usePageMeta("Curadoria de Midia", "Aprove ou reprove submissoes.");

  useEffect(() => {
    const handleStateUpdate = () => {
      // Re-fetch event to make sure we have latest media array
      const updatedEvent = EVENTS.find(e => e.id === id);
      setEvent(updatedEvent);
      setTick(t => t + 1);
    };
    window.addEventListener(FLB_STATE_EVENT, handleStateUpdate);
    return () => window.removeEventListener(FLB_STATE_EVENT, handleStateUpdate);
  }, [id]);

  if (!event) return <div className="p-20 text-center">Evento nao encontrado</div>;

  const pendingItems = PENDING_MEDIA_SUBMISSIONS.filter(s => s.eventId === event.id);
  const publishedItems = event.media || [];
  const communityPublished = publishedItems.filter(m => m.source === 'comunidade');
  const officialPublished = publishedItems.filter(m => m.source === 'oficial');

  const handleApprove = (subId: string) => {
     approveCommunityMedia(event.id, subId);
  };

  const handleReject = (subId: string) => {
     rejectCommunityMedia(subId);
  };

  return (
    <div className="pt-32 pb-20 bg-[#F8F9FB] min-h-screen">
      <SectionWrapper className="py-0 md:py-0 px-4">
         <div className="mb-10 animate-fadeInUpSlow">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
               <div>
                  <Button variant="ghost" onClick={() => navigate('/dashboard/eventos')} className="pl-0 text-slate-400 mb-2">
                     <ArrowLeft size={16} className="mr-2" /> Voltar a lista
                  </Button>
                  <h1 className="text-3xl font-light text-slate-900">Curadoria: <span className="font-medium">{event.title}</span></h1>
               </div>
               <a href={`#/eventos/${id}`} target="_blank" rel="noreferrer">
                  <Button variant="white" className="text-sm h-auto py-3 gap-2 text-brand-900 border border-slate-200 shadow-sm hover:shadow-md">
                     Visualizar Album <Eye size={16} />
                  </Button>
               </a>
            </div>
         </div>

         <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 animate-fadeInUpSlow delay-100">
            <div className="space-y-6">
               <div className="flex items-center justify-between mb-4 border-b border-orange-200 pb-3">
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 animate-pulse-slow">
                        <AlertCircle size={18} />
                     </div>
                     <h2 className="text-lg font-medium text-slate-900">Pendentes <span className="text-slate-400 text-sm font-normal">({pendingItems.length})</span></h2>
                  </div>
               </div>

               {pendingItems.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 bg-white/50 rounded-3xl border border-dashed border-slate-200 animate-fade-in-up-small">
                     <Check size={40} className="mx-auto mb-4 opacity-20" />
                     <p className="font-light">Tudo limpo! Nenhuma submissao pendente para analise.</p>
                  </div>
               ) : (
                  <div className="space-y-4">
                     {pendingItems.map(item => (
                        <MediaCurationCard
                          key={item.id}
                          item={item}
                          onApprove={handleApprove}
                          onReject={handleReject}
                        />
                     ))}
                  </div>
               )}
            </div>

            <div className="space-y-6">
               <div className="flex items-center justify-between mb-4 border-b border-brand-900/20 pb-3">
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-brand-900/10 flex items-center justify-center text-brand-900">
                        <FolderOpen size={18} />
                     </div>
                     <h2 className="text-lg font-medium text-slate-900">Publicadas no Album <span className="text-slate-400 text-sm font-normal">({publishedItems.length})</span></h2>
                  </div>
               </div>

               <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {communityPublished.map(item => (
                     <div key={item.id} className="relative aspect-square rounded-2xl overflow-hidden group shadow-sm hover:shadow-lg transition-all border border-green-100 animate-fade-in-up-small">
                        <img src={item.type === 'video' ? (item.thumbnailUrl || item.url) : item.url} className="w-full h-full object-cover" alt="" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-2">
                           <p className="text-xs font-bold mb-1">{item.authorName}</p>
                           <p className="text-[10px] text-white/70">Comunidade</p>
                        </div>
                        <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse-slow"></div>
                        <div className="absolute bottom-2 right-2 bg-white/90 text-slate-900 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider backdrop-blur-sm border border-white/20">
                           Comunidade
                        </div>
                     </div>
                  ))}

                  {officialPublished.map(item => (
                     <div key={item.id} className="relative aspect-square rounded-2xl overflow-hidden group shadow-sm hover:shadow-lg transition-all opacity-80 hover:opacity-100 animate-fade-in-up-small">
                        <img src={item.type === 'video' ? (item.thumbnailUrl || item.url) : item.url} className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 transition-all" alt="" />
                        <div className="absolute inset-0 bg-gradient-to-t from-brand-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                           <p className="text-white text-[10px] font-bold uppercase tracking-widest">Oficial</p>
                        </div>
                        <div className="absolute top-2 right-2 w-2 h-2 bg-brand-900 rounded-full shadow-[0_0_8px_rgba(10,58,255,0.6)]"></div>
                     </div>
                  ))}
               </div>

               {publishedItems.length === 0 && (
                  <p className="text-slate-400 text-center italic mt-10">O album ainda esta vazio.</p>
               )}
            </div>
         </div>
      </SectionWrapper>
    </div>
  );
};
