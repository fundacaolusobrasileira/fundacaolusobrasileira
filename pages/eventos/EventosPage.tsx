import React, { useState, useEffect } from 'react';
import { SectionWrapper, AsyncContent, Badge, Button, AccessDeniedModal, LoginModal, ConfirmDialog, PremiumLoader } from '../../components/ui';
import { EventEditorModal } from '../../component.ui';
import { EVENTS, FLB_STATE_EVENT, isEditor } from '../../store/app.store';
import { deleteEvent } from '../../services/events.service';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Plus, Edit2, Trash2, Calendar, Clock } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import type { Event } from '../../types';

const isUpcoming = (event: Event) => {
  if (!event.date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDate = new Date(event.date);
  return eventDate >= today;
};

const EventCard: React.FC<{
  event: Event;
  onEdit: (e: React.MouseEvent, evt: Event) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
}> = ({ event, onEdit, onDelete }) => {
  const upcoming = isUpcoming(event);
  const displayImage = event.cardImage || event.image;
  const isStoryCard = !!event.cardImage;
  const linkUrl = event.links?.registration || event.links?.website;
  const linkLabel = event.links?.linkLabel || (event.links?.registration ? 'Inscrever-se' : 'Saber mais');

  return (
    <div className="relative group block h-full">
      <Link to={`/eventos/${event.id}`} className="block h-full">
        <div className={`h-full bg-white rounded-[2rem] overflow-hidden hover:shadow-premium transition-all duration-700 flex flex-col p-2 border border-slate-100/50 ${upcoming ? 'ring-1 ring-sand-400/30' : ''}`}>
          {/* Image */}
          <div className={`bg-slate-100 relative overflow-hidden rounded-[1.5rem] ${isStoryCard ? 'aspect-[9/14]' : 'aspect-[16/10]'}`}>
            <img
              src={displayImage}
              alt={event.title}
              className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000"
            />
            <Badge variant="light" className="absolute top-4 left-4 backdrop-blur-md bg-white/90">{event.category}</Badge>
            {upcoming && (
              <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-sand-400 text-brand-900 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">
                <Clock size={9} /> Próximo
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-6 flex flex-col flex-grow">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-sand-600 mb-2">
              <Calendar size={10} />
              {event.date}
              {event.time && <span className="text-slate-400 font-normal normal-case tracking-normal">· {event.time}</span>}
            </div>
            <h3 className="text-xl font-light text-brand-900 mb-2">{event.title}</h3>
            <p className="text-slate-500 text-sm line-clamp-2 flex-grow">{event.descriptionShort || event.description}</p>

            {/* CTA Link */}
            {linkUrl && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <span className="text-xs font-bold text-brand-900 uppercase tracking-widest group-hover:text-sand-600 transition-colors">
                  {linkLabel} →
                </span>
              </div>
            )}
          </div>
        </div>
      </Link>

      {isEditor() && (
        <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
          <button onClick={(e) => onEdit(e, event)} className="p-2 bg-white text-slate-900 rounded-full shadow-lg hover:bg-sand-400 transition-colors">
            <Edit2 size={14} />
          </button>
          <button onClick={(e) => onDelete(e, event.id)} className="p-2 bg-white text-red-500 rounded-full shadow-lg hover:bg-red-500 hover:text-white transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export const EventosPage = ({ events: eventsProp }: { events?: Event[] }) => {
  usePageMeta("Eventos da Fundacao – Cultura, Diplomacia e Inovacao", "Confira nossa programacao completa de concertos, exposicoes e seminarios.");

  const navigate = useNavigate();
  const location = useLocation();

  const events = eventsProp ?? EVENTS;

  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('Todos');
  const [localEvents, setLocalEvents] = useState<Event[]>(events);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<Partial<Event> | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    const timer = setTimeout(() => setLoading(false), 600);

    const searchParams = new URLSearchParams(location.search);
    const createMode = searchParams.get('create');
    const editId = searchParams.get('edit');

    if (createMode === '1') {
      if (isEditor()) {
        handleCreate();
      } else {
        setShowAccessDenied(true);
        navigate('/eventos', { replace: true });
      }
    } else if (editId) {
      if (isEditor()) {
        const found = EVENTS.find(e => e.id === editId);
        if (found) {
          setEditingEvent({ ...found });
          setIsModalOpen(true);
        }
      } else {
        setShowAccessDenied(true);
        navigate('/eventos', { replace: true });
      }
    }

    const handleUpdate = () => setLocalEvents([...EVENTS]);
    window.addEventListener(FLB_STATE_EVENT, handleUpdate);

    return () => {
      clearTimeout(timer);
      window.removeEventListener(FLB_STATE_EVENT, handleUpdate);
    };
  }, [location.search, isModalOpen]);

  useEffect(() => { setLocalEvents(events); }, [events]);

  const categories = ['Todos', '33 Anos', 'Fundacao', 'Embaixada', 'Outros'];

  const filteredEvents = filter === 'Todos'
    ? localEvents
    : localEvents.filter(e => e.category === filter);

  const upcomingEvents = filteredEvents.filter(isUpcoming).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const pastEvents = filteredEvents.filter(e => !isUpcoming(e)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleCreate = () => {
    if (!isEditor()) { setShowAccessDenied(true); return; }
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const handleEdit = (e: React.MouseEvent, evt: Event) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isEditor()) { setShowAccessDenied(true); return; }
    setEditingEvent({ ...evt });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isEditor()) { setShowAccessDenied(true); return; }
    setItemToDelete(id);
  };

  const confirmDelete = () => {
    if (itemToDelete) { deleteEvent(itemToDelete); setItemToDelete(null); }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
    if (location.search) navigate('/eventos', { replace: true });
  };

  return (
    <div className="bg-brand-900 min-h-screen text-slate-900 selection:bg-sand-400 selection:text-brand-900">
      {/* HERO */}
      <section className="relative pt-48 pb-32 px-6 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-[-20%] right-[10%] w-[60vw] h-[60vw] bg-brand-800 rounded-full blur-[150px] opacity-40 animate-pulse-slow"></div>
          <div className="absolute bottom-[0%] left-[10%] w-[40vw] h-[40vw] bg-black rounded-full blur-[120px] opacity-60"></div>
        </div>
        <div className="relative z-10 text-center max-w-5xl mx-auto animate-fadeInUpSlow">
          <Badge variant="gold" className="mb-8">Programacao</Badge>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-light text-white mb-8 tracking-tighter leading-[1.05]">
            Agenda <span className="font-serif italic text-white/40 pr-2">Cultural</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/60 max-w-2xl mx-auto font-light leading-relaxed tracking-wide">
            Concertos, exposicoes e conferencias que celebram a lusofonia.
          </p>
        </div>
      </section>

      {/* CONTENT */}
      <div className="bg-page relative z-20 rounded-t-[3rem] -mt-10 pt-20 pb-32 shadow-[0_-20px_60px_rgba(0,0,0,0.2)]">
        <SectionWrapper className="py-0">
          {/* Filters + Create */}
          <div className="flex flex-col md:flex-row items-center justify-between mb-16 gap-6 animate-fadeInUpSlow delay-100">
            <div className="flex flex-wrap justify-center gap-3">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`px-8 py-3 rounded-full text-xs font-bold uppercase tracking-[0.15em] transition-all duration-500 ${
                    filter === cat
                      ? 'bg-brand-900 text-white shadow-lg scale-105'
                      : 'bg-white border border-slate-200 text-slate-400 hover:border-brand-900 hover:text-brand-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            {isEditor() && (
              <Button onClick={handleCreate} className="gap-2 px-6 py-3 text-xs h-auto shadow-premium">
                <Plus size={16} /> Novo Evento
              </Button>
            )}
          </div>

          <AsyncContent loading={loading} fallback={<PremiumLoader />}>
            {filteredEvents.length === 0 ? (
              <div className="text-center py-32">
                <div className="text-4xl text-slate-200 font-serif mb-4 italic">Sem eventos</div>
                <p className="text-slate-400 font-light mb-8">Nenhuma atividade encontrada nesta categoria.</p>
                {isEditor() && <Button onClick={handleCreate}>Criar primeiro evento</Button>}
              </div>
            ) : (
              <div className="animate-fadeInUpSlow delay-200 space-y-20">
                {/* PRÓXIMOS EVENTOS */}
                {upcomingEvents.length > 0 && (
                  <div>
                    <div className="flex items-center gap-4 mb-10">
                      <div className="flex items-center gap-2 px-4 py-2 bg-sand-400 rounded-full">
                        <Clock size={12} className="text-brand-900" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-900">Próximos Eventos</span>
                      </div>
                      <div className="h-px bg-slate-200 flex-grow"></div>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {upcomingEvents.map(event => (
                        <EventCard key={event.id} event={event} onEdit={handleEdit} onDelete={handleDeleteClick} />
                      ))}
                    </div>
                  </div>
                )}

                {/* EVENTOS PASSADOS */}
                {pastEvents.length > 0 && (
                  <div>
                    <div className="flex items-center gap-4 mb-10">
                      <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full">
                        <Calendar size={12} className="text-slate-500" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Eventos Passados</span>
                      </div>
                      <div className="h-px bg-slate-200 flex-grow"></div>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {pastEvents.map(event => (
                        <EventCard key={event.id} event={event} onEdit={handleEdit} onDelete={handleDeleteClick} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </AsyncContent>
        </SectionWrapper>
      </div>

      <AccessDeniedModal isOpen={showAccessDenied} onClose={() => setShowAccessDenied(false)} onLogin={() => setShowLogin(true)} />
      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
      <ConfirmDialog
        isOpen={!!itemToDelete}
        title="Confirmar exclusao"
        description="Esta acao e permanente e nao pode ser desfeita."
        confirmLabel="Excluir definitivamente"
        onConfirm={confirmDelete}
        onCancel={() => setItemToDelete(null)}
      />
      <EventEditorModal isOpen={isModalOpen} onClose={handleCloseModal} event={editingEvent} />
    </div>
  );
};
