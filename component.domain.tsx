import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Menu, X, Calendar, MapPin, Mail,
  ArrowRight, Video, Check, LogOut, Search as SearchIcon, Eye, Download
} from 'lucide-react';
import { Button, Badge, Card, SocialIcons, LoginModal, Input, AsyncImage } from './component.ui';
import type { Partner, Event, PendingMediaSubmission, Pillar, Space } from './types';
import { FLB_STATE_EVENT } from './store/app.store';
import { logout } from './services/auth.service';
import { subscribeToNewsletter } from './services/precadastros.service';
import { useAuthSession } from './hooks/useAuthSession';

// --- Interfaces for Props ---

interface HeaderProps {
  navLinks: { name: string; path: string }[];
}

// --- Brand Logo Component ---
export const BrandLogo = ({ 
  variant = 'original', 
  className = ''
}: { 
  variant?: 'original' | 'dark-ui'; 
  className?: string
}) => {
  const isDarkUI = variant === 'dark-ui';
  const symbolBg = isDarkUI ? 'bg-brand-900' : 'bg-white';
  const symbolText = isDarkUI ? 'text-white' : 'text-brand-900';
  const textColorPrimary = isDarkUI ? 'text-brand-900' : 'text-white';
  const textColorSecondary = isDarkUI ? 'text-brand-800' : 'text-white/80';

  return (
    <div className={`flex items-center gap-3 md:gap-4 select-none ${className}`} role="img" aria-label="Logo Fundação Luso-Brasileira">
      <div className={`
        relative w-10 h-10 md:w-11 md:h-11 shrink-0 
        flex items-center justify-center 
        rounded-xl shadow-sm
        transition-all duration-300
        ${symbolBg} ${symbolText}
      `} aria-hidden="true">
         <div className={`absolute inset-0.5 border border-current opacity-20 rounded-lg`}></div>
         <span className="font-serif font-bold text-2xl md:text-3xl leading-none pt-1 pr-0.5">F</span>
      </div>
      
      <div className="flex flex-col justify-center h-10 md:h-11" aria-hidden="true">
         <span className={`text-[10px] md:text-[11px] font-bold uppercase tracking-[0.25em] leading-tight ${textColorPrimary} transition-colors`}>
           Fundação
         </span>
         <span className={`text-[10px] md:text-[11px] font-light uppercase tracking-[0.15em] leading-tight ${textColorSecondary} transition-colors`}>
           Luso-Brasileira
         </span>
      </div>
    </div>
  );
};

export const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const authSession = useAuthSession();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const isDarkPage = location.pathname === '/' || 
                     location.pathname.includes('eventos') || 
                     location.pathname.includes('membros') || 
                     location.pathname.includes('parceiros') ||
                     location.pathname.includes('precadastro');

  const navLinks = [
    { name: 'A Fundação', path: '/' },
    { name: 'Eventos', path: '/eventos' },
    { name: 'Membros', path: '/parceiros' },
  ];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (['/login', '/cadastro'].includes(location.pathname)) return null;

  const isHeaderWhite = !isDarkPage;
  const textColorClass = isHeaderWhite ? 'text-brand-900' : 'text-white';
  const headerBgClass = scrolled
    ? (isDarkPage 
        ? 'bg-brand-900/95 backdrop-blur-xl py-3 border-b border-white/10 shadow-lg' 
        : 'bg-white/95 backdrop-blur-xl py-3 border-b border-slate-200/50 shadow-sm'
      )
    : 'bg-transparent py-6 md:py-8';
  const buttonClass = isHeaderWhite
    ? 'bg-white/40 border-slate-200/60 text-slate-700 hover:text-slate-900 focus:ring-slate-300'
    : 'bg-white/10 border-white/20 text-white hover:bg-white hover:text-brand-900 focus:ring-white/50';

  return (
    <>
      <header className={`fixed top-0 w-full z-50 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${headerBgClass}`}>
        <div className="max-w-[1800px] mx-auto px-6 lg:px-12 relative">
          <div className="flex justify-between items-center h-14 md:h-16">
            <Link to="/" className="block group relative z-50 hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-sand-400 rounded-xl">
                <BrandLogo variant={isHeaderWhite ? 'dark-ui' : 'original'} />
            </Link>

            <nav className="hidden md:flex items-center gap-12" aria-label="Navegação Principal">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  aria-current={location.pathname === link.path ? 'page' : undefined}
                  className={`text-[10px] font-bold tracking-[0.2em] uppercase transition-all duration-500 relative group py-2 focus:outline-none focus:text-sand-400 ${
                    location.pathname === link.path && link.path !== '/' 
                      ? 'text-sand-400'
                      : `${textColorClass} hover:opacity-70`
                  }`}
                >
                  {link.name}
                  <span className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-[1px] transition-all duration-700 ${
                     location.pathname === link.path && link.path !== '/' ? 'w-full opacity-100 bg-current' : 'w-0 opacity-0 group-hover:w-4 group-hover:opacity-40 bg-current'
                  }`}></span>
                </Link>
              ))}
              
              <div className={`pl-8 ml-2 border-l transition-colors duration-700 flex items-center gap-6 ${isHeaderWhite ? 'border-slate-200' : 'border-white/20'}`}>
                  {authSession.isLoggedIn ? (
                      <div className="flex items-center gap-4">
                          <Link to="/dashboard" className={`text-[10px] font-bold uppercase tracking-wider ${textColorClass} hover:opacity-70 focus:outline-none focus:underline`}>
                              Olá, {authSession.displayName || 'Editor'}
                          </Link>
                          <button onClick={logout} className="p-2 text-red-400 hover:text-red-500 transition-colors" title="Sair" aria-label="Sair da conta">
                              <LogOut size={16} />
                          </button>
                      </div>
                  ) : (
                      <>
                        <Link 
                          to="/precadastro" 
                          className={`hidden lg:inline-block text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-500 hover:opacity-70 focus:outline-none focus:text-sand-400 ${textColorClass}`}
                        >
                          Pré Cadastro
                        </Link>
                        <button 
                            onClick={() => setIsLoginModalOpen(true)}
                            className={`px-6 py-2.5 rounded-full border text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-offset-2 ${buttonClass}`}
                        >
                            Entrar
                        </button>
                      </>
                  )}
              </div>
            </nav>

            <div className="md:hidden">
              <button 
                onClick={() => setIsOpen(!isOpen)} 
                className={`p-2 ${textColorClass} focus:outline-none focus:ring-2 focus:ring-sand-400 rounded-md`}
                aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
                aria-expanded={isOpen}
              >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {isOpen && (
        <div className="md:hidden fixed inset-0 z-[60] bg-brand-900/98 backdrop-blur-xl flex flex-col animate-in slide-in-from-right duration-700 text-white">
          <div className="flex justify-end p-6">
             <button onClick={() => setIsOpen(false)} className="p-2 text-white/80 hover:text-white" aria-label="Fechar menu">
                 <X size={24} />
             </button>
          </div>
          <nav className="flex-grow flex flex-col justify-center px-10 space-y-8" aria-label="Navegação Mobile">
            {navLinks.map((link, idx) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className="block text-3xl font-light tracking-tight text-white animate-fadeInUpSlow focus:outline-none focus:text-sand-400"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                {link.name}
              </Link>
            ))}
            <div className="h-px bg-white/10 w-full my-8" role="separator"></div>
            {authSession.isLoggedIn ? (
                <div className="space-y-4 animate-fadeInUpSlow delay-300">
                    <Link to="/dashboard" onClick={() => setIsOpen(false)} className="text-lg text-sand-400 font-medium block">
                       Dashboard
                    </Link>
                    <button onClick={() => { logout(); setIsOpen(false); }} className="text-sm text-red-400 font-medium uppercase tracking-widest flex items-center gap-2">
                       <LogOut size={14} /> Sair da conta
                    </button>
                </div>
            ) : (
                <div className="space-y-6 animate-fadeInUpSlow delay-300">
                    <Link to="/precadastro" onClick={() => setIsOpen(false)} className="text-lg text-white/70 font-medium block hover:text-white transition-colors">
                        Pré Cadastro
                    </Link>
                    <button onClick={() => { setIsOpen(false); setIsLoginModalOpen(true); }} className="text-lg text-sand-400 font-medium flex items-center gap-3">
                        Entrar como Editor <ArrowRight size={16} />
                    </button>
                </div>
            )}
          </nav>
        </div>
      )}

      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </>
  );
};

export const MediaCurationCard: React.FC<{
  item: PendingMediaSubmission,
  onApprove: (id: string) => void,
  onReject: (id: string) => void
}> = ({ item, onApprove, onReject }) => {
  // URLs are now direct Supabase Storage URLs
  const src = item.url;

  return (
    <Card className="p-5 flex flex-col gap-4 bg-white border border-slate-100 hover:shadow-md transition-all rounded-3xl group relative overflow-hidden">
      <div className="flex gap-4 items-start">
        <div className="w-24 h-24 rounded-2xl bg-slate-100 shrink-0 overflow-hidden relative border border-slate-100">
           {item.type === 'video' ? (
             <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white">
               <Video size={24} aria-hidden="true" />
             </div>
           ) : (
             <img src={src} alt="Mídia enviada" className="w-full h-full object-cover" />
           )}
           <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-sm text-white text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
             {item.type === 'image' ? 'Foto' : 'Vídeo'}
           </div>
        </div>

        <div className="flex-grow min-w-0">
          <div className="flex justify-between items-start mb-1">
             <h4 className="font-medium text-slate-900 truncate pr-2">{item.authorName}</h4>
             <span className="text-[10px] text-slate-500 whitespace-nowrap">{new Date(item.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
             <Mail size={12} aria-hidden="true" /> {item.email}
          </div>
          {item.message && (
            <div className="bg-slate-50 p-3 rounded-xl text-sm text-slate-600 font-light italic border border-slate-100/50">
              "{item.message}"
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-50">
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300 transition-all text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <Eye size={14} aria-hidden="true" /> Ver
        </a>
        <a
          href={src}
          download
          className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300 transition-all text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <Download size={14} aria-hidden="true" /> Baixar
        </a>
        <button onClick={() => onReject(item.id)} className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-red-500">
          <X size={14} aria-hidden="true" /> Rejeitar
        </button>
        <button onClick={() => onApprove(item.id)} className="flex-1 py-2 rounded-xl bg-slate-900 text-white hover:bg-green-600 shadow-md hover:shadow-green-200 transition-all text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-green-500">
          <Check size={14} aria-hidden="true" /> Aprovar
        </button>
      </div>
    </Card>
  );
};

// --- FOOTER ---
export const Footer = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if(email) {
       subscribeToNewsletter(email);
       setSubscribed(true);
       setEmail('');
    }
  };

  return (
    <footer className="bg-brand-900 text-white pt-24 pb-12 relative overflow-hidden border-t border-white/5">
      {/* Background with Darkened Photo Texture */}
      <div className="absolute inset-0 pointer-events-none z-0">
         <img 
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2670&auto=format&fit=crop" 
            alt="" 
            className="w-full h-full object-cover opacity-20 mix-blend-overlay"
         />
         <div className="absolute inset-0 bg-brand-900/95"></div>
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-b from-brand-800 to-transparent rounded-full blur-[100px] opacity-50"></div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 relative z-10">
        <div className="grid md:grid-cols-12 gap-12 mb-20">
          <div className="md:col-span-4 space-y-8">
            <BrandLogo variant="original" />
            <p className="text-white/40 font-light max-w-sm leading-relaxed text-sm">
              Promovendo a cultura, educação e inovação entre Portugal, Brasil e o mundo lusófono.
            </p>
            <div className="flex gap-4">
               <SocialIcons links={{ instagram: 'https://instagram.com', facebook: 'https://facebook.com', linkedin: 'https://linkedin.com' }} variant="light" size="sm" />
            </div>
          </div>
          
          <div className="md:col-span-2 space-y-6">
             <h4 className="text-xs font-bold uppercase tracking-widest text-white/30">Fundação</h4>
             <ul className="space-y-4 text-sm font-light text-white/60">
                <li><Link to="/" className="hover:text-sand-400 transition-colors">Sobre Nós</Link></li>
                <li><Link to="/membros" className="hover:text-sand-400 transition-colors">Governança</Link></li>
                <li><Link to="/parceiros" className="hover:text-sand-400 transition-colors">Parceiros</Link></li>
                <li><Link to="/eventos" className="hover:text-sand-400 transition-colors">Agenda</Link></li>
             </ul>
          </div>
          
          <div className="md:col-span-2 space-y-6">
             <h4 className="text-xs font-bold uppercase tracking-widest text-white/30">Legal</h4>
             <ul className="space-y-4 text-sm font-light text-white/60">
                <li><Link to="/termos" className="hover:text-sand-400 transition-colors">Termos de Uso</Link></li>
                <li><Link to="/privacidade" className="hover:text-sand-400 transition-colors">Privacidade</Link></li>
                <li><Link to="/precadastro" className="hover:text-sand-400 transition-colors">Trabalhe Conosco</Link></li>
             </ul>
          </div>

          <div className="md:col-span-4 space-y-6">
             <h4 className="text-xs font-bold uppercase tracking-widest text-white/30">Newsletter</h4>
             <p className="text-white/40 font-light text-sm">Receba atualizações sobre eventos e iniciativas.</p>
             {subscribed ? (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm flex items-center gap-2">
                   <Check size={16} /> Inscrito com sucesso.
                </div>
             ) : (
                <form onSubmit={handleSubscribe} className="flex gap-2">
                   <input 
                     type="email" 
                     placeholder="seu@email.com" 
                     className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-sand-400 flex-grow placeholder:text-white/20"
                     value={email}
                     onChange={e => setEmail(e.target.value)}
                     required
                   />
                   <button type="submit" className="bg-sand-400 text-brand-900 px-4 py-3 rounded-xl font-bold hover:bg-white transition-colors">
                      <ArrowRight size={16} />
                   </button>
                </form>
             )}
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/20 font-light">
           <p>© {new Date().getFullYear()} Fundação Luso-Brasileira. Todos os direitos reservados.</p>
           <p>Lisboa • Brasília</p>
        </div>
      </div>
    </footer>
  );
};

// ... existing code for other components ...
const POPUP_EXCLUDED_ROUTES = ['/login', '/cadastro', '/reset-password', '/dashboard', '/administracao', '/precadastro'];

export const SmartInviteModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [step, setStep] = useState(1);
    const location = useLocation();

    const isExcluded = POPUP_EXCLUDED_ROUTES.some(route => location.pathname.startsWith(route));

    useEffect(() => {
        if (isExcluded) return;
        const seen = localStorage.getItem('flb_invite_seen');
        if (!seen) {
            const timer = setTimeout(() => setIsOpen(true), 20000);
            return () => clearTimeout(timer);
        }
    }, [isExcluded]);

    // Close immediately if user navigates to excluded route
    useEffect(() => {
        if (isExcluded) setIsOpen(false);
    }, [isExcluded]);

    const handleClose = () => {
        setIsOpen(false);
        localStorage.setItem('flb_invite_seen', 'true');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(email) {
            subscribeToNewsletter(email);
            setStep(2);
            setTimeout(handleClose, 2000);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Mobile backdrop */}
            <div className="fixed inset-0 z-40 bg-black/20 md:hidden" onClick={handleClose} />

            {/* Card — bottom-center on mobile, bottom-right on desktop */}
            <div className="fixed z-50 animate-in slide-in-from-bottom-4 fade-in duration-700
                bottom-0 left-0 right-0 rounded-t-2xl
                md:bottom-6 md:right-6 md:left-auto md:rounded-2xl md:w-96">
                <div className="bg-white shadow-2xl p-6 border border-slate-100 relative overflow-hidden rounded-t-2xl md:rounded-2xl">
                    <button onClick={handleClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 p-1"><X size={18}/></button>

                    {/* Mobile drag indicator */}
                    <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4 md:hidden" />

                    {step === 1 ? (
                        <>
                            <h3 className="font-serif text-xl text-brand-900 mb-2">Junte-se à Comunidade</h3>
                            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                                Receba convites exclusivos para eventos culturais e atualizações sobre nossas iniciativas.
                            </p>
                            <form onSubmit={handleSubmit} className="space-y-3">
                                <Input
                                    placeholder="Seu melhor e-mail"
                                    value={email}
                                    onChange={(e: any) => setEmail(e.target.value)}
                                    className="text-sm"
                                    required
                                />
                                <Button type="submit" variant="primary" className="w-full text-xs py-3 h-auto">
                                    Inscrever-se Agora
                                </Button>
                            </form>
                        </>
                    ) : (
                        <div className="text-center py-8 text-green-600">
                            <Check size={32} className="mx-auto mb-2" />
                            <p className="font-medium">Obrigado por se inscrever!</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export const SearchResults = ({ query, results, onClose }: { query: string, results: { partners: Partner[], events: Event[], spaces: Space[] }, onClose: () => void }) => {
    if (!query) return null;
    const hasResults = results.partners.length > 0 || results.events.length > 0 || results.spaces.length > 0;

    return (
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden max-w-3xl mx-auto w-full">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Resultados para "{query}"</span>
                <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full"><X size={16} className="text-slate-500"/></button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
                {!hasResults && (
                    <div className="p-8 text-center text-slate-400">
                        <SearchIcon size={24} className="mx-auto mb-2 opacity-20" />
                        <p>Nenhum resultado encontrado.</p>
                    </div>
                )}
                {results.events.length > 0 && (
                    <div className="mb-4">
                        <h4 className="px-4 py-2 text-xs font-bold text-brand-900 uppercase">Eventos</h4>
                        {results.events.map(e => (
                            <Link to={`/eventos/${e.id}`} key={e.id} onClick={onClose} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors group">
                                <div className="w-12 h-12 rounded-lg bg-slate-200 overflow-hidden shrink-0"><img src={e.image} className="w-full h-full object-cover grayscale group-hover:grayscale-0" /></div>
                                <div>
                                    <div className="font-medium text-slate-900 group-hover:text-brand-900">{e.title}</div>
                                    <div className="text-xs text-slate-500">{e.date} • {e.category}</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
                {results.partners.length > 0 && (
                    <div className="mb-4">
                        <h4 className="px-4 py-2 text-xs font-bold text-brand-900 uppercase">Membros</h4>
                        {results.partners.map(p => (
                            <Link to={`/membro/${p.id}`} key={p.id} onClick={onClose} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors group">
                                <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden shrink-0"><img src={p.image} className="w-full h-full object-cover grayscale group-hover:grayscale-0" /></div>
                                <div>
                                    <div className="font-medium text-slate-900 group-hover:text-brand-900">{p.name}</div>
                                    <div className="text-xs text-slate-500">{p.role || p.category}</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export const PresidentMessage = () => {
    return (
        <div className="relative bg-brand-900 text-white p-8 md:p-12 rounded-[3rem] overflow-hidden">
             <div className="absolute inset-0 opacity-20">
                <img src="https://images.unsplash.com/photo-1541532713592-79a0317b6b77?q=80&w=2576&auto=format&fit=crop" className="w-full h-full object-cover mix-blend-overlay" alt="" />
             </div>
             <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                 <div className="w-32 h-32 md:w-48 md:h-48 rounded-full border-4 border-white/10 overflow-hidden shrink-0 shadow-2xl">
                    <img src="https://brazileconomy.com.br/wp-content/uploads/2025/11/IMG-20251103-WA0017.jpg.webp" alt="Paulo Campos Costa" className="w-full h-full object-cover" />
                 </div>
                 <div className="text-center md:text-left">
                    <div className="inline-block px-3 py-1 bg-sand-400/20 text-sand-400 text-[10px] font-bold uppercase tracking-widest rounded-full mb-4">Mensagem da Presidência</div>
                    <blockquote className="text-xl md:text-2xl font-serif leading-relaxed mb-6 italic text-white/90">
                        "A nossa missão é construir pontes duradouras onde a língua e a cultura servem de alicerce para a inovação e o desenvolvimento econômico partilhado."
                    </blockquote>
                    <div>
                        <cite className="font-bold text-white not-italic text-lg">Paulo Campos Costa</cite>
                        <p className="text-white/50 text-xs uppercase tracking-widest mt-1">Presidente do Conselho de Administração</p>
                    </div>
                 </div>
             </div>
        </div>
    );
};

export const PillarsGrid = ({ pillars, variant = 'dark' }: { pillars: Pillar[], variant?: 'dark' | 'light' }) => {
    const isLight = variant === 'light';

    return (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {pillars.map((pillar) => {
                const Icon = pillar.icon;
                return (
                    <div
                        key={pillar.id}
                        className={`p-6 md:p-8 rounded-2xl transition-all duration-500 group hover:-translate-y-1 ${
                            isLight
                                ? 'bg-white border border-slate-200/80 hover:border-sand-400/50 hover:shadow-xl'
                                : 'bg-white/5 border border-white/10 hover:bg-white/10'
                        }`}
                    >
                        <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-500 ${
                            isLight
                                ? 'bg-sand-100 text-sand-600'
                                : 'bg-sand-400/10 text-sand-400'
                        }`}>
                            <Icon size={24} />
                        </div>
                        <h3 className={`text-lg md:text-xl font-light mb-3 ${isLight ? 'text-brand-900' : 'text-white'}`}>{pillar.title}</h3>
                        <p className={`text-sm leading-relaxed font-light ${isLight ? 'text-slate-500' : 'text-white/50'}`}>{pillar.description}</p>
                    </div>
                );
            })}
        </div>
    );
};

const formatEventDate = (d: string) => {
  if (!d) return '';
  const p = new Date(d + 'T00:00:00');
  return isNaN(p.getTime()) ? d : p.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const EventDetailHeader = ({ event }: { event: Event }) => {
    return (
        <div className="relative aspect-[16/9] min-h-[320px] max-h-[620px] w-full overflow-hidden bg-brand-900">
            <div className="absolute inset-0">
                {(event.coverImage || event.image) && (
                    <img
                        src={event.coverImage || event.image}
                        alt={event.title}
                        className="w-full h-full object-cover object-center"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-brand-900/90 via-brand-900/50 to-transparent"></div>
            </div>
            
            <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 pb-16 md:pb-24">
                <div className="max-w-[1400px] mx-auto animate-fadeInUpSlow">
                    <Badge variant="gold" className="mb-6">{event.category}</Badge>
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif text-white leading-[1.05] mb-6 drop-shadow-lg max-w-4xl">
                        {event.title}
                    </h1>
                    
                    <div className="flex flex-wrap gap-6 text-white/90">
                         <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                             <Calendar size={18} className="text-sand-400" />
                             <span className="text-sm font-medium">{formatEventDate(event.date)} {event.time && `• ${event.time}`}</span>
                         </div>
                         <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                             <MapPin size={18} className="text-sand-400" />
                             <span className="text-sm font-medium">{event.location}, {event.city}</span>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const GallerySection = ({ mediaList, filter, onFilterChange, onMediaClick, emptyStateSlot }: any) => {
    const displayedMedia = filter === 'todos' ? mediaList : mediaList.filter((m: any) => m.source === filter);

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h2 className="text-2xl font-light text-brand-900 mb-2">Galeria da Comunidade</h2>
                    <p className="text-slate-500 text-sm">Registros compartilhados por quem esteve presente.</p>
                </div>
                
                <div className="flex gap-2 bg-slate-100 p-1 rounded-lg self-start">
                    {['todos', 'oficial', 'comunidade'].map((f) => (
                        <button
                            key={f}
                            onClick={() => onFilterChange(f)}
                            className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                                filter === f ? 'bg-white text-brand-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {displayedMedia.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {displayedMedia.map((item: any, idx: number) => (
                        <div 
                            key={item.id || idx} 
                            onClick={() => onMediaClick(idx)}
                            className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group shadow-sm hover:shadow-lg transition-all"
                        >
                            <AsyncImage item={item} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                <p className="text-white text-xs font-bold">{item.authorName || 'Oficial'}</p>
                                <p className="text-white/60 text-[10px] uppercase tracking-widest">{item.source}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-[2rem] p-12 text-center">
                    <p className="text-slate-400 mb-2">Nenhum registro encontrado nesta categoria.</p>
                    {emptyStateSlot}
                </div>
            )}
        </div>
    );
};
