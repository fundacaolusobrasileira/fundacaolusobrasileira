import React, { useState } from 'react';
import { Input, Button } from '../../components/ui';
import { createPreCadastro } from '../../App';
import { usePageMeta } from '../../hooks/usePageMeta';
import { ArrowLeft, Users, Handshake, Heart, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { RegistrationType } from '../../types';
import { PreCadastroSchema } from '../../validation/schemas';

const REGISTRATION_TYPES: {
  value: RegistrationType;
  label: string;
  subtitle: string;
  icon: React.ElementType;
}[] = [
  {
    value: 'membro',
    label: 'Membro Associado',
    subtitle: 'Participe das iniciativas e eventos da Fundação',
    icon: Users,
  },
  {
    value: 'parceiro',
    label: 'Parceiro / Empresa',
    subtitle: 'Estabeleça uma parceria institucional ou empresarial',
    icon: Handshake,
  },
  {
    value: 'colaborador',
    label: 'Colaborador',
    subtitle: 'Voluntário ou prestador de serviços à Fundação',
    icon: Heart,
  },
  {
    value: 'embaixador',
    label: 'Embaixador',
    subtitle: 'Represente a Fundação na sua região ou país',
    icon: Globe,
  },
];

export const PreCadastroPage = () => {
  usePageMeta("Pré-Registo – Fundação Luso-Brasileira", "Inscreva-se para participar das nossas iniciativas e junte-se a nossa comunidade.");

  const [registrationType, setRegistrationType] = useState<RegistrationType | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', type: 'individual', message: '' });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const parsed = PreCadastroSchema.safeParse({
      registrationType: registrationType ?? undefined,
      name: formData.name,
      email: formData.email,
      type: formData.type,
      message: formData.message || undefined,
    });

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      parsed.error.errors.forEach(err => {
        if (err.path[0]) errors[String(err.path[0])] = err.message;
      });
      setFieldErrors(errors);
      return;
    }

    setStatus('submitting');

    const result = await createPreCadastro({
      name: formData.name,
      email: formData.email,
      type: formData.type,
      registrationType: registrationType!,
      message: formData.message,
    });

    if (result?.success) {
      setStatus('success');
      setFormData({ name: '', email: '', type: 'individual', message: '' });
      setRegistrationType(null);
    } else {
      setStatus('idle');
    }
  };

  return (
    <div className="min-h-screen bg-brand-900 flex flex-col pt-32 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[80vw] h-[80vw] bg-brand-800 rounded-full blur-[150px] opacity-40"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-black rounded-full blur-[120px] opacity-60"></div>
      </div>

      <div className="flex-grow flex items-center justify-center py-20 px-6 relative z-10">
        <div className="bg-white/5 backdrop-blur-2xl w-full max-w-3xl rounded-[3rem] shadow-2xl border border-white/10 p-12 md:p-20 animate-fadeInUpSlow">

          <div className="mb-12">
            <Link to="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-8 text-xs font-bold uppercase tracking-widest">
              <ArrowLeft size={14} /> Voltar ao Início
            </Link>
            <h1 className="text-5xl font-light tracking-tighter text-white mb-4">Pré-Registo</h1>
            <p className="text-xl text-white/50 font-light max-w-lg leading-relaxed">
              Diga-nos como gostaria de fazer parte da nossa rede.
            </p>
          </div>

          {status === 'success' ? (
            <div className="bg-brand-800/50 text-white p-16 rounded-[2rem] text-center animate-in fade-in zoom-in border border-white/5">
              <div className="w-24 h-24 bg-brand-700/50 rounded-full flex items-center justify-center mx-auto mb-8 text-4xl shadow-lg text-sand-400 border border-white/5">&#10003;</div>
              <h3 className="text-3xl font-light mb-4 tracking-tight">Registo Enviado</h3>
              <p className="text-white/60 mb-10 text-lg font-light">Entraremos em contacto em breve.</p>
              <button onClick={() => setStatus('idle')} className="text-xs font-bold tracking-widest uppercase text-sand-400 hover:text-white transition-colors border-b border-sand-400/30 pb-1">Enviar outro</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-10">

              {/* REGISTRATION TYPE */}
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.15em] ml-2">
                  Tipo de Registo <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {REGISTRATION_TYPES.map(({ value, label, subtitle, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRegistrationType(value)}
                      className={`flex items-start gap-4 p-5 rounded-2xl border text-left transition-all duration-300 ${
                        registrationType === value
                          ? 'border-sand-400 bg-sand-400/10 shadow-lg shadow-sand-400/10'
                          : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        registrationType === value ? 'bg-sand-400 text-brand-900' : 'bg-white/10 text-white/50'
                      }`}>
                        <Icon size={18} />
                      </div>
                      <div>
                        <div className={`font-semibold text-sm mb-1 transition-colors ${registrationType === value ? 'text-sand-400' : 'text-white/80'}`}>
                          {label}
                        </div>
                        <div className="text-xs text-white/40 font-light leading-relaxed">{subtitle}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* NAME + EMAIL */}
              <div className="grid md:grid-cols-2 gap-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.15em] ml-2">Nome Completo</label>
                  <Input
                    type="text"
                    variant="dark"
                    value={formData.name}
                    onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="O seu nome"
                  />
                  {fieldErrors.name && <p className="text-red-400 text-xs ml-2">{fieldErrors.name}</p>}
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.15em] ml-2">E-mail</label>
                  <Input
                    type="email"
                    variant="dark"
                    value={formData.email}
                    onChange={(e: any) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="seu@email.com"
                  />
                  {fieldErrors.email && <p className="text-red-400 text-xs ml-2">{fieldErrors.email}</p>}
                </div>
              </div>

              {/* PERFIL */}
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.15em] ml-2">Perfil</label>
                <div className="grid grid-cols-3 gap-4">
                  {['Individual', 'Empresarial', 'Académico'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: t.toLowerCase() })}
                      className={`py-4 px-2 rounded-2xl text-sm font-medium border transition-all duration-500 ${
                        formData.type === t.toLowerCase()
                          ? 'border-sand-400 bg-sand-400 text-brand-900 shadow-lg'
                          : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* MESSAGE */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.15em] ml-2">Mensagem (Opcional)</label>
                <textarea
                  rows={4}
                  value={formData.message}
                  onChange={e => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-6 py-5 rounded-2xl bg-white/5 border border-white/10 focus:bg-white/10 focus:border-sand-400/50 focus:ring-1 focus:ring-sand-400/20 outline-none transition-all resize-none placeholder-white/20 text-lg text-white font-light"
                  placeholder="Conte-nos um pouco sobre o seu interesse..."
                />
                {fieldErrors.message && <p className="text-red-400 text-xs ml-2">{fieldErrors.message}</p>}
              </div>

              <Button
                variant="gold"
                type="submit"
                className="w-full py-5 text-xs rounded-2xl mt-4"
                disabled={status === 'submitting' || !registrationType}
              >
                {status === 'submitting' ? 'Enviando...' : 'Enviar Registo'}
              </Button>

              {fieldErrors.registrationType && (
                <p className="text-center text-red-400 text-xs">{fieldErrors.registrationType}</p>
              )}
              {!registrationType && !fieldErrors.registrationType && (
                <p className="text-center text-white/30 text-xs">Selecione um tipo de registo para continuar.</p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
