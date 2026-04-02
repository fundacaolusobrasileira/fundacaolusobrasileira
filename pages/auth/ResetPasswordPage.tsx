import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input, Button, Badge, PremiumLoader } from '../../components/ui';
import { BrandLogo } from '../../components/domain';
import { supabase } from '../../supabaseClient';
import { usePageMeta } from '../../hooks/usePageMeta';
import { ArrowLeft, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { ResetPasswordSchema } from '../../validation/schemas';

export const ResetPasswordPage = () => {
  usePageMeta("Redefinir Senha", "Crie uma nova senha para aceder ao portal.");

  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Supabase detects the recovery token from the URL and fires PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });

    // Also check if session already exists (in case component mounts after event fires)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = ResetPasswordSchema.safeParse({ password, confirm });
    if (!parsed.success) {
      setMessage({ type: 'error', text: parsed.error.issues[0]?.message || 'Dados inválidos.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      setMessage({ type: 'error', text: 'Erro ao redefinir a senha. O link pode ter expirado.' });
    } else {
      setMessage({ type: 'success', text: 'Senha redefinida com sucesso!' });
      setTimeout(() => navigate('/login'), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-brand-950 flex relative overflow-hidden">

      {/* LEFT COLUMN */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-brand-900 overflow-hidden flex-col justify-between p-16 xl:p-20 shrink-0">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2669&auto=format&fit=crop"
            alt="Fundacao Interior"
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-brand-900/60 mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-brand-900 via-brand-900/40 to-transparent"></div>
        </div>

        <div className="relative z-10 h-full flex flex-col justify-between">
          <div>
            <Link to="/" className="inline-block group">
              <BrandLogo variant="original" />
            </Link>
          </div>
          <div className="max-w-md">
            <div className="w-12 h-1 bg-sand-400 mb-8"></div>
            <h2 className="text-4xl xl:text-6xl font-serif text-white leading-[1.1] mb-8">
              Preservando o legado, <br />
              <span className="italic text-white/50">construindo o futuro.</span>
            </h2>
            <p className="text-white/60 font-light leading-relaxed text-lg">
              Bem-vindo ao portal exclusivo para curadores, parceiros e associados da nossa rede internacional.
            </p>
          </div>
          <div className="text-white/20 text-xs font-mono uppercase tracking-widest">
            &copy; {new Date().getFullYear()} FLB - Lisboa / Brasilia
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 relative bg-[#050A08] shrink-0">
        <div className="absolute top-8 left-8 lg:hidden z-20">
          <Link to="/" className="text-white/40 hover:text-white transition-colors">
            <ArrowLeft size={24} />
          </Link>
        </div>

        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-brand-800/30 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-sand-900/10 rounded-full blur-[100px]"></div>
        </div>

        <div className="w-full max-w-md relative z-10 animate-fadeInUpSlow">

          <div className="lg:hidden mb-12 text-center flex justify-center">
            <BrandLogo variant="original" />
          </div>

          <div className="mb-10">
            <Badge variant="gold" className="mb-6">Nova Senha</Badge>
            <h1 className="text-4xl md:text-5xl font-light text-white mb-3 tracking-tight">Redefinir Senha</h1>
            <p className="text-white/40 font-light text-base">Crie uma nova senha de acesso ao portal.</p>
          </div>

          {!sessionReady ? (
            <div className="p-6 bg-white/5 border border-white/10 rounded-xl text-center space-y-3">
              <div className="w-8 h-8 border-2 border-sand-400/40 border-t-sand-400 rounded-full animate-spin mx-auto"></div>
              <p className="text-white/40 text-sm">A verificar o link de redefinição...</p>
              <p className="text-white/20 text-xs">Se esta mensagem persistir, o link pode ter expirado.<br />
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-sand-400 hover:text-white transition-colors mt-1"
                >
                  Solicitar novo link
                </button>
              </p>
            </div>
          ) : message?.type === 'success' ? (
            <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-xl text-center space-y-4">
              <CheckCircle2 size={40} className="text-green-400 mx-auto" />
              <p className="text-green-400 font-medium">{message.text}</p>
              <p className="text-white/40 text-sm">A redirecionar para o login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2 group">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] ml-1 group-focus-within:text-sand-400 transition-colors">Nova Senha</label>
                <div className="relative">
                  <Input
                    type="password"
                    required
                    variant="dark"
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={(e: any) => setPassword(e.target.value)}
                    className="pl-12 bg-white/5 border-white/10 focus:border-sand-400/50 focus:bg-white/10 transition-all h-14"
                  />
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-sand-400 transition-colors" size={18} />
                </div>
              </div>

              <div className="space-y-2 group">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] ml-1 group-focus-within:text-sand-400 transition-colors">Confirmar Senha</label>
                <div className="relative">
                  <Input
                    type="password"
                    required
                    variant="dark"
                    placeholder="Repita a senha"
                    value={confirm}
                    onChange={(e: any) => setConfirm(e.target.value)}
                    className="pl-12 bg-white/5 border-white/10 focus:border-sand-400/50 focus:bg-white/10 transition-all h-14"
                  />
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-sand-400 transition-colors" size={18} />
                </div>
              </div>

              {message?.type === 'error' && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  <AlertCircle size={18} className="shrink-0" />
                  <span>{message.text}</span>
                </div>
              )}

              <div className="pt-6">
                <Button
                  variant="gold"
                  type="submit"
                  className="w-full text-xs py-5 rounded-xl font-bold tracking-widest hover:scale-[1.02] active:scale-[0.98]"
                  disabled={loading}
                >
                  {loading ? 'A guardar...' : 'Redefinir Senha'}
                </Button>
              </div>
            </form>
          )}

          <div className="mt-16 flex justify-center lg:justify-start">
            <Link to="/login" className="flex items-center gap-2 text-white/20 hover:text-white transition-colors text-xs uppercase tracking-widest font-bold group">
              <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Voltar ao Login
            </Link>
          </div>
        </div>
      </div>

      {loading && <PremiumLoader />}
    </div>
  );
};
