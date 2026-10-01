// components/domain/Header.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ArrowRight, LogOut } from 'lucide-react';
import { AUTH_SESSION, FLB_STATE_EVENT } from '../../store/app.store';
import { logout } from '../../services/auth.service';
import { BrandLogo } from './BrandLogo';

export const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const [authTick, setAuthTick] = useState(0);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const navLinks = [
    { name: 'Início', path: '/' },
    { name: 'A Fundação', path: '/quem-somos' },
    { name: 'Pessoas', path: '/administracao' },
    { name: 'Eventos', path: '/eventos' },
    { name: 'Parceiros', path: '/parceiros' },
    { name: 'Benefícios', path: '/beneficios' },
    { name: 'Contacto', path: '/contacto' },
  ];

  useEffect(() => {
    const handleAuthUpdate = () => setAuthTick(t => t + 1);
    window.addEventListener(FLB_STATE_EVENT, handleAuthUpdate);
    return () => window.removeEventListener(FLB_STATE_EVENT, handleAuthUpdate);
  }, []);

  /**
   * Menu mobile: mesmo contrato de acessibilidade do `Modal`
   * (components/ui/Modals.tsx) — Escape fecha, o scroll do body fica bloqueado
   * enquanto está aberto e o foco regressa ao botão que o abriu.
   */
  useEffect(() => {
    if (!isOpen) return;

    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
      menuButtonRef.current?.focus?.();
    };
  }, [isOpen]);

  /** Salta para o conteúdo principal da rota atual sem depender do HashRouter. */
  const skipToContent = () => {
    const target = document.querySelector<HTMLElement>('main, [role="main"], h1');
    if (!target) return;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus();
    target.scrollIntoView({ block: 'start' });
  };

  if (['/login', '/cadastro'].includes(location.pathname)) return null;

  return (
    <>
      <button
        type="button"
        onClick={skipToContent}
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[200] focus:px-5 focus:py-3 focus:rounded-full focus:bg-white focus:text-brand-900 focus:text-xs focus:font-bold focus:uppercase focus:tracking-widest focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-sand-400"
      >
        Saltar para o conteúdo
      </button>

      <header className="fixed top-0 w-full z-50 bg-brand-900 py-4 md:py-5 border-b border-white/10">
        <div className="max-w-[1800px] mx-auto px-6 lg:px-12 relative">
          <div className="flex justify-between items-center h-14 md:h-16">
            <Link to="/" className="block group relative z-50 hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-sand-400 rounded-xl">
              <BrandLogo variant="original" />
            </Link>

            <nav className="hidden md:flex items-center gap-6 lg:gap-10" aria-label="Navegação Principal">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  aria-current={location.pathname === link.path ? 'page' : undefined}
                  className={`text-[10px] font-bold tracking-[0.2em] uppercase transition-all duration-500 relative group py-2 focus:outline-none focus:text-sand-400 ${
                    location.pathname === link.path
                      ? 'text-sand-400'
                      : 'text-white hover:opacity-70'
                  }`}
                >
                  {link.name}
                  <span className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-[1px] transition-all duration-700 ${
                    location.pathname === link.path ? 'w-full opacity-100 bg-current' : 'w-0 opacity-0 group-hover:w-4 group-hover:opacity-40 bg-current'
                  }`}></span>
                </Link>
              ))}

              <div className="pl-8 ml-2 border-l border-white/20 transition-colors duration-700 flex items-center gap-6">
                {AUTH_SESSION.isLoggedIn ? (
                  <div className="flex items-center gap-4">
                    <Link to="/dashboard" className="text-[10px] font-bold uppercase tracking-wider text-white hover:opacity-70 focus:outline-none focus:underline">
                      Olá, {AUTH_SESSION.displayName || 'Editor'}
                    </Link>
                    <button onClick={logout} className="p-2 text-red-400 hover:text-red-500 transition-colors" title="Sair" aria-label="Sair da conta">
                      <LogOut size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <Link
                      to="/precadastro"
                      className="hidden lg:inline-block text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-500 hover:opacity-70 focus:outline-none focus:text-sand-400 text-white"
                    >
                      Pré-Registo
                    </Link>
                    <Link
                      to="/login"
                      className="px-6 py-2.5 rounded-full border text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-white/10 border-white/20 text-white hover:bg-white hover:text-brand-900 focus:ring-white/50"
                    >
                      Entrar
                    </Link>
                  </>
                )}
              </div>
            </nav>

            <div className="md:hidden">
              <button
                ref={menuButtonRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-white focus:outline-none focus:ring-2 focus:ring-sand-400 rounded-md"
                aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
                aria-expanded={isOpen}
              >
                {isOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {isOpen && (
        <div className="md:hidden fixed inset-0 z-[60] bg-brand-900/85 backdrop-blur-xl flex flex-col animate-in slide-in-from-right duration-700 text-white">
          <div className="flex justify-end p-6">
            <button type="button" onClick={() => setIsOpen(false)} className="p-2 text-white/80 hover:text-white focus:outline-none focus:ring-2 focus:ring-sand-400 rounded-md" aria-label="Fechar menu">
              <X size={24} aria-hidden="true" />
            </button>
          </div>
          <nav className="flex-grow flex flex-col justify-center px-10 space-y-8" aria-label="Navegação Mobile">
            {navLinks.map((link, idx) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className="block text-3xl font-light tracking-tight text-white animate-fadeInUpSlow focus:outline-none focus:text-sand-400"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                {link.name}
              </Link>
            ))}
            <div className="h-px bg-white/10 w-full my-8" role="separator"></div>
            {AUTH_SESSION.isLoggedIn ? (
              <div className="space-y-4 animate-fadeInUpSlow delay-300">
                <Link to="/dashboard" onClick={() => setIsOpen(false)} className="text-lg text-sand-400 font-medium block">
                  Dashboard
                </Link>
                <button onClick={() => { logout(); setIsOpen(false); }} className="text-sm text-red-400 font-medium uppercase tracking-widest flex items-center gap-2">
                  <LogOut size={14} /> Sair da conta
                </button>
              </div>
            ) : (
              <div className="space-y-6 animate-fadeInUpSlow delay-300">
                <Link to="/precadastro" onClick={() => setIsOpen(false)} className="text-lg text-white/70 font-medium block hover:text-white transition-colors">
                  Pré-Registo
                </Link>
                <Link to="/login" onClick={() => setIsOpen(false)} className="text-lg text-sand-400 font-medium flex items-center gap-3">
                  Entrar como Editor <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}

    </>
  );
};
