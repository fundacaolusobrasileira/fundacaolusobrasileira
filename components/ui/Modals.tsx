// components/ui/Modals.tsx
import React, { useEffect, useRef, useState } from 'react';
import { X, Lock } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Forms';
import { loginAsEditor } from '../../App';

// --- Standard Modal Container ---
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

// Modal Header
export const ModalHeader = ({ children, className = '', id }: any) => (
  <div className={`px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 ${className}`}>
    <h2 id={id} className="text-xl font-light text-brand-900">{children}</h2>
  </div>
);

// Modal Body
export const ModalBody = ({ children, className = '' }: any) => (
  <div className={`p-8 overflow-y-auto custom-scrollbar flex-grow bg-white ${className}`}>
    {children}
  </div>
);

// Modal Footer
export const ModalFooter = ({ children, className = '' }: any) => (
  <div className={`px-8 py-5 border-t border-slate-100 bg-slate-50 shrink-0 flex justify-end gap-3 ${className}`}>
    {children}
  </div>
);

// --- Login Modal ---
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
    if (res.ok) { onClose(); setEmail(''); setPassword(''); setError(''); }
    else { setError(res.error || 'Erro desconhecido'); }
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

// --- Access Denied Modal ---
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

// --- Confirm Dialog ---
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
