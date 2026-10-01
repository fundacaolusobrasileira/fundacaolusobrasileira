// router.tsx
import React, { lazy, Suspense, useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PremiumLoader } from './components/ui/Loaders';
import { AUTH_SESSION, AUTH_LOADING, FLB_STATE_EVENT, isEditor } from './store/app.store';

const isChunkLoadError = (error: Error) =>
  error.message.includes('dynamically imported module') ||
  error.message.includes('Loading chunk') ||
  error.message.includes('Importing a module script failed');

/**
 * Trata APENAS falhas de carregamento de chunk (deploy novo invalidou o asset).
 * Qualquer outro erro é relançado para o ErrorBoundary global, que mostra UI ao
 * utilizador — este boundary nunca pode resultar em ecrã branco silencioso.
 */
export class ChunkErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { chunkErrored: boolean }
> {
  // Ver nota em components/ui/ErrorBoundary.tsx: sem `@types/react`, `props` não
  // vem tipado da classe base. `declare` não altera o runtime.
  declare props: { children: React.ReactNode };
  state = { chunkErrored: false };

  static getDerivedStateFromError(error: Error) {
    if (isChunkLoadError(error)) return { chunkErrored: true };
    // Não é erro de chunk: não absorve — deixa subir para o ErrorBoundary global.
    throw error;
  }

  componentDidCatch(error: Error) {
    if (isChunkLoadError(error) && !sessionStorage.getItem('chunk_reload')) {
      sessionStorage.setItem('chunk_reload', '1');
      window.location.reload();
    }
  }

  render() {
    if (this.state.chunkErrored) {
      // O reload automático já foi tentado (ou já tinha sido gasto nesta sessão):
      // mostrar recuperação manual em vez de ecrã branco.
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-2xl font-serif text-brand-900">Atualizacao disponivel</h1>
          <p className="max-w-md text-slate-500 font-light">
            Esta pagina foi atualizada enquanto tinha o site aberto. Recarregue para continuar.
          </p>
          <button
            type="button"
            onClick={() => { sessionStorage.removeItem('chunk_reload'); window.location.reload(); }}
            className="px-5 py-2.5 rounded-full bg-brand-900 text-white text-sm hover:bg-brand-800 transition-colors"
          >
            Recarregar pagina
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const ProtectedRoute = ({ children, requireEditor = false }: { children: React.ReactNode; requireEditor?: boolean }) => {
  // Subscribe to auth state changes so the component re-renders reactively
  const [, setTick] = useState(0);
  useEffect(() => {
    const handler = () => setTick(t => t + 1);
    window.addEventListener(FLB_STATE_EVENT, handler);
    return () => window.removeEventListener(FLB_STATE_EVENT, handler);
  }, []);

  if (AUTH_LOADING) return <PremiumLoader />;
  if (!AUTH_SESSION.isLoggedIn) return <Navigate to="/login" replace />;
  if (requireEditor && !isEditor()) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const HomePage = lazy(() => import('./pages/home/HomePage').then(m => ({ default: m.HomePage })));
const NotFoundPage = lazy(() => import('./pages/home/HomePage').then(m => ({ default: m.NotFoundPage })));
const QuemSomosPage = lazy(() => import('./pages/quem-somos/QuemSomosPage').then(m => ({ default: m.QuemSomosPage })));
const AdminPage = lazy(() => import('./pages/administracao/AdminPage').then(m => ({ default: m.AdminPage })));
const ParceirosPage = lazy(() => import('./pages/parceiros/ParceirosPage').then(m => ({ default: m.ParceirosPage })));
const MembroPerfilPage = lazy(() => import('./pages/membro/MembroPerfilPage').then(m => ({ default: m.MembroPerfilPage })));
const MembroEditarPage = lazy(() => import('./pages/membro/MembroPerfilPage').then(m => ({ default: m.MembroEditarPage })));
const EventosPage = lazy(() => import('./pages/eventos/EventosPage').then(m => ({ default: m.EventosPage })));
const EventoDetalhePage = lazy(() => import('./pages/eventos/EventoDetalhePage').then(m => ({ default: m.EventoDetalhePage })));
const EventoColaborarPage = lazy(() => import('./pages/eventos/EventoColaborarPage').then(m => ({ default: m.EventoColaborarPage })));
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const CadastroPage = lazy(() => import('./pages/auth/CadastroPage').then(m => ({ default: m.CadastroPage })));
const PreCadastroPage = lazy(() => import('./pages/auth/PreCadastroPage').then(m => ({ default: m.PreCadastroPage })));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const DashboardEventosPage = lazy(() => import('./pages/dashboard/DashboardMediaPage').then(m => ({ default: m.DashboardEventosPage })));
const DashboardMediaGerirPage = lazy(() => import('./pages/dashboard/DashboardMediaPage').then(m => ({ default: m.DashboardMediaGerirPage })));
const PrivacyPage = lazy(() => import('./pages/legal/LegalPage').then(m => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('./pages/legal/LegalPage').then(m => ({ default: m.TermsPage })));
const DocumentacaoPage = lazy(() => import('./pages/documentacao/DocumentacaoPage').then(m => ({ default: m.DocumentacaoPage })));
const BeneficiosPage = lazy(() => import('./pages/beneficios/BeneficiosPage').then(m => ({ default: m.BeneficiosPage })));
const LegaltechSpacePage = lazy(() => import('./pages/legaltech-space/LegaltechSpacePage').then(m => ({ default: m.LegaltechSpacePage })));
const ParceiroPerfilPage = lazy(() => import('./pages/parceiros/ParceiroPerfilPage').then(m => ({ default: m.ParceiroPerfilPage })));
const ContactoPage = lazy(() => import('./pages/contacto/ContactoPage').then(m => ({ default: m.ContactoPage })));

/** Liberta o "1 reload por sessão" assim que a app monta sem falha de chunk. */
const useClearChunkReloadFlag = () => {
  useEffect(() => {
    const id = window.setTimeout(() => sessionStorage.removeItem('chunk_reload'), 5000);
    return () => window.clearTimeout(id);
  }, []);
};

export const AppRouter = () => {
  useClearChunkReloadFlag();
  return (
  <ChunkErrorBoundary>
  <Suspense fallback={<PremiumLoader />}>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/quem-somos" element={<QuemSomosPage />} />
      <Route path="/administracao" element={<AdminPage />} />
      <Route path="/membros" element={<Navigate to="/administracao" replace />} />
      <Route path="/parceiros" element={<ParceirosPage />} />
      <Route path="/parceiros/:id" element={<ParceiroPerfilPage />} />
      <Route path="/membro/:id" element={<MembroPerfilPage />} />
      <Route path="/membro/:id/editar" element={<ProtectedRoute requireEditor><MembroEditarPage /></ProtectedRoute>} />
      <Route path="/eventos" element={<EventosPage />} />
      <Route path="/eventos/:id" element={<EventoDetalhePage />} />
      <Route path="/eventos/:id/colaborar" element={<EventoColaborarPage />} />
      <Route path="/precadastro" element={<PreCadastroPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/cadastro" element={<CadastroPage />} />
      <Route path="/dashboard" element={<ProtectedRoute requireEditor><DashboardPage /></ProtectedRoute>} />
      <Route path="/dashboard/eventos" element={<ProtectedRoute requireEditor><DashboardEventosPage /></ProtectedRoute>} />
      <Route path="/dashboard/eventos/:id/midias" element={<ProtectedRoute requireEditor><DashboardMediaGerirPage /></ProtectedRoute>} />
      <Route path="/beneficios" element={<BeneficiosPage />} />
      <Route path="/legaltech-space" element={<LegaltechSpacePage />} />
      <Route path="/privacidade" element={<PrivacyPage />} />
      <Route path="/termos" element={<TermsPage />} />
      <Route path="/documentacao" element={<DocumentacaoPage />} />
      <Route path="/contacto" element={<ContactoPage />} />
      <Route path="/contato" element={<Navigate to="/contacto" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </Suspense>
  </ChunkErrorBoundary>
  );
};
