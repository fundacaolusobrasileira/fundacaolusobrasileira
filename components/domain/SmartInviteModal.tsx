// components/domain/SmartInviteModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { subscribeToNewsletter } from '../../App';
import { Button } from '../ui/Button';
import { Input } from '../ui/Forms';

export const SmartInviteModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [step, setStep] = useState(1);

  useEffect(() => {
    const seen = localStorage.getItem('flb_invite_seen');
    if (!seen) {
      const timer = setTimeout(() => setIsOpen(true), 15000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('flb_invite_seen', 'true');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      subscribeToNewsletter(email);
      setStep(2);
      setTimeout(handleClose, 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-700">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 md:w-96 border border-slate-100 relative overflow-hidden">
        <button onClick={handleClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900"><X size={16} /></button>

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
  );
};
