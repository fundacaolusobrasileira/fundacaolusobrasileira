import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SectionWrapper, Card, Button, AccessDeniedModal, LoginModal, ConfirmDialog } from '../../components/ui';
import { StatCard, ListRow, EventEditorModal, MemberEditorModal, ActivityFeed, UniversalListModal, SettingsModal, PremiumLoader, MediaManagerModal, PreCadastroManagerModal } from '../../component.ui';
import { Calendar, Users, MapPin, BarChart3, TrendingUp, Image, Plus, Search, Edit2, Trash2, Settings, UserPlus, Loader2, Mail, Copy, Check, Pause, Play, X } from 'lucide-react';
import { EVENTS, PARTNERS, PRECADASTROS, PENDING_MEDIA_SUBMISSIONS, ACTIVITY_LOG, FLB_STATE_EVENT, isEditor, isAdmin } from '../../store/app.store';
import { UserManagerModal } from './UserManagerModal';
import { BenefitsManagerSection } from './BenefitsManagerSection';
import { deleteEvent } from '../../services/events.service';
import { deleteMember } from '../../services/members.service';
import { updatePreCadastro, deletePreCadastro } from '../../services/precadastros.service';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useDebounce } from '../../hooks/useDebounce';
import { generateTestActivity } from '../../store/app.store';
import type { Event, Partner } from '../../types';

export const DashboardPage = () => {
  usePageMeta("Dashboard – Fundação Luso-Brasileira", "Visão geral da sua conta e estatísticas.");
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0); // Force re-render on state updates
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Modals State
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [viewAllEventsOpen, setViewAllEventsOpen] = useState(false);
  const [viewAllMembersOpen, setViewAllMembersOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [mediaManagerOpen, setMediaManagerOpen] = useState(false);
  const [preCadastroOpen, setPreCadastroOpen] = useState(false);
  const [userManagerOpen, setUserManagerOpen] = useState(false);

  const [membersTab, setMembersTab] = useState<'todos' | 'governanca'>('todos');
  const [newsletterCopied, setNewsletterCopied] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<Event> | null>(null);
  const [editingMember, setEditingMember] = useState<Partial<Partner> | null>(null);

  // Newsletter subscriber editing
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editingSubEmail, setEditingSubEmail] = useState('');

  // Deletion State
  const [deleteType, setDeleteType] = useState<'event' | 'member' | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    const handleStateUpdate = () => setTick(t => t + 1);
    window.addEventListener(FLB_STATE_EVENT, handleStateUpdate);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(FLB_STATE_EVENT, handleStateUpdate);
    };
  }, []);

  const totalPendingMedia = PENDING_MEDIA_SUBMISSIONS.length;
  const newPreCadastros = PRECADASTROS.filter(p => p.status === 'novo').length;
  const newsletterSubscribers = PRECADASTROS.filter(p => p.type === 'newsletter');

  const copyNewsletterEmails = () => {
    const emails = newsletterSubscribers.map(p => p.email).join(', ');
    navigator.clipboard.writeText(emails).then(() => {
      setNewsletterCopied(true);
      setTimeout(() => setNewsletterCopied(false), 2000);
    });
  };

  const handleSubPause = (id: string) =>
    updatePreCadastro(id, { status: 'pausado' as any }).then(() => setTick(t => t + 1));

  const handleSubResume = (id: string) =>
    updatePreCadastro(id, { status: 'novo' }).then(() => setTick(t => t + 1));

  const handleSubDelete = (id: string) =>
    deletePreCadastro(id).then(() => setTick(t => t + 1));

  const handleSubSaveEmail = async (id: string) => {
    if (!editingSubEmail.trim()) return;
    await updatePreCadastro(id, { email: editingSubEmail.trim() });
    setEditingSubId(null);
    setTick(t => t + 1);
  };

  const checkAuth = () => {
      if (isEditor()) return true;
      setShowAccessDenied(true);
      return false;
  };

  const openEventModal = (event?: Partial<Event>) => {
      if (!checkAuth()) return;
      setEditingEvent(event || null);
      setEventModalOpen(true);
      setShowSearchResults(false);
  };

  const openMemberModal = (member?: Partial<Partner>) => {
      if (!checkAuth()) return;
      setEditingMember(member || { name: '', category: 'Parceiro Silver', socialLinks: {} });
      setMemberModalOpen(true);
      setShowSearchResults(false);
  };

  const confirmDelete = () => {
      if (deleteType === 'event' && itemToDelete) deleteEvent(itemToDelete);
      if (deleteType === 'member' && itemToDelete) deleteMember(itemToDelete);
      setItemToDelete(null);
      setDeleteType(null);
  };

  const handleDelete = (type: 'event' | 'member', id: string) => {
      if (!checkAuth()) return;
      setDeleteType(type);
      setItemToDelete(id);
  };

  // Search Logic
  const filteredEvents = useMemo(() => EVENTS.filter(e => e.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase())), [debouncedSearchQuery, tick]);
  const filteredMembers = useMemo(() => PARTNERS.filter(p => p.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())), [debouncedSearchQuery, tick]);

  if (loading) return <PremiumLoader />;

  return (
    <div className="pt-28 pb-20 bg-page min-h-screen">
      <SectionWrapper className="py-0 md:py-0 px-4 max-w-[1600px]">

        {/* Header Area */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4 animate-fadeInUpSlow">
          <div className="flex items-center gap-4">
            <div className="bg-brand-900 text-white w-10 h-10 rounded-lg flex items-center justify-center"><BarChart3 size={20} /></div>
            <div>
                <h1 className="text-2xl font-light text-brand-900 tracking-tight leading-none">Dashboard</h1>
                <p className="text-slate-500 text-xs mt-1 font-medium uppercase tracking-wider">Visão Geral &bull; Admin</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 w-full lg:w-auto items-center">
             {/* Global Search */}
             <div className="relative group w-full lg:w-80 z-40">
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-900 transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar..."
                        className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-brand-900/20 focus:border-brand-900 outline-none transition-all shadow-sm text-sm placeholder:text-slate-400"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setShowSearchResults(true); }}
                        onFocus={() => setShowSearchResults(true)}
                        onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                    />
                </div>
                {/* Search Dropdown */}
                {showSearchResults && searchQuery && (
                    <div className="absolute top-full left-0 w-full bg-white rounded-xl shadow-xl border border-slate-100 mt-2 overflow-hidden max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                        {filteredEvents.length > 0 && (
                            <div className="p-1">
                                <div className="text-[10px] font-bold uppercase text-slate-400 px-3 py-1.5 bg-slate-50">Eventos</div>
                                {filteredEvents.map(e => (
                                    <button key={e.id} onClick={() => openEventModal(e)} className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg text-sm flex items-center gap-2 group transition-colors">
                                        <div className="w-6 h-6 rounded bg-slate-200 overflow-hidden shrink-0"><img src={e.image} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"/></div>
                                        <span className="truncate flex-grow text-slate-700 font-medium group-hover:text-brand-900">{e.title}</span><Edit2 size={12} className="opacity-0 group-hover:opacity-50 text-slate-400" />
                                    </button>
                                ))}
                            </div>
                        )}
                        {filteredMembers.length > 0 && (
                            <div className="p-1 border-t border-slate-50">
                                <div className="text-[10px] font-bold uppercase text-slate-400 px-3 py-1.5 bg-slate-50">Membros</div>
                                {filteredMembers.map(m => (
                                    <button key={m.id} onClick={() => { navigate(`/membro/${m.id}/editar`); setShowSearchResults(false); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg text-sm flex items-center gap-2 group transition-colors">
                                        <div className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden shrink-0"><img src={m.image} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"/></div>
                                        <span className="truncate flex-grow text-slate-700 font-medium group-hover:text-brand-900">{m.name}</span><Edit2 size={12} className="opacity-0 group-hover:opacity-50 text-slate-400" />
                                    </button>
                                ))}
                            </div>
                        )}
                        {filteredEvents.length === 0 && filteredMembers.length === 0 && (
                            <div className="p-4 text-center text-xs text-slate-400 italic">Nenhum resultado encontrado.</div>
                        )}
                    </div>
                )}
             </div>

             <div className="flex gap-2">
                <Button onClick={() => { if(checkAuth()) setMediaManagerOpen(true) }} variant="white" className="px-3 py-2.5 h-auto text-xs bg-white hover:bg-slate-50 text-slate-600 shadow-sm flex items-center gap-2 rounded-lg border-slate-200 hover:border-slate-300">
                    <Image size={14} /> Mídia
                    {totalPendingMedia > 0 && <span className="bg-red-500 text-white text-[9px] px-1.5 rounded-full font-bold animate-pulse">{totalPendingMedia}</span>}
                </Button>
                <Button variant="white" onClick={() => { if(checkAuth()) setSettingsModalOpen(true) }} className="px-3 py-2.5 h-auto text-xs rounded-lg border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-sm hover:border-slate-300" title="Configurações">
                    <Settings size={14} />
                </Button>
                {isAdmin() && (
                  <Button variant="white" onClick={() => setUserManagerOpen(true)} className="px-3 py-2.5 h-auto text-xs rounded-lg border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-sm hover:border-slate-300 flex items-center gap-2" title="Gerir Utilizadores">
                    <Users size={14} /> Utilizadores
                  </Button>
                )}
             </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-fadeInUpSlow delay-100">
            <StatCard label="Total de Eventos" value={EVENTS.length} icon={Calendar} onClick={() => setViewAllEventsOpen(true)} />
            <StatCard label="Membros Ativos" value={PARTNERS.filter(p => p.active !== false).length} icon={Users} onClick={() => setViewAllMembersOpen(true)} />
            <div onClick={() => { if(checkAuth()) setPreCadastroOpen(true) }} className={`bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 cursor-pointer hover:border-sand-400/50 transition-colors hover:shadow-md`}>
                <div className="w-12 h-12 rounded-xl bg-slate-50 text-brand-900 flex items-center justify-center relative">
                    <UserPlus size={20} />
                    {newPreCadastros > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
                </div>
                <div>
                    <div className="text-2xl font-light text-slate-900">{PRECADASTROS.length}</div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Pré-Cadastros</div>
                </div>
            </div>

            <div className="bg-sand-400 p-5 rounded-2xl shadow-lg flex flex-col justify-center gap-3 border border-sand-500/20">
                <div className="flex gap-2">
                    <button onClick={() => openEventModal()} className="flex-1 bg-brand-900 hover:bg-black text-white py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"><Plus size={14} /> Evento</button>
                    <button onClick={() => openMemberModal()} className="flex-1 bg-white/20 hover:bg-white/30 text-brand-900 border border-brand-900/10 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95"><Plus size={14} /> Membro</button>
                </div>
            </div>
        </div>

        {/* Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6 animate-fadeInUpSlow delay-200 h-full">
            <Card className="flex flex-col h-full bg-white shadow-sm border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-50 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                    <h3 className="font-medium text-brand-900 flex items-center gap-2"><Calendar size={16} /> Agenda Recente</h3>
                    <button onClick={() => setViewAllEventsOpen(true)} className="text-[10px] font-bold text-slate-400 hover:text-brand-900 uppercase tracking-widest transition-colors">Ver todos</button>
                </div>
                <div className="p-3 space-y-1 flex-grow overflow-y-auto max-h-[400px] custom-scrollbar">
                    {EVENTS.length > 0 ? EVENTS.slice(0, 6).map(event => (
                        <ListRow
                            key={event.id}
                            title={event.title}
                            subtitle={event.date}
                            image={event.image}
                            onClick={() => openEventModal(event)}
                            actions={<><button onClick={(e) => { e.stopPropagation(); openEventModal(event); }} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-brand-900 transition-colors"><Edit2 size={14}/></button><button onClick={(e) => { e.stopPropagation(); handleDelete('event', event.id); }} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={14}/></button></>}
                        />
                    )) : <div className="py-10 text-center text-slate-400 text-xs">Nenhum evento registrado.</div>}
                </div>
            </Card>

            <Card className="flex flex-col h-full bg-white shadow-sm border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-50 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                    <h3 className="font-medium text-brand-900 flex items-center gap-2"><Users size={16} /> Membros</h3>
                    <button onClick={() => setViewAllMembersOpen(true)} className="text-[10px] font-bold text-slate-400 hover:text-brand-900 uppercase tracking-widest transition-colors">Ver todos</button>
                </div>
                <div className="flex border-b border-slate-100">
                    <button onClick={() => setMembersTab('todos')} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${membersTab === 'todos' ? 'text-brand-900 border-b-2 border-sand-400' : 'text-slate-400 hover:text-brand-900'}`}>Todos</button>
                    <button onClick={() => setMembersTab('governanca')} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${membersTab === 'governanca' ? 'text-brand-900 border-b-2 border-sand-400' : 'text-slate-400 hover:text-brand-900'}`}>Governança</button>
                </div>
                <div className="p-3 space-y-1 flex-grow overflow-y-auto max-h-[400px] custom-scrollbar">
                    {(() => {
                        const list = PARTNERS.filter(p => membersTab === 'governanca' ? p.category === 'Governança' : p.category !== 'Governança');
                        return list.length > 0 ? list.slice(0, 6).map(member => (
                            <ListRow
                                key={member.id}
                                title={member.name}
                                subtitle={`${member.role || member.category}${member.active === false ? ' · Inativo' : ''}`}
                                image={member.image}
                                onClick={() => navigate(`/membro/${member.id}/editar`)}
                                actions={<><button onClick={(e) => { e.stopPropagation(); navigate(`/membro/${member.id}/editar`); }} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-brand-900 transition-colors"><Edit2 size={14}/></button><button onClick={(e) => { e.stopPropagation(); handleDelete('member', member.id); }} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={14}/></button></>}
                            />
                        )) : <div className="py-10 text-center text-slate-400 text-xs">Nenhum membro registrado.</div>;
                    })()}
                </div>
            </Card>

            <Card className="flex flex-col h-full bg-slate-50 shadow-inner border-slate-200 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-sand-400/5 rounded-full blur-3xl pointer-events-none"></div>
                <div className="p-5 border-b border-slate-200/50 flex justify-between items-center relative z-10">
                    <h3 className="font-medium text-brand-900 flex items-center gap-2"><TrendingUp size={16} /> Atividade</h3>
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                </div>
                <div className="p-5 flex-grow overflow-y-auto max-h-[400px] custom-scrollbar relative z-10">
                    {ACTIVITY_LOG.length > 0 ? <ActivityFeed logs={ACTIVITY_LOG} /> : (
                        <div className="h-full flex flex-col items-center justify-center text-center">
                            <p className="text-slate-400 text-xs italic mb-4">Nenhuma atividade recente.</p>
                            {isEditor() && <button onClick={generateTestActivity} className="text-[10px] font-bold uppercase text-brand-900 border border-brand-900/20 px-3 py-1.5 rounded-lg hover:bg-brand-900 hover:text-white transition-all">Gerar Teste</button>}
                        </div>
                    )}
                </div>
            </Card>
        </div>
        {/* Newsletter Section */}
        <div className="mt-6 animate-fadeInUpSlow delay-300">
          <Card className="bg-white shadow-sm border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-50 flex justify-between items-center bg-white/50 backdrop-blur-sm">
              <h3 className="font-medium text-brand-900 flex items-center gap-2">
                <Mail size={16} /> Subscritores Newsletter
                <span className="ml-1 bg-sand-100 text-sand-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">{newsletterSubscribers.length}</span>
              </h3>
              {newsletterSubscribers.length > 0 && (
                <button
                  onClick={copyNewsletterEmails}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-brand-900 uppercase tracking-widest transition-colors"
                >
                  {newsletterCopied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                  {newsletterCopied ? 'Copiado!' : 'Copiar todos os emails'}
                </button>
              )}
            </div>
            <div className="p-3">
              {newsletterSubscribers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                  {newsletterSubscribers.map(sub => {
                    const isPaused = sub.status === 'pausado';
                    const isEditing = editingSubId === sub.id;
                    return (
                      <div key={sub.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group ${isPaused ? 'bg-amber-50/60' : 'hover:bg-slate-50'}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isPaused ? 'bg-amber-100 text-amber-400' : 'bg-slate-100 text-slate-400'}`}>
                          <Mail size={12} />
                        </div>
                        <div className="flex-grow min-w-0">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <input
                                autoFocus
                                value={editingSubEmail}
                                onChange={e => setEditingSubEmail(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleSubSaveEmail(sub.id); if (e.key === 'Escape') setEditingSubId(null); }}
                                className="text-sm border border-sand-300 rounded px-1.5 py-0.5 flex-grow min-w-0 focus:outline-none focus:ring-1 focus:ring-sand-400"
                              />
                              <button onClick={() => handleSubSaveEmail(sub.id)} className="p-1 text-green-600 hover:text-green-700"><Check size={12}/></button>
                              <button onClick={() => setEditingSubId(null)} className="p-1 text-slate-400 hover:text-slate-600"><X size={12}/></button>
                            </div>
                          ) : (
                            <>
                              <p className={`text-sm truncate font-medium ${isPaused ? 'text-amber-600 line-through' : 'text-slate-700'}`}>{sub.email}</p>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-400">{sub.createdAt ? new Date(sub.createdAt).toLocaleDateString('pt-PT') : '—'}</span>
                                {isPaused && <span className="text-[9px] font-bold uppercase tracking-widest text-amber-500 bg-amber-100 px-1.5 py-0.5 rounded-full">Pausado</span>}
                              </div>
                            </>
                          )}
                        </div>
                        {!isEditing && (
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => navigator.clipboard.writeText(sub.email)} className="p-1 text-slate-400 hover:text-brand-900 transition-colors" title="Copiar email"><Copy size={11}/></button>
                            <button onClick={() => { setEditingSubId(sub.id); setEditingSubEmail(sub.email); }} className="p-1 text-slate-400 hover:text-brand-900 transition-colors" title="Editar email"><Edit2 size={11}/></button>
                            <button onClick={() => isPaused ? handleSubResume(sub.id) : handleSubPause(sub.id)} className={`p-1 transition-colors ${isPaused ? 'text-green-500 hover:text-green-700' : 'text-slate-400 hover:text-amber-500'}`} title={isPaused ? 'Retomar envio' : 'Pausar envio'}>{isPaused ? <Play size={11}/> : <Pause size={11}/>}</button>
                            <button onClick={() => handleSubDelete(sub.id)} className="p-1 text-slate-400 hover:text-red-500 transition-colors" title="Excluir"><Trash2 size={11}/></button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">Nenhum subscritor de newsletter ainda.</div>
              )}
            </div>
          </Card>
        </div>

        <BenefitsManagerSection />

      </SectionWrapper>

      {/* Modals - Absolute Masters */}
      <AccessDeniedModal isOpen={showAccessDenied} onClose={() => setShowAccessDenied(false)} onLogin={() => setShowLogin(true)} />
      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />

      {/* CANONICAL EVENT EDITOR */}
      <EventEditorModal isOpen={eventModalOpen} onClose={() => setEventModalOpen(false)} event={editingEvent} />

      <MemberEditorModal isOpen={memberModalOpen} onClose={() => setMemberModalOpen(false)} member={editingMember || {}} />
      <SettingsModal isOpen={settingsModalOpen} onClose={() => setSettingsModalOpen(false)} />
      <MediaManagerModal isOpen={mediaManagerOpen} onClose={() => setMediaManagerOpen(false)} />
      <PreCadastroManagerModal isOpen={preCadastroOpen} onClose={() => setPreCadastroOpen(false)} />

      <UniversalListModal
        isOpen={viewAllEventsOpen}
        onClose={() => setViewAllEventsOpen(false)}
        title="Todos os Eventos"
        items={EVENTS}
        onEdit={(item: any) => { setViewAllEventsOpen(false); openEventModal(item); }}
        onDelete={(id: string) => handleDelete('event', id)}
        onCreate={() => { setViewAllEventsOpen(false); openEventModal(); }}
      />

      <UniversalListModal
        isOpen={viewAllMembersOpen}
        onClose={() => setViewAllMembersOpen(false)}
        title="Todos os Membros"
        items={PARTNERS}
        onEdit={(item: any) => { setViewAllMembersOpen(false); navigate(`/membro/${item.id}/editar`); }}
        onDelete={(id: string) => handleDelete('member', id)}
        onCreate={() => { setViewAllMembersOpen(false); openMemberModal(); }}
      />

      <ConfirmDialog
        isOpen={!!itemToDelete}
        title="Confirmar exclusão"
        description="Esta ação é permanente e não pode ser desfeita."
        confirmLabel="Excluir definitivamente"
        onConfirm={confirmDelete}
        onCancel={() => { setItemToDelete(null); setDeleteType(null); }}
      />

      <UserManagerModal isOpen={userManagerOpen} onClose={() => setUserManagerOpen(false)} />
    </div>
  );
};
