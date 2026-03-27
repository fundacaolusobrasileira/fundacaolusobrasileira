// components/ui/Toast.tsx
import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertTriangle, Info, AlertCircle as AlertIcon } from 'lucide-react';
import { FLB_TOAST_EVENT } from '../../store/app.store';

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
