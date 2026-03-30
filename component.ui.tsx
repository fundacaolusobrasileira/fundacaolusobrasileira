
import React, { useEffect, useState, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Link as LinkIcon, Link2, Share2, Loader2, Image as ImageIcon, Check, Lock, Trash2, Edit, Plus, ExternalLink, Search, Star, Upload, Mail, Settings, User, AlertTriangle, CheckCircle, Info, AlertCircle as AlertIcon } from 'lucide-react';
import { resolveGalleryItemSrc, GalleryItem, SocialLinks, loginAsEditor, createEvent, updateEvent, createMember, updateMember, Partner, Event, PreCadastro, PRECADASTROS, updatePreCadastro, deletePreCadastro, convertPreCadastroToMember, isEditor, exportState, importState, addMediaToEvent, addUrlMediaToEvent, EVENTS, PENDING_MEDIA_SUBMISSIONS, approveCommunityMedia, rejectCommunityMedia, FLB_TOAST_EVENT, generateId, addEventImagesFromFiles, ActivityLogItem, deleteEvent, saveMediaBlob } from './App';

// --- TOAST NOTIFICATION SYSTEM ---
interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
}

export const ToastContainer = () => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    useEffect(() => {
        const handleToast = (e: any) => {
            const newToast = {
                id: Math.random().toString(36),
                message: e.detail.message,
                type: e.detail.type
            };
            setToasts(prev => [...prev, newToast]);
            
            // Timing Logic based on type
            let duration = 2500;
            if (newToast.type === 'success') duration = 2200;
            if (newToast.type === 'info') duration = 2500;
            if (newToast.type === 'warning') duration = 3000;
            if (newToast.type === 'error') duration = 4000;

            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== newToast.id));
            }, duration);
        };

        window.addEventListener(FLB_TOAST_EVENT, handleToast);
        return () => window.removeEventListener(FLB_TOAST_EVENT, handleToast);
    }, []);

    if (toasts.length === 0) return null;

    return (
        <div 
            className="fixed z-[10000] flex flex-col gap-3 pointer-events-none w-full max-w-[90vw] md:w-auto bottom-6 left-1/2 -translate-x-1/2 md:bottom-auto md:left-auto md:translate-x-0 md:top-6 md:right-6"
            role="region"
            aria-label="Notificações"
        >
            {toasts.map(toast => (
                <div 
                    key={toast.id} 
                    role={toast.type === 'error' ? 'alert' : 'status'}
                    aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
                    className={`
                        pointer-events-auto px-5 py-3 rounded-xl shadow-2xl border flex items-center gap-3 min-w-[280px] md:min-w-[300px] animate-in slide-in-from-bottom-2 md:slide-in-from-right-4 fade-in duration-300
                        bg-white text-slate-900
                        ${toast.type === 'success' ? 'border-green-500/30' : 
                          toast.type === 'error' ? 'border-red-500/30' : 
                          toast.type === 'warning' ? 'border-yellow-500/30' :
                          'border-brand-900/20'}
                    `}
                >
                    {toast.type === 'success' && <CheckCircle size={18} className="text-green-600 shrink-0" aria-hidden="true" />}
                    {toast.type === 'error' && <AlertTriangle size={18} className="text-red-600 shrink-0" aria-hidden="true" />}
                    {toast.type === 'warning' && <AlertIcon size={18} className="text-yellow-600 shrink-0" aria-hidden="true" />}
                    {toast.type === 'info' && <Info size={18} className="text-brand-900 shrink-0" aria-hidden="true" />}
                    <div>
                        <p className="text-sm font-medium leading-tight">{toast.message}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

// --- PREMIUM LOADER ---
export const PremiumLoader = ({ fullScreen = true, className = '' }) => {
  return (
    <div 
      className={`
        flex flex-col items-center justify-center 
        bg-brand-900 text-white 
        transition-opacity duration-300 ease-out
        ${fullScreen ? 'fixed inset-0 z-[9999] bg-brand-900/95 backdrop-blur-md' : 'w-full h-64 bg-transparent'}
        ${className}
      `}
      role="status"
      aria-live="polite"
      aria-label="Carregando"
    >
      {fullScreen && (
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]"></div>
      )}
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative w-24 h-24 mb-8">
          <svg className="absolute inset-0 w-full h-full animate-[spin_8s_linear_infinite] motion-reduce:animate-none" viewBox="0 0 100 100" aria-hidden="true">
            <defs>
              <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="50%" stopColor="#C9AF88" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="46" fill="none" stroke="url(#gold-gradient)" strokeWidth="1" strokeDasharray="80 200" strokeLinecap="round" />
          </svg>
        </div>
        {fullScreen && (
          <div className="text-center space-y-2 animate-fadeInUpSlow">
            <h2 className="font-serif text-lg tracking-[0.1em] text-white/90">Fundação Luso-Brasileira</h2>
            <span className="sr-only">Carregando conteúdo...</span>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Social Icons Helper ---
const SocialSVG = ({ type, className = "w-4 h-4" }: { type: keyof SocialLinks, className?: string }) => {
    const icons: Record<string, React.ReactNode> = {
        facebook: <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036c-2.148 0-2.971.956-2.971 3.594v.376h3.428l-.532 3.667h-2.896v7.981h-4.843Z"></path></svg>,
        twitter: <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M22.254 5.49c-.44.086-1.29.17-1.461.182.261-.392 1.25-1.921 1.34-2.126.027-.061.026-.145-.043-.197a.172.172 0 0 0-.173-.021c-.052.018-1.595.61-2.057.77a4.91 4.91 0 0 0-3.692-1.68c-2.956 0-5.111 2.593-4.717 5.726-3.826-.195-7.078-2.073-9.213-4.802a.267.267 0 0 0-.441.056c-1.328 2.892-.32 6.136 2.05 7.632a4.872 4.872 0 0 1-2.032-.596v.058c0 2.217 1.458 4.162 3.57 4.622-.592.162-1.32.189-1.93.07a4.977 4.977 0 0 0 4.594 3.42 9.548 9.548 0 0 1-5.783 2.022c-.37 0-.829-.026-1.127-.065a13.593 13.593 0 0 0 7.72 2.37c9.356 0 14.628-7.98 14.334-15.013.916-.685 1.83-1.636 2.083-1.986.069-.096.02-.236-.085-.262Z"></path></svg>,
        instagram: <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12.001 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm0-2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm6.5-.25a1.25 1.25 0 0 1-1.25-1.25 1.25 1.25 0 0 1 1.25-1.25 1.25 1.25 0 0 1 1.25-1.25ZM19 12a7 7 0 0 1-7 7 7 7 0 0 1-7-7 7 7 0 0 1 7 7Zm1.25-5.25a2.75 2.75 0 0 0-2.75-2.75h-9.5a2.75 2.75 0 0 0-2.75 2.75v9.5a2.75 2.75 0 0 0 2.75-2.75v-9.5Z"></path></svg>,
        linkedin: <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.47 2H3.53a1.45 1.45 0 0 0-1.47 1.43v17.14A1.45 1.45 0 0 0 3.53 22h16.94a1.45 1.45 0 0 0 1.47-1.43V3.43A1.45 1.45 0 0 0 20.47 2ZM8.09 18.74h-3v-9h3v9ZM6.59 8.48h-.02a1.57 1.57 0 1 1 .02 0Zm12.32 10.26h-3v-4.83c0-1.21-.43-2-1.52-2-.83 0-1.32.55-1.54 1.07-.08.19-.1.45-.1.71v5.05h-3v-9h3v1.37a3.24 3.24 0 0 1 2.94-1.61c2.15 0 3.76 1.38 3.76 4.36v4.88Z"></path></svg>,
        youtube: <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814ZM9.545 15.568V8.432L15.818 12l-6.273 3.568Z"></path></svg>
    };
    return icons[type] ? <span className="inline-block">{icons[type]}</span> : null;
};

export const SocialIcons = ({ links, variant = 'dark', size = 'md' }: { links: Partial<SocialLinks>, variant?: 'light' | 'dark' | 'white', size?: 'sm' | 'md' }) => {
    if (!links) return null;
    const baseClass = "flex items-center justify-center rounded-full transition-all duration-300 border focus:ring-2 focus:ring-offset-2 focus:ring-sand-400 focus:outline-none";
    const sizeClass = size === 'sm' ? "w-8 h-8 p-2" : "w-10 h-10 p-2.5";
    const variants = {
        dark: "bg-brand-900 text-white border-transparent hover:bg-sand-400 hover:text-brand-900",
        light: "bg-white/10 text-white border-white/10 hover:bg-white hover:text-brand-900",
        white: "bg-white text-brand-900 border-white hover:bg-brand-900 hover:text-white shadow-sm"
    };
    const validLinks = Object.entries(links).filter(([_, url]) => !!url);
    if (validLinks.length === 0) return null;
    return (
        <div className="flex gap-3">
            {validLinks.map(([key, url]) => (
                <a 
                    key={key} 
                    href={url as string} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className={`${baseClass} ${sizeClass} ${variants[variant]}`}
                    aria-label={`Visitar nosso ${key}`}
                >
                    <SocialSVG type={key as keyof SocialLinks} className="w-full h-full" />
                </a>
            ))}
        </div>
    );
};

// --- Primitives ---
export const Button = ({ children, variant = 'primary', className = '', isLoading = false, disabled, ...props }: any) => {
  const baseStyles = "inline-flex items-center justify-center px-6 py-3 rounded-xl font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-900/50 disabled:opacity-50 disabled:cursor-not-allowed tracking-wide text-xs uppercase relative overflow-hidden active:scale-95";
  const variants: { [key: string]: string } = {
    primary: "bg-brand-900 text-white hover:bg-black border border-brand-800 hover:border-black shadow-lg hover:shadow-xl hover:-translate-y-0.5",
    gold: "bg-sand-400 text-brand-900 font-bold hover:bg-sand-300 shadow-[0_0_20px_rgba(176,146,101,0.2)] hover:shadow-[0_0_30px_rgba(176,146,101,0.4)] border border-sand-300",
    outline: "border border-slate-200 text-slate-700 bg-white/40 backdrop-blur-md hover:bg-white hover:text-black hover:border-slate-400", 
    white: "bg-white text-brand-900 hover:bg-sand-50 shadow-premium hover:shadow-lg hover:-translate-y-0.5 border border-white",
    darkOutline: "border border-brand-900 text-brand-900 bg-transparent hover:bg-brand-900 hover:text-white",
    ghost: "text-slate-600 hover:text-brand-900 hover:bg-slate-100/50 px-4", 
    danger: "text-red-600 hover:bg-red-50 hover:text-red-700 border border-transparent hover:border-red-100" 
  };
  
  return (
    <button 
        className={`${baseStyles} ${variants[variant as string] || variants.primary} ${className}`} 
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        {...props}
    >
        {isLoading ? (
             <div className="flex items-center gap-2">
               <Loader2 size={14} className="animate-spin" />
               <span>{children}</span>
             </div>
        ) : children}
    </button>
  );
};

export const ShareActions = ({ title, url }: { title: string, url: string }) => {
    const handleShare = async () => {
        if (navigator.share) {
            try { await navigator.share({ title, url }); } catch (err) { if (import.meta.env.DEV) console.error(err); }
        } else {
            navigator.clipboard.writeText(url);
            window.dispatchEvent(new CustomEvent(FLB_TOAST_EVENT, { detail: { message: 'Link copiado!', type: 'success' } }));
        }
    };
    return (
        <Button variant="white" onClick={handleShare} className="gap-2 text-xs py-3 h-auto text-slate-700" aria-label="Compartilhar esta página">
            <Share2 size={14} /> Compartilhar
        </Button>
    );
};

export const Badge = ({ children, className = '', variant = 'light' }: any) => {
  const styles = {
    light: "bg-slate-100 text-slate-700 border-slate-200/50",
    dark: "bg-white/10 text-white/90 border-white/10 backdrop-blur-md", 
    gold: "bg-sand-400/10 text-sand-700 border-sand-400/20" 
  };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest border ${styles[variant as keyof typeof styles] || styles.light} ${className}`}>{children}</span>;
};

export const Card = ({ children, className = '', variant = 'light', ...props }: any) => {
   const variants = {
     light: "bg-white border border-slate-200/60",
     dark: "bg-brand-900 border border-white/10 text-white"
   };
   return <div className={`${variants[variant as keyof typeof variants] || variants.light} rounded-2xl ${className}`} {...props}>{children}</div>;
};

export const Carousel = ({ children, className = '' }: any) => {
    return (
        <div className={`flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 custom-scrollbar ${className}`}>
            {React.Children.map(children, child => <div className="snap-center shrink-0">{child}</div>)}
        </div>
    );
};

export const SectionWrapper = ({ children, className = '' }: any) => (
  <section className={`max-w-[1400px] mx-auto px-6 lg:px-12 py-16 ${className}`}>{children}</section>
);

export const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-slate-200 rounded-xl ${className}`} role="status" aria-label="Carregando..."></div>
);

export const AsyncContent = ({ loading, fallback, children }: any) => {
  if (loading) return fallback ? <>{fallback}</> : <div className="py-20 flex justify-center"><PremiumLoader fullScreen={false} /></div>;
  return <>{children}</>;
};

export const Input = ({ variant = 'light', className = '', ...props }: any) => {
    const styles = {
        light: "bg-white border-slate-300 text-slate-900 focus:border-sand-400 focus:ring-2 focus:ring-sand-400/20 placeholder:text-slate-500", 
        dark: "bg-white/5 border-white/20 text-white focus:border-sand-400 focus:ring-2 focus:ring-sand-400/20 placeholder:text-white/50"
    };
    return <input className={`w-full px-4 py-3 rounded-xl border outline-none transition-all text-sm ${styles[variant as keyof typeof styles] || styles.light} ${className}`} {...props} />;
};

// --- MODAL SYSTEM ---

// Standard Modal Container
export const Modal = ({ isOpen, onClose, children, className = '', titleId = "modal-title" }: any) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (modalRef.current) {
          modalRef.current.focus();
      }
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
    >
      <div 
        className="absolute inset-0 bg-brand-900/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" 
        onClick={onClose}
        aria-hidden="true"
      ></div>
      <div 
        ref={modalRef}
        className={`relative bg-white rounded-2xl shadow-2xl w-full max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200 outline-none overflow-hidden ${className}`}
        tabIndex={-1}
      >
         <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-900 z-50 transition-colors rounded-full hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300 w-10 h-10 flex items-center justify-center"
            aria-label="Fechar modal"
         >
            <X size={20} />
         </button>
         {children}
      </div>
    </div>
  );
};

// Modal Header - Fixed at top
export const ModalHeader = ({ children, className = '', id }: any) => (
    <div className={`px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 ${className}`}>
        <h2 id={id} className="text-xl font-light text-brand-900">{children}</h2>
    </div>
);

// Modal Body - Scrollable content
export const ModalBody = ({ children, className = '' }: any) => (
    <div className={`p-8 overflow-y-auto custom-scrollbar flex-grow bg-white ${className}`}>
        {children}
    </div>
);

// Modal Footer - Fixed at bottom
export const ModalFooter = ({ children, className = '' }: any) => (
    <div className={`px-8 py-5 border-t border-slate-100 bg-slate-50 shrink-0 flex justify-end gap-3 ${className}`}>
        {children}
    </div>
);

export const AsyncImage = ({ item, className = '' }: { item: GalleryItem, className?: string }) => {
  const [src, setSrc] = useState<string>('');
  
  useEffect(() => {
    let active = true;
    resolveGalleryItemSrc(item).then(url => {
        if (active && url) setSrc(url);
    });
    return () => { active = false; };
  }, [item]);

  if (!src) return <div className={`bg-slate-100 animate-pulse ${className}`} role="img" aria-label="Imagem carregando" />;
  return <img src={src} className={className} alt={item.caption || "Imagem da galeria"} />;
};

export const LoginModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const res = await loginAsEditor(email, password);
        setLoading(false);
        if (res.ok) { onClose(); setEmail(''); setPassword(''); setError(''); } else { setError(res.error || 'Erro desconhecido'); }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-md" titleId="login-title">
            <ModalBody>
                <div className="text-center mb-6">
                    <div className="w-12 h-12 bg-sand-400/20 text-sand-600 rounded-full flex items-center justify-center mx-auto mb-4"><Lock size={24} /></div>
                    <h2 id="login-title" className="text-2xl font-light text-brand-900">Acesso Restrito</h2>
                    <p className="text-slate-600 text-sm mt-1">Área exclusiva para editores.</p>
                </div>
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label htmlFor="login-email" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Email</label>
                        <Input id="login-email" type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} placeholder="seu@email.com" autoFocus />
                    </div>
                    <div>
                        <label htmlFor="login-password" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Senha</label>
                        <Input id="login-password" type="password" value={password} onChange={(e: any) => setPassword(e.target.value)} placeholder="••••••••" />
                    </div>
                    {error && <p className="text-red-600 text-xs text-center" role="alert">{error}</p>}
                    <Button type="submit" className="w-full" isLoading={loading}>{loading ? 'Entrando...' : 'Entrar'}</Button>
                </form>
            </ModalBody>
        </Modal>
    );
};

export const AccessDeniedModal = ({ isOpen, onClose, onLogin }: any) => (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-sm" titleId="access-denied-title">
        <ModalBody className="text-center">
             <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6"><Lock size={32} /></div>
             <h3 id="access-denied-title" className="text-xl font-medium text-slate-900 mb-2">Acesso Negado</h3>
             <p className="text-slate-600 text-sm mb-6">Você precisa de permissões de editor para realizar esta ação.</p>
             <div className="flex gap-3"><Button variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button><Button onClick={() => { onClose(); onLogin(); }} className="flex-1">Entrar</Button></div>
        </ModalBody>
    </Modal>
);

export const ConfirmDialog = ({ 
    isOpen, 
    title = "Confirmar exclusão", 
    description = "Esta ação é permanente e não pode ser desfeita.", 
    onConfirm, 
    onCancel, 
    confirmLabel = "Excluir definitivamente" 
}: any) => {
    const [loading, setLoading] = useState(false);
    const handleConfirm = () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            onConfirm();
        }, 500);
    };

    return (
        <Modal isOpen={isOpen} onClose={onCancel} className="max-w-md" titleId="confirm-title">
            <ModalBody>
                <div className="text-center sm:text-left">
                    <h3 id="confirm-title" className="text-xl font-medium text-slate-900 mb-2">{title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{description}</p>
                </div>
            </ModalBody>
            <ModalFooter>
                <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
                <Button variant="danger" onClick={handleConfirm} isLoading={loading}>{loading ? 'Excluindo...' : confirmLabel}</Button>
            </ModalFooter>
        </Modal>
    );
};

export const MediaManagerModal = ({ isOpen, onClose }: any) => {
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [tab, setTab] = useState<'oficial' | 'comunidade' | 'pendente'>('oficial');
    const [localEvents, setLocalEvents] = useState(EVENTS);
    const [uploading, setUploading] = useState(false);

    // Refresh on open
    useEffect(() => {
        if(isOpen) setLocalEvents([...EVENTS]);
    }, [isOpen]);

    const activeEvent = localEvents.find(e => e.id === selectedEventId);
    
    // Filtering media
    const pendingMedia = PENDING_MEDIA_SUBMISSIONS.filter(s => s.eventId === selectedEventId);
    const eventMedia = activeEvent?.gallery || [];
    const displayedMedia = tab === 'pendente' 
        ? pendingMedia 
        : eventMedia.filter(m => m.source === tab);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !selectedEventId) return;
        setUploading(true);
        const files = Array.from(e.target.files) as File[];
        for(const file of files) await addMediaToEvent(selectedEventId, file);
        setLocalEvents([...EVENTS]);
        setUploading(false);
    };

    const handleUrlAdd = () => {
       const url = prompt("URL da imagem/vídeo:");
       if (url && selectedEventId) {
           addUrlMediaToEvent(selectedEventId, url);
           setLocalEvents([...EVENTS]);
       }
    };

    const handleApprove = (id: string) => {
        approveCommunityMedia(id);
        setLocalEvents([...EVENTS]); // Refresh count
    };

    const handleReject = (id: string) => {
        rejectCommunityMedia(id);
        setLocalEvents([...EVENTS]); // Refresh count
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-5xl w-full h-[85vh] md:h-[800px]" titleId="media-manager-title">
            <ModalHeader id="media-manager-title">
                <div className="flex items-center gap-4">
                    <span>Gestão de Mídia</span>
                    {uploading && <div className="text-xs text-sand-500 font-bold animate-pulse">Enviando arquivos...</div>}
                </div>
            </ModalHeader>
            <div className="flex flex-col md:flex-row flex-grow overflow-hidden h-full">
                {/* Event List */}
                <div className="w-full md:w-1/4 h-1/3 md:h-full border-r-0 md:border-r border-b md:border-b-0 border-slate-100 overflow-y-auto bg-slate-50">
                    <div role="list">
                    {localEvents.map(evt => {
                       const pCount = PENDING_MEDIA_SUBMISSIONS.filter(s => s.eventId === evt.id).length;
                       return (
                        <button key={evt.id} onClick={() => setSelectedEventId(evt.id)} className={`w-full text-left p-4 border-b border-slate-100 cursor-pointer hover:bg-white transition-colors focus:outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-brand-900/20 ${selectedEventId === evt.id ? 'bg-white border-l-4 border-l-brand-900 shadow-sm' : ''}`}>
                            <div className="font-medium text-sm text-slate-900 truncate">{evt.title}</div>
                            <div className="flex justify-between items-center mt-2">
                                <span className="text-[10px] text-slate-500">{evt.gallery?.length || 0} items</span>
                                {pCount > 0 && <span className="bg-red-500 text-white text-[9px] px-1.5 rounded-full">{pCount}</span>}
                            </div>
                        </button>
                       );
                    })}
                    </div>
                </div>
                
                {/* Media Grid */}
                <div className="w-full md:w-3/4 h-2/3 md:h-full flex flex-col bg-white overflow-hidden">
                    {selectedEventId && activeEvent ? (
                        <>
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                                <div className="flex gap-2">
                                    <button onClick={() => setTab('oficial')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider ${tab === 'oficial' ? 'bg-brand-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>Oficial</button>
                                    <button onClick={() => setTab('comunidade')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider ${tab === 'comunidade' ? 'bg-brand-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>Comunidade</button>
                                    <button onClick={() => setTab('pendente')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider ${tab === 'pendente' ? 'bg-brand-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>Pendentes</button>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleUrlAdd} className="p-2 border rounded hover:bg-slate-50" title="Add URL" aria-label="Adicionar URL"><LinkIcon size={16}/></button>
                                    <label className={`p-2 border rounded hover:bg-slate-50 cursor-pointer bg-brand-900 text-white ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`} aria-label="Upload de arquivo"><Plus size={16}/><input type="file" multiple className="hidden" onChange={handleFileUpload} disabled={uploading}/></label>
                                </div>
                            </div>
                            <div className="flex-grow p-4 overflow-y-auto bg-slate-50/50 custom-scrollbar">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {displayedMedia.map((m: any) => (
                                        <div key={m.id} className="relative aspect-square bg-white rounded-lg shadow-sm overflow-hidden group border border-slate-200">
                                            {tab === 'pendente' ? (
                                                <img src={m.url} className="w-full h-full object-cover" alt="Mídia pendente" />
                                            ) : (
                                                <AsyncImage item={m} className="w-full h-full object-cover" />
                                            )}
                                            
                                            {/* Actions Overlay */}
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 focus-within:opacity-100">
                                                {tab === 'pendente' ? (
                                                    <>
                                                        <button onClick={() => handleApprove(m.id)} className="p-1.5 bg-green-500 text-white rounded" aria-label="Aprovar"><Check size={16}/></button>
                                                        <button onClick={() => handleReject(m.id)} className="p-1.5 bg-red-500 text-white rounded" aria-label="Rejeitar"><X size={16}/></button>
                                                    </>
                                                ) : (
                                                    <button onClick={() => { 
                                                        // Delete logic for gallery item
                                                        const newGallery = activeEvent.gallery.filter(g => g.id !== m.id);
                                                        updateEvent(activeEvent.id, { gallery: newGallery });
                                                        setLocalEvents([...EVENTS]); 
                                                    }} className="p-1.5 bg-red-500 text-white rounded" aria-label="Excluir"><Trash2 size={16}/></button>
                                                )}
                                            </div>
                                            {tab === 'pendente' && <div className="absolute bottom-0 w-full bg-black/50 text-white text-[9px] p-1 truncate">{m.authorName}</div>}
                                        </div>
                                    ))}
                                    {displayedMedia.length === 0 && <div className="col-span-2 md:col-span-4 text-center py-10 text-slate-400 italic">Nenhuma mídia nesta categoria.</div>}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-400">Selecione um evento para gerenciar.</div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

// --- CANONICAL EVENT EDITOR MODAL ---

export const EventEditorModal = ({ isOpen, onClose, event }: any) => {
    // Determine if we are creating a fresh temporary event or editing an existing one
    const isCreating = !event?.id;
    const [formData, setFormData] = useState<Partial<Event>>(event || {});
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [newImageUrl, setNewImageUrl] = useState('');
    
    // Sync when the modal opens or event prop changes
    useEffect(() => { 
        if (isOpen) {
            setFormData(event || {
                title: '',
                date: '',
                location: '',
                category: 'Outros',
                description: '',
                image: '',
                gallery: [],
                socialLinks: {}
            });
        }
    }, [isOpen, event]);

    // Save Logic
    const handleSave = () => {
        if (!formData.title) {
            window.dispatchEvent(new CustomEvent(FLB_TOAST_EVENT, { detail: { message: 'O título é obrigatório', type: 'warning' } }));
            return;
        }
        setLoading(true);
        
        // Emulate network/processing delay using async callback
        setTimeout(async () => {
            if (formData.id) {
                await updateEvent(formData.id, formData);
            } else {
                await createEvent(formData);
            }
            setLoading(false);
            onClose();
        }, 600);
    };

    // Gallery Logic
    const handleAddUrl = () => {
        if (!newImageUrl) return;
        const newItem: GalleryItem = {
            id: generateId('media'),
            kind: 'image',
            srcType: 'url',
            url: newImageUrl,
            source: 'oficial',
            status: 'published',
            createdAt: new Date().toISOString(),
            order: (formData.gallery?.length || 0)
        };
        const newGallery = [...(formData.gallery || []), newItem];
        setFormData({ ...formData, gallery: newGallery });
        setNewImageUrl('');
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;

        setUploading(true);

        try {
            let targetId = formData.id;
            if (!targetId) {
                // Auto-create draft event to attach media
                const draft = await createEvent({ ...formData, status: 'draft', title: formData.title || 'Rascunho' });
                if(draft) {
                    targetId = draft.id;
                    setFormData(draft); // Update local form to track this ID
                } else {
                    setUploading(false);
                    return;
                }
            }

            if(targetId) {
                await addEventImagesFromFiles(targetId, e.target.files);
                // Refresh from global store
                const updated = EVENTS.find(e => e.id === targetId);
                if(updated) setFormData({...updated});
            }
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const removeGalleryItem = (index: number) => {
        const newGallery = [...(formData.gallery || [])];
        newGallery.splice(index, 1);
        setFormData({ ...formData, gallery: newGallery });
        if(formData.id) updateEvent(formData.id, { gallery: newGallery }, false);
    };

    const setAsCover = async (item: GalleryItem) => {
        let url = '';
        if (item.srcType === 'url' && item.url) url = item.url;
        else {
            const resolved = await resolveGalleryItemSrc(item);
            if (resolved) url = resolved;
        }
        if (url) {
            setFormData({ ...formData, image: url, coverImage: url });
        }
    };

    const handleSocialChange = (key: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            socialLinks: { ...prev.socialLinks, [key]: value }
        }));
    };

    // Close Handler - prevent closing while uploading
    const handleClose = () => {
        if (uploading) return; // Block close during upload
        if (formData.id && formData.status === 'draft' && formData.title === 'Rascunho') {
             deleteEvent(formData.id);
        }
        onClose();
    }

    return (
        <Modal isOpen={isOpen} onClose={handleClose} className="max-w-5xl w-full mx-4 md:mx-0 bg-white" titleId="event-editor-title">
            <ModalHeader id="event-editor-title">
                <div className="flex items-center gap-3">
                    {formData.id && formData.title !== 'Rascunho' ? 'Editar Evento' : 'Novo Evento'}
                    {uploading && (
                        <span className="inline-flex items-center gap-2 text-sm font-normal text-sand-600 bg-sand-100 px-3 py-1 rounded-full">
                            <Loader2 size={14} className="animate-spin" />
                            Enviando...
                        </span>
                    )}
                </div>
            </ModalHeader>
            <ModalBody>
                <div className="grid md:grid-cols-2 gap-8 h-full">
                    {/* LEFT COLUMN: INFO & SOCIALS */}
                    <div className="space-y-8">
                        {/* Basic Info */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Info size={14}/> Informações Básicas
                            </h3>
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Título</label>
                                <Input value={formData.title || ''} onChange={(e: any) => setFormData({...formData, title: e.target.value})} placeholder="Título do Evento" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Data</label>
                                    <Input value={formData.date || ''} onChange={(e: any) => setFormData({...formData, date: e.target.value})} placeholder="DD MMM AAAA" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Categoria</label>
                                    <select 
                                        className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 outline-none text-sm focus:border-sand-400 focus:ring-2 focus:ring-sand-400/20 bg-white"
                                        value={formData.category}
                                        onChange={(e) => setFormData({...formData, category: e.target.value as any})}
                                    >
                                        <option value="Outros">Outros</option>
                                        <option value="33 Anos">33 Anos</option>
                                        <option value="Fundação">Fundação</option>
                                        <option value="Embaixada">Embaixada</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Local</label>
                                <Input value={formData.location || ''} onChange={(e: any) => setFormData({...formData, location: e.target.value})} placeholder="Localização" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Descrição</label>
                                <textarea 
                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 outline-none text-sm resize-none focus:border-sand-400 focus:ring-2 focus:ring-sand-400/20 bg-white min-h-[120px]" 
                                    rows={4} 
                                    placeholder="Descrição detalhada do evento..." 
                                    value={formData.description || ''} 
                                    onChange={(e: any) => setFormData({...formData, description: e.target.value})} 
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Imagem Capa (URL)</label>
                                <div className="flex gap-3">
                                    <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-200">
                                        {formData.image ? <img src={formData.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={16}/></div>}
                                    </div>
                                    <Input value={formData.image || ''} onChange={(e: any) => setFormData({...formData, image: e.target.value})} placeholder="https://..." className="flex-grow" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Imagem Card (estilo story, 9:16)</label>
                                <div className="flex gap-3">
                                    <div className="w-8 h-14 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-200">
                                        {formData.cardImage ? <img src={formData.cardImage} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={12}/></div>}
                                    </div>
                                    <Input value={formData.cardImage || ''} onChange={(e: any) => setFormData({...formData, cardImage: e.target.value})} placeholder="https://... (opcional, formato vertical)" className="flex-grow" />
                                </div>
                            </div>
                        </div>

                        {/* Link externo */}
                        <div className="pt-6 border-t border-slate-100">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Link2 size={14}/> Link Externo
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">URL do Link</label>
                                    <Input value={formData.links?.registration || formData.links?.website || ''} onChange={(e: any) => setFormData({...formData, links: { ...formData.links, registration: e.target.value }})} placeholder="https://..." className="text-xs" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Nome do Link (ex: "Comprar Ingressos")</label>
                                    <Input value={formData.links?.linkLabel || ''} onChange={(e: any) => setFormData({...formData, links: { ...formData.links, linkLabel: e.target.value }})} placeholder="Inscrever-se / Saber mais / Comprar Ingressos..." className="text-xs" />
                                </div>
                            </div>
                        </div>

                        {/* Socials */}
                        <div className="pt-6 border-t border-slate-100">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Share2 size={14}/> Redes Sociais
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <Input placeholder="Instagram URL" value={formData.socialLinks?.instagram || ''} onChange={(e: any) => handleSocialChange('instagram', e.target.value)} className="text-xs" />
                                <Input placeholder="Facebook URL" value={formData.socialLinks?.facebook || ''} onChange={(e: any) => handleSocialChange('facebook', e.target.value)} className="text-xs" />
                                <Input placeholder="LinkedIn URL" value={formData.socialLinks?.linkedin || ''} onChange={(e: any) => handleSocialChange('linkedin', e.target.value)} className="text-xs" />
                                <Input placeholder="YouTube URL" value={formData.socialLinks?.youtube || ''} onChange={(e: any) => handleSocialChange('youtube', e.target.value)} className="text-xs" />
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: GALLERY */}
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col h-full min-h-[400px]">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <ImageIcon size={14}/> Galeria ({formData.gallery?.length || 0})
                            </h3>
                            <div className="relative">
                                <input type="file" id="modal-upload" multiple accept="image/*" className="hidden" onChange={handleFileUpload} />
                                <label htmlFor="modal-upload" className="cursor-pointer flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider bg-brand-900 text-white px-3 py-1.5 rounded-lg hover:bg-black transition-colors">
                                    <Upload size={12}/> Upload
                                </label>
                            </div>
                        </div>

                        {/* Quick URL Add */}
                        <div className="flex gap-2 mb-4">
                            <Input 
                                placeholder="Adicionar imagem via URL..." 
                                value={newImageUrl} 
                                onChange={(e: any) => setNewImageUrl(e.target.value)} 
                                className="bg-white text-xs h-9"
                            />
                            <Button onClick={handleAddUrl} variant="outline" className="h-9 px-3 border-slate-200 bg-white"><Plus size={14}/></Button>
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-3 gap-3 overflow-y-auto custom-scrollbar pr-1 flex-grow content-start">
                            {formData.gallery?.map((item, idx) => (
                                <div key={item.id || idx} className="relative aspect-square group rounded-xl overflow-hidden bg-white shadow-sm border border-slate-200">
                                    <AsyncImage item={item} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                        <button onClick={() => setAsCover(item)} className="p-1.5 bg-sand-400 text-brand-900 rounded-full hover:scale-110 transition-transform" title="Definir como Capa">
                                            <Star size={12} fill="currentColor" />
                                        </button>
                                        <button onClick={() => removeGalleryItem(idx)} className="p-1.5 bg-red-500 text-white rounded-full hover:scale-110 transition-transform" title="Remover">
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                    <div className="absolute top-1 right-1 bg-black/50 text-white text-[8px] px-1.5 rounded backdrop-blur-sm pointer-events-none">
                                        {idx + 1}
                                    </div>
                                </div>
                            ))}
                            {(!formData.gallery || formData.gallery.length === 0) && (
                                <div className="col-span-3 h-32 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                                    <ImageIcon size={24} className="mb-2 opacity-50"/>
                                    <span className="text-xs">Galeria vazia</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </ModalBody>
            <ModalFooter>
                <Button variant="ghost" onClick={handleClose} disabled={uploading} className="text-xs">
                    {uploading ? 'Enviando...' : 'Cancelar'}
                </Button>
                <Button onClick={handleSave} isLoading={loading} disabled={uploading} className="text-xs">
                    {loading ? 'Salvando...' : uploading ? 'Aguarde o upload...' : 'Salvar Evento'}
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export const MemberEditorModal = ({ isOpen, onClose, member }: any) => {
    const [formData, setFormData] = useState<any>(member || {});
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setFormData(member || { name: '', type: 'pessoa', category: 'Parceiro', role: '', bio: '', image: '', socialLinks: {}, active: true, featured: false, order: 0 });
    }, [member, isOpen]);

    const handleSave = () => {
        if (!formData.name) {
            window.dispatchEvent(new CustomEvent(FLB_TOAST_EVENT, { detail: { message: 'Nome obrigatório', type: 'warning' } }));
            return;
        }
        if (uploading) return;
        setLoading(true);

        setTimeout(async () => {
            if (formData.id) {
                await updateMember(formData.id, formData);
            } else {
                 const newM = await createMember(false);
                 if(newM) await updateMember(newM.id, formData, true);
            }
            setLoading(false);
            onClose();
        }, 800);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        const file = e.target.files[0];

        setUploading(true);
        try {
            const publicUrl = await saveMediaBlob(file);
            setFormData({ ...formData, image: publicUrl });
        } catch (err) {
            if (import.meta.env.DEV) console.error('Upload error:', err);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleClose = () => {
        if (uploading) return;
        onClose();
    };

    const handleSocialChange = (key: string, value: string) => {
        setFormData((prev: any) => ({
            ...prev,
            socialLinks: { ...prev.socialLinks, [key]: value }
        }));
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} className="max-w-5xl w-full mx-4 md:mx-0 bg-white" titleId="member-editor-title">
            <ModalHeader id="member-editor-title">
                <div className="flex items-center gap-3">
                    {formData.id ? 'Editar Membro' : 'Novo Membro'}
                    {uploading && (
                        <span className="inline-flex items-center gap-2 text-sm font-normal text-sand-600 bg-sand-100 px-3 py-1 rounded-full">
                            <Loader2 size={14} className="animate-spin" />
                            Enviando foto...
                        </span>
                    )}
                </div>
            </ModalHeader>
            <ModalBody>
                <div className="grid md:grid-cols-2 gap-8 h-full">
                    {/* LEFT COLUMN: Basic Info & Bio */}
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Info size={14}/> Informações Básicas
                            </h3>
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Nome Completo</label>
                                <Input value={formData.name || ''} onChange={(e: any) => setFormData({...formData, name: e.target.value})} placeholder="Nome" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Tipo</label>
                                    <select
                                        className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 outline-none text-sm focus:border-sand-400 focus:ring-2 focus:ring-sand-400/20 bg-white"
                                        value={formData.type || 'pessoa'}
                                        onChange={(e) => setFormData({...formData, type: e.target.value})}
                                    >
                                        <option value="pessoa">Pessoa</option>
                                        <option value="empresa">Empresa</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Categoria</label>
                                    <select
                                        className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 outline-none text-sm focus:border-sand-400 focus:ring-2 focus:ring-sand-400/20 bg-white"
                                        value={formData.category || 'Parceiro Silver'}
                                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                                    >
                                        <option value="Parceiro Platinum">Parceiro Platinum</option>
                                        <option value="Parceiro Gold">Parceiro Gold</option>
                                        <option value="Parceiro Silver">Parceiro Silver</option>
                                        <option value="Apoio Público">Apoio Público</option>
                                        <option value="Outro Apoio">Outro Apoio</option>
                                        <option value="Exposição">Exposição</option>
                                        <option value="Governança">Governança</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Cargo / Função</label>
                                <Input value={formData.role || ''} onChange={(e: any) => setFormData({...formData, role: e.target.value})} placeholder="Ex: Presidente, CEO, Diretor..." />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Biografia</label>
                                <textarea 
                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 outline-none text-sm resize-none focus:border-sand-400 focus:ring-2 focus:ring-sand-400/20 bg-white min-h-[180px]" 
                                    rows={6}
                                    placeholder="Biografia detalhada..." 
                                    value={formData.bio || ''} 
                                    onChange={(e: any) => setFormData({...formData, bio: e.target.value})} 
                                />
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Config, Image & Socials */}
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col space-y-8 h-full">
                        
                        {/* Status & Config */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Settings size={14}/> Configurações
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col gap-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Status</label>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => setFormData({...formData, active: !formData.active})}
                                            className={`relative w-10 h-5 rounded-full transition-colors ${formData.active !== false ? 'bg-green-500' : 'bg-slate-300'}`}
                                        >
                                            <span className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${formData.active !== false ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </button>
                                        <span className="text-xs font-medium text-slate-700">{formData.active !== false ? 'Ativo' : 'Inativo'}</span>
                                    </div>
                                </div>
                                
                                <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col gap-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Destaque</label>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => setFormData({...formData, featured: !formData.featured})}
                                            className={`relative w-10 h-5 rounded-full transition-colors ${formData.featured ? 'bg-sand-400' : 'bg-slate-300'}`}
                                        >
                                            <span className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${formData.featured ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </button>
                                        <span className="text-xs font-medium text-slate-700">{formData.featured ? 'Sim' : 'Não'}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-4">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Ordem de Exibição</label>
                                <Input 
                                    type="number" 
                                    value={formData.order || 0} 
                                    onChange={(e: any) => setFormData({...formData, order: parseInt(e.target.value) || 0})} 
                                    className="bg-white"
                                />
                            </div>
                        </div>

                        {/* Image */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <ImageIcon size={14}/> Imagem de Perfil
                            </h3>
                            <div className="flex gap-4 items-start">
                                <div
                                    className="w-20 h-20 rounded-full bg-slate-200 border border-slate-300 overflow-hidden shrink-0 shadow-sm relative cursor-pointer group hover:border-sand-400 transition-colors"
                                    onClick={() => !uploading && fileInputRef.current?.click()}
                                >
                                    {formData.image ? (
                                        <img src={formData.image} className="w-full h-full object-cover" alt="Preview" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                                            <User size={24} />
                                        </div>
                                    )}
                                    {uploading ? (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                            <Loader2 size={20} className="text-white animate-spin" />
                                        </div>
                                    ) : (
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                            <Upload size={20} className="text-white" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-grow">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageUpload}
                                    />
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">URL da Imagem</label>
                                    <Input
                                        value={formData.image || ''}
                                        onChange={(e: any) => setFormData({...formData, image: e.target.value})}
                                        placeholder="https://..."
                                        className="bg-white text-xs"
                                        disabled={uploading}
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">Clique na foto para fazer upload ou cole uma URL</p>
                                </div>
                            </div>
                        </div>

                        {/* Socials & Contact */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Share2 size={14}/> Contato & Social
                            </h3>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <Input placeholder="LinkedIn URL" value={formData.socialLinks?.linkedin || ''} onChange={(e: any) => handleSocialChange('linkedin', e.target.value)} className="text-xs bg-white" />
                                    <Input placeholder="Instagram URL" value={formData.socialLinks?.instagram || ''} onChange={(e: any) => handleSocialChange('instagram', e.target.value)} className="text-xs bg-white" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <Input placeholder="Twitter URL" value={formData.socialLinks?.twitter || ''} onChange={(e: any) => handleSocialChange('twitter', e.target.value)} className="text-xs bg-white" />
                                    <Input placeholder="Facebook URL" value={formData.socialLinks?.facebook || ''} onChange={(e: any) => handleSocialChange('facebook', e.target.value)} className="text-xs bg-white" />
                                </div>
                                <div className="mt-2">
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Website</label>
                                    <div className="relative">
                                        <Input value={formData.website || ''} onChange={(e: any) => setFormData({...formData, website: e.target.value})} placeholder="https://..." className="bg-white pl-8" />
                                        <ExternalLink size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </ModalBody>
            <ModalFooter>
                <Button variant="ghost" onClick={handleClose} disabled={uploading} className="text-xs">
                    {uploading ? 'Enviando...' : 'Cancelar'}
                </Button>
                <Button onClick={handleSave} isLoading={loading} disabled={uploading} className="text-xs">
                    {loading ? 'Salvando...' : uploading ? 'Aguarde...' : 'Salvar Membro'}
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export const SettingsModal = ({ isOpen, onClose }: any) => {
    const handleBackup = () => exportState();
    const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const res = importState(ev.target?.result as string);
                if(res.success) onClose();
            };
            reader.readAsText(file);
        }
    };
    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-md w-full mx-4 md:mx-0" titleId="settings-title">
            <ModalHeader id="settings-title"><Settings size={20} className="inline mr-2" /> Configurações</ModalHeader>
            <ModalBody>
                <div className="space-y-6">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <h4 className="font-medium text-slate-900 mb-2 text-sm">Backup de Dados</h4>
                        <p className="text-xs text-slate-600 mb-4">Exporte todos os eventos, membros e logs.</p>
                        <Button onClick={handleBackup} variant="outline" className="w-full text-xs gap-2"><Download size={14} /> Exportar Backup</Button>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <h4 className="font-medium text-slate-900 mb-2 text-sm">Restaurar Dados</h4>
                        <p className="text-xs text-slate-600 mb-4">Importe um arquivo de backup.</p>
                        <div className="relative">
                            <input type="file" accept=".json" onChange={handleRestore} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" aria-label="Upload arquivo de backup" />
                            <Button variant="outline" className="w-full text-xs gap-2"><Upload size={14} /> Importar Backup</Button>
                        </div>
                    </div>
                </div>
            </ModalBody>
        </Modal>
    );
};

export const Reveal = ({ children, className = '', delay = 0 }: any) => {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsVisible(true);
                observer.disconnect();
            }
        }, { threshold: 0.1 });
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    return (
        <div 
            ref={ref} 
            className={`
                transition-all duration-1000 ease-out 
                ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 transform'} 
                ${className}
            `}
            style={{ transitionDelay: `${delay}ms` }}
            onTransitionEnd={(e) => {
                // Ensure transform is cleared after animation to prevent stacking context issues for fixed children
                if(isVisible && e.propertyName === 'transform') {
                    e.currentTarget.style.transform = 'none';
                }
            }}
        >
            {children}
        </div>
    );
};

export const StatCard = ({ label, value, icon: Icon, onClick }: any) => (
  <div onClick={onClick} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 cursor-pointer hover:border-brand-900/30 transition-all hover:shadow-md group">
    <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-900 flex items-center justify-center group-hover:bg-brand-900 group-hover:text-white transition-colors">
      <Icon size={20} />
    </div>
    <div>
       <div className="text-2xl font-light text-slate-900">{value}</div>
       <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{label}</div>
    </div>
  </div>
);

export const ListRow = ({ title, subtitle, image, onClick, actions }: any) => (
  <div onClick={onClick} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl cursor-pointer group transition-colors">
     <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-100">
        <img src={image} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" alt="" />
     </div>
     <div className="flex-grow min-w-0">
        <div className="text-sm font-medium text-slate-700 truncate group-hover:text-brand-900">{title}</div>
        <div className="text-[10px] text-slate-400 truncate">{subtitle}</div>
     </div>
     <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {actions}
     </div>
  </div>
);

export const ActivityFeed = ({ logs }: { logs: ActivityLogItem[] }) => {
    return (
        <div className="space-y-4">
            {logs.map((log) => (
                <div key={log.id} className="flex gap-3 text-xs">
                    <div className="mt-1 min-w-[6px] h-[6px] rounded-full bg-sand-400 shrink-0"></div>
                    <div>
                        <p className="text-slate-600">
                            <span className="font-bold text-slate-800">{log.user}</span> {log.action.toLowerCase()} <span className="font-medium text-brand-900">"{log.target}"</span>
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{new Date(log.timestamp).toLocaleString()}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export const UniversalListModal = ({ isOpen, onClose, title, items, onEdit, onDelete, onCreate }: any) => {
    const [q, setQ] = useState('');
    const filtered = items.filter((i: any) => (i.title || i.name).toLowerCase().includes(q.toLowerCase()));

    if(!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl h-[80vh]" titleId="list-modal">
            <ModalHeader id="list-modal">
                <div className="flex justify-between items-center w-full">
                    <span>{title}</span>
                    <div className="flex gap-2 mr-8">
                        <div className="relative">
                            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filtrar..." className="pl-8 pr-3 py-2 bg-slate-50 rounded-lg text-sm border-none focus:ring-1 focus:ring-brand-900/20" />
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                        {onCreate && <Button onClick={onCreate} className="py-2 h-auto text-xs"><Plus size={14} className="mr-1"/> Novo</Button>}
                    </div>
                </div>
            </ModalHeader>
            <div className="flex-grow overflow-y-auto p-4 bg-slate-50/50 custom-scrollbar h-full">
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    {filtered.map((item: any) => (
                         <div key={item.id} className="flex items-center gap-4 p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors last:border-0">
                             <div className="w-10 h-10 rounded bg-slate-100 shrink-0 overflow-hidden">
                                 <img src={item.image} className="w-full h-full object-cover" alt=""/>
                             </div>
                             <div className="flex-grow">
                                 <div className="font-medium text-sm text-slate-900">{item.title || item.name}</div>
                                 <div className="text-xs text-slate-500">{item.category || item.date}</div>
                             </div>
                             <div className="flex gap-2">
                                 <button onClick={() => onEdit(item)} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 text-slate-500 hover:text-brand-900"><Edit size={14}/></button>
                                 <button onClick={() => onDelete(item.id)} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-red-200 text-slate-500 hover:text-red-500"><Trash2 size={14}/></button>
                             </div>
                         </div>
                    ))}
                    {filtered.length === 0 && <div className="p-8 text-center text-slate-400 text-sm">Nenhum item encontrado.</div>}
                </div>
            </div>
        </Modal>
    );
};

const REG_TYPE_META: Record<string, { label: string; color: string }> = {
    membro:      { label: 'Membro Associado',   color: 'bg-blue-100 text-blue-700' },
    parceiro:    { label: 'Parceiro / Empresa',  color: 'bg-amber-100 text-amber-700' },
    colaborador: { label: 'Colaborador',         color: 'bg-violet-100 text-violet-700' },
    embaixador:  { label: 'Embaixador',          color: 'bg-emerald-100 text-emerald-700' },
};

const STATUS_META: Record<string, { label: string; dot: string }> = {
    novo:       { label: 'Novo',       dot: 'bg-blue-500' },
    contatado:  { label: 'Contatado',  dot: 'bg-yellow-500' },
    aprovado:   { label: 'Aprovado',   dot: 'bg-green-500' },
    rejeitado:  { label: 'Rejeitado',  dot: 'bg-red-400' },
    convertido: { label: 'Convertido', dot: 'bg-slate-400' },
};

export const PreCadastroManagerModal = ({ isOpen, onClose }: any) => {
    const [filter, setFilter] = React.useState<string>('todos');
    const [tick, setTick] = React.useState(0);

    React.useEffect(() => {
        const update = () => setTick(t => t + 1);
        window.addEventListener(FLB_STATE_EVENT, update);
        return () => window.removeEventListener(FLB_STATE_EVENT, update);
    }, []);

    if (!isOpen) return null;

    const filtered = filter === 'todos'
        ? PRECADASTROS
        : PRECADASTROS.filter((p: PreCadastro) => p.status === filter);

    const tabs = ['todos', 'novo', 'contatado', 'aprovado', 'rejeitado', 'convertido'];
    const counts: Record<string, number> = { todos: PRECADASTROS.length };
    tabs.slice(1).forEach(s => { counts[s] = PRECADASTROS.filter((p: PreCadastro) => p.status === s).length; });

    const handleStatus = (id: string, status: string) => updatePreCadastro(id, { status } as any);

    const handleCopyEmail = (email: string) => {
        navigator.clipboard.writeText(email).then(() => showToast('E-mail copiado!', 'success'));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-5xl h-[85vh]" titleId="pre-cadastro-title">
            <ModalHeader id="pre-cadastro-title">
                Pré-Registos
                {counts.novo > 0 && <span className="ml-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{counts.novo} novos</span>}
            </ModalHeader>

            {/* Filter tabs */}
            <div className="flex gap-1 px-4 py-3 border-b border-slate-100 overflow-x-auto shrink-0">
                {tabs.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setFilter(tab)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
                            filter === tab
                                ? 'bg-brand-900 text-white'
                                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                        }`}
                    >
                        {tab === 'todos' ? 'Todos' : STATUS_META[tab]?.label}
                        {counts[tab] > 0 && <span className="ml-1.5 opacity-60">{counts[tab]}</span>}
                    </button>
                ))}
            </div>

            <div className="flex-grow overflow-y-auto p-4 bg-slate-50 custom-scrollbar">
                <div className="space-y-3">
                    {filtered.length === 0 && (
                        <div className="text-center p-10 text-slate-400 text-sm italic">
                            Nenhum pré-registo {filter !== 'todos' ? `com estado "${STATUS_META[filter]?.label}"` : 'recebido'}.
                        </div>
                    )}
                    {filtered.map((pre: PreCadastro) => {
                        const regMeta = pre.registrationType ? REG_TYPE_META[pre.registrationType] : null;
                        const statusMeta = STATUS_META[pre.status] || STATUS_META.novo;
                        return (
                            <Card key={pre.id} className="p-5 flex flex-col gap-4">
                                {/* Top row: identity + badges */}
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-0.5 ${statusMeta.dot}`}></span>
                                        <h3 className="font-semibold text-slate-900 text-sm">{pre.name}</h3>
                                        {regMeta && (
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${regMeta.color}`}>
                                                {regMeta.label}
                                            </span>
                                        )}
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-wider">
                                            {pre.type}
                                        </span>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200 text-slate-400 uppercase tracking-wider">
                                            {statusMeta.label}
                                        </span>
                                    </div>
                                    <span className="text-xs text-slate-400 shrink-0">{new Date(pre.createdAt).toLocaleDateString('pt-PT')}</span>
                                </div>

                                {/* Email */}
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-600">{pre.email}</span>
                                    <button
                                        onClick={() => handleCopyEmail(pre.email)}
                                        className="text-[10px] font-bold text-brand-900/50 hover:text-brand-900 uppercase tracking-wider border border-slate-200 px-2 py-0.5 rounded transition-colors"
                                        title="Copiar e-mail"
                                    >
                                        Copiar
                                    </button>
                                </div>

                                {/* Message */}
                                {pre.message && (
                                    <div className="text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-lg italic border border-slate-100">
                                        "{pre.message}"
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-50">
                                    {pre.status === 'novo' && (
                                        <button onClick={() => handleStatus(pre.id, 'contatado')} className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 transition-colors">
                                            Marcar Contatado
                                        </button>
                                    )}
                                    {pre.status !== 'aprovado' && pre.status !== 'convertido' && pre.status !== 'rejeitado' && (
                                        <button onClick={() => handleStatus(pre.id, 'aprovado')} className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors">
                                            Aprovar
                                        </button>
                                    )}
                                    {pre.status !== 'rejeitado' && pre.status !== 'convertido' && (
                                        <button onClick={() => handleStatus(pre.id, 'rejeitado')} className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors">
                                            Rejeitar
                                        </button>
                                    )}
                                    {pre.status !== 'convertido' && (
                                        <button onClick={() => convertPreCadastroToMember(pre.id)} className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-brand-900 text-white hover:bg-brand-800 transition-colors">
                                            Converter em {pre.registrationType === 'parceiro' ? 'Parceiro' : 'Membro'}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleCopyEmail(pre.email)}
                                        className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-colors"
                                        title="Copia o e-mail para criar conta no Supabase"
                                    >
                                        Conceder Acesso
                                    </button>
                                    <button onClick={() => deletePreCadastro(pre.id)} className="ml-auto text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                                        Eliminar
                                    </button>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </Modal>
    );
};

export const Lightbox = ({ isOpen, onClose, media, currentIndex, onNext, onPrev }: any) => {
    if (!isOpen) return null;
    const currentItem = media[currentIndex];
    if(!currentItem) return null;

    return (
        <div className="fixed inset-0 z-[10001] bg-black/95 flex flex-col animate-in fade-in duration-300">
            <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white p-2 z-20"><X size={32}/></button>
            <div className="flex-grow flex items-center justify-center relative p-4 md:p-10">
                {media.length > 1 && (
                    <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="absolute left-4 md:left-8 text-white/50 hover:text-white hover:scale-110 transition-all p-4"><ChevronLeft size={48}/></button>
                )}
                
                <div className="relative max-w-full max-h-full">
                    {currentItem.type === 'video' ? (
                         <div className="aspect-video w-full h-full max-h-[80vh]">
                            <iframe 
                                src={currentItem.src.replace('watch?v=', 'embed/')} 
                                className="w-full h-full" 
                                frameBorder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowFullScreen
                            ></iframe>
                         </div>
                    ) : (
                        <img src={currentItem.src} className="max-w-full max-h-[85vh] object-contain shadow-2xl" alt="" />
                    )}
                    {currentItem.caption && <div className="absolute bottom-[-3rem] left-0 w-full text-center text-white/80 text-sm font-light">{currentItem.caption}</div>}
                    {currentItem.authorName && <div className="absolute top-4 left-4 bg-black/50 text-white text-xs px-2 py-1 rounded">Foto por: {currentItem.authorName}</div>}
                </div>

                {media.length > 1 && (
                    <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="absolute right-4 md:right-8 text-white/50 hover:text-white hover:scale-110 transition-all p-4"><ChevronRight size={48}/></button>
                )}
            </div>
            <div className="h-20 border-t border-white/10 flex items-center justify-center gap-2 overflow-x-auto px-4">
                {media.map((m: any, idx: number) => (
                    <button key={idx} onClick={() => { if(idx !== currentIndex) { /* Logic to jump could be added here but simple navigation is mostly prev/next */ } }} className={`h-12 w-12 rounded-lg overflow-hidden border-2 transition-all ${idx === currentIndex ? 'border-brand-500 scale-110' : 'border-transparent opacity-50 hover:opacity-100'}`}>
                        <img src={m.type === 'video' ? (m.thumbnailUrl || m.src) : m.src} className="w-full h-full object-cover" alt="" />
                    </button>
                ))}
            </div>
        </div>
    );
};
