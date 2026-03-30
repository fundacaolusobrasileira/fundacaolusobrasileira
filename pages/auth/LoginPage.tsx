import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input, Button, Badge, PremiumLoader } from '../../components/ui';
import { BrandLogo } from '../../components/domain';
import { loginAsEditor } from '../../services/auth.service';
import { supabase } from '../../supabaseClient';
import { usePageMeta } from '../../hooks/usePageMeta';
import { ArrowLeft, Lock, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { LoginSchema } from '../../validation/schemas';

export const LoginPage = () => {
  usePageMeta("Portal do Membro", "Acesso exclusivo para membros e parceiros da Fundacao Luso-Brasileira.");

  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = LoginSchema.safeParse(formData);
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message || 'Dados inválidos.');
      return;
    }

    setLoading(true);
    const result = await loginAsEditor(formData.email, formData.password);
    setLoading(false);

    if (result.ok) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Erro ao fazer login.');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    setResetLoading(true);
    setResetMessage(null);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: window.location.origin + '/#/reset-password',
    });
    setResetLoading(false);
    if (error) {
      setResetMessage({ type: 'error', text: 'Erro ao enviar email. Tente novamente.' });
    } else {
      setResetMessage({ type: 'success', text: 'Email enviado! Verifique a sua caixa de entrada.' });
    }
  };

  return (
    <div className="min-h-screen bg-brand-950 flex relative overflow-hidden">

      {/* 1. LEFT COLUMN - VISUAL & IDENTITY */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-brand-900 overflow-hidden flex-col justify-between p-16 xl:p-20 shrink-0">
        {/* Background Image - High Quality Architecture */}
        <div className="absolute inset-0 z-0">
           <img
             src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2669&auto=format&fit=crop"
             alt="Fundacao Interior"
             className="w-full h-full object-cover opacity-50 mix-blend-normal"
           />
           {/* Overlays for readability and branding */}
           <div className="absolute inset-0 bg-brand-900/60 mix-blend-multiply"></div>
           <div className="absolute inset-0 bg-gradient-to-t from-brand-900 via-brand-900/40 to-transparent"></div>
        </div>

        {/* Content Layer */}
        <div className="relative z-10 h-full flex flex-col justify-between">
           {/* Logo Area */}
           <div>
             <Link to="/" className="inline-block group">
                <BrandLogo variant="original" />
             </Link>
           </div>

           {/* Editorial Text */}
           <div className="max-w-md">
              <div className="w-12 h-1 bg-sand-400 mb-8"></div>
              <h2 className="text-4xl xl:text-6xl font-serif text-white leading-[1.1] mb-8">
                Preservando o legado, <br/>
                <span className="italic text-white/50">construindo o futuro.</span>
              </h2>
              <p className="text-white/60 font-light leading-relaxed text-lg">
                Bem-vindo ao portal exclusivo para curadores, parceiros e associados da nossa rede internacional.
              </p>
           </div>

           {/* Footer Copyright */}
           <div className="text-white/20 text-xs font-mono uppercase tracking-widest">
              &copy; {new Date().getFullYear()} FLB - Lisboa / Brasilia
           </div>
        </div>
      </div>

      {/* 2. RIGHT COLUMN - FORM */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 relative bg-[#050A08] shrink-0">
         {/* Mobile Back Button (Only visible on small screens) */}
         <div className="absolute top-8 left-8 lg:hidden z-20">
            <Link to="/" className="text-white/40 hover:text-white transition-colors">
               <ArrowLeft size={24} />
            </Link>
         </div>

         {/* Decorative Background Elements */}
         <div className="absolute inset-0 pointer-events-none overflow-hidden">
             <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-brand-800/30 rounded-full blur-[120px]"></div>
             <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-sand-900/10 rounded-full blur-[100px]"></div>
         </div>

         <div className="w-full max-w-md relative z-10 animate-fadeInUpSlow">

            {/* Mobile Logo */}
            <div className="lg:hidden mb-12 text-center flex justify-center">
               <BrandLogo variant="original" />
            </div>

            <div className="mb-10">
               <Badge variant="gold" className="mb-6">Area Restrita</Badge>
               <h1 className="text-4xl md:text-5xl font-light text-white mb-3 tracking-tight">Login</h1>
               <p className="text-white/40 font-light text-base">Insira suas credenciais para continuar.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2 group">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] ml-1 group-focus-within:text-sand-400 transition-colors">Email Institucional</label>
                <div className="relative">
                   <Input
                     type="email"
                     required
                     variant="dark"
                     placeholder="seu@email.com"
                     value={formData.email}
                     onChange={(e: any) => setFormData({...formData, email: e.target.value})}
                     className="pl-12 bg-white/5 border-white/10 focus:border-sand-400/50 focus:bg-white/10 transition-all h-14"
                   />
                   <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-sand-400 transition-colors" size={18} />
                </div>
              </div>

              <div className="space-y-2 group">
                 <div className="flex justify-between items-center ml-1">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] group-focus-within:text-sand-400 transition-colors">Senha</label>
                    <button type="button" onClick={() => { setShowForgotPassword(v => !v); setResetMessage(null); }} className="text-[10px] text-white/60 hover:text-sand-400 transition-colors">Esqueci a senha</button>
                 </div>
                <div className="relative">
                   <Input
                     type="password"
                     required
                     variant="dark"
                     placeholder="--------"
                     value={formData.password}
                     onChange={(e: any) => setFormData({...formData, password: e.target.value})}
                     className="pl-12 bg-white/5 border-white/10 focus:border-sand-400/50 focus:bg-white/10 transition-all h-14"
                   />
                   <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-sand-400 transition-colors" size={18} />
                </div>
              </div>

              {showForgotPassword && (
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
                  <p className="text-white/60 text-xs">Insira o seu email para receber o link de redefinição:</p>
                  <form onSubmit={handleForgotPassword} className="flex gap-2">
                    <Input
                      type="email"
                      required
                      variant="dark"
                      placeholder="seu@email.com"
                      value={resetEmail}
                      onChange={(e: any) => setResetEmail(e.target.value)}
                      className="bg-white/5 border-white/10 focus:border-sand-400/50 h-10 text-sm flex-grow"
                    />
                    <Button variant="gold" type="submit" className="text-xs px-4 h-10 shrink-0" disabled={resetLoading}>
                      {resetLoading ? '...' : 'Enviar'}
                    </Button>
                  </form>
                  {resetMessage && (
                    <div className={`flex items-center gap-2 text-xs ${resetMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                      {resetMessage.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                      {resetMessage.text}
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  <AlertCircle size={18} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="pt-6">
                <Button variant="gold" type="submit" className="w-full text-xs py-5 rounded-xl font-bold tracking-widest hover:scale-[1.02] active:scale-[0.98]" disabled={loading}>
                  {loading ? 'Autenticando...' : 'Acessar Portal'}
                </Button>
              </div>
            </form>

            <div className="mt-12 text-center">
               <p className="text-white/60 font-light text-sm">
                 Ainda nao e membro?{' '}
                 <Link to="/precadastro" className="text-sand-400 font-medium hover:text-white transition-colors border-b border-sand-400/30 pb-0.5">
                   Solicitar acesso
                 </Link>
               </p>
            </div>

            <div className="mt-16 flex justify-center lg:justify-start">
               <Link to="/" className="flex items-center gap-2 text-white/20 hover:text-white transition-colors text-xs uppercase tracking-widest font-bold group">
                  <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Voltar ao Site
               </Link>
            </div>
         </div>
      </div>

      {/* Overlay Loading */}
      {loading && <PremiumLoader />}
    </div>
  );
};
