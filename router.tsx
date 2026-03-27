// router.tsx
import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PremiumLoader } from './components/ui/Loaders';

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

export const AppRouter = () => (
  <Suspense fallback={<PremiumLoader />}>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/quem-somos" element={<QuemSomosPage />} />
      <Route path="/administracao" element={<AdminPage />} />
      <Route path="/membros" element={<Navigate to="/administracao" replace />} />
      <Route path="/parceiros" element={<ParceirosPage />} />
      <Route path="/membro/:id" element={<MembroPerfilPage />} />
      <Route path="/membro/:id/editar" element={<MembroEditarPage />} />
      <Route path="/eventos" element={<EventosPage />} />
      <Route path="/eventos/:id" element={<EventoDetalhePage />} />
      <Route path="/eventos/:id/colaborar" element={<EventoColaborarPage />} />
      <Route path="/precadastro" element={<PreCadastroPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/cadastro" element={<CadastroPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/dashboard/eventos" element={<DashboardEventosPage />} />
      <Route path="/dashboard/eventos/:id/midias" element={<DashboardMediaGerirPage />} />
      <Route path="/privacidade" element={<PrivacyPage />} />
      <Route path="/termos" element={<TermsPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </Suspense>
);
