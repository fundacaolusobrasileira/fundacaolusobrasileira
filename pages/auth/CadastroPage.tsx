import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Input, Button, PremiumLoader } from '../../components/ui';
import { signUp } from '../../services/auth.service';
import { usePageMeta } from '../../hooks/usePageMeta';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { CadastroSchema } from '../../validation/schemas';

export const CadastroPage = () => {
  usePageMeta("Criar Conta – Fundacao Luso-Brasileira", "Crie sua conta e faca parte da nossa comunidade.");

  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    type: 'individual'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const result = CadastroSchema.safeParse(formData);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach(err => {
        if (err.path[0]) errors[String(err.path[0])] = err.message;
      });
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    const signUpResult = await signUp(formData.email, formData.password, formData.name, formData.type);
    setLoading(false);

    if (signUpResult.ok) {
      setSuccess(true);
    } else {
      setError(signUpResult.error || 'Erro ao criar conta.');
    }
  };

  return (
    <div className="min-h-screen bg-brand-900 flex items-center justify-center pt-32 pb-20 px-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-[-20%] left-[-10%] w-[80vw] h-[80vw] bg-brand-800 rounded-full blur-[150px] opacity-40"></div>
      </div>

      <Card variant="dark" className="w-full max-w-lg p-10 md:p-14 rounded-[2.5rem] shadow-2xl animate-fadeInUpSlow border-white/10">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-light text-white mb-2 tracking-tight">Criar Conta</h1>
          <p className="text-white/50 font-light text-sm">Junte-se a nossa comunidade</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.15em] ml-2">Nome Completo</label>
            <Input
              type="text"
              variant="dark"
              placeholder="Seu nome"
              value={formData.name}
              onChange={(e: any) => setFormData({...formData, name: e.target.value})}
            />
            {fieldErrors.name && <p className="text-red-400 text-xs ml-2">{fieldErrors.name}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.15em] ml-2">Email</label>
            <Input
              type="email"
              variant="dark"
              placeholder="seu@email.com"
              value={formData.email}
              onChange={(e: any) => setFormData({...formData, email: e.target.value})}
            />
            {fieldErrors.email && <p className="text-red-400 text-xs ml-2">{fieldErrors.email}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.15em] ml-2">Senha</label>
            <Input
              type="password"
              variant="dark"
              placeholder="Mínimo 8 caracteres"
              value={formData.password}
              onChange={(e: any) => setFormData({...formData, password: e.target.value})}
            />
            {fieldErrors.password && <p className="text-red-400 text-xs ml-2">{fieldErrors.password}</p>}
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.15em] ml-2">Tipo de Perfil</label>
            <div className="grid grid-cols-2 gap-4">
              {['Individual', 'Institucional'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({...formData, type: type.toLowerCase()})}
                  className={`py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                    formData.type === type.toLowerCase()
                      ? 'border-sand-400 bg-sand-400 text-brand-900 shadow-lg'
                      : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">
              <CheckCircle size={18} className="shrink-0" />
              <span>Conta criada! Verifique seu email para confirmar.</span>
            </div>
          )}

          <div className="pt-6">
            <Button variant="gold" type="submit" className="w-full text-xs py-5" disabled={loading || success}>
              {loading ? 'Criando conta...' : success ? 'Conta Criada!' : 'Cadastrar'}
            </Button>
          </div>
        </form>

        <div className="mt-10 text-center border-t border-white/5 pt-8">
          <p className="text-white/40 font-light text-sm">
            Ja tem uma conta?{' '}
            <Link to="/login" className="text-sand-400 font-medium hover:text-white transition-colors">
              Entrar
            </Link>
          </p>
        </div>
      </Card>

      {/* Overlay Loading */}
      {loading && <PremiumLoader />}
    </div>
  );
};
