import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowRight, Building2, ArrowUpRight, X, Loader2 } from 'lucide-react';
import {
  Button,
  SectionWrapper,
  Badge,
  PremiumLoader,
  Reveal
} from '../../components/ui';
import {
  SearchResults
} from '../../components/domain';
import { searchFoundation } from '../../services/search.service';
import { PARTNERS, FLB_STATE_EVENT } from '../../store/app.store';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useDebounce } from '../../hooks/useDebounce';
import { MISSION } from '../../data/content.data';
import { PARTNERS_SEED } from '../../data/partners.data';

export const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-brand-900 flex flex-col items-center justify-center relative overflow-hidden text-center px-6">
      <div className="absolute inset-0 pointer-events-none">
         <div className="absolute top-[-20%] left-[-10%] w-[80vw] h-[80vw] bg-brand-800 rounded-full blur-[150px] opacity-40"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-black rounded-full blur-[120px] opacity-60"></div>
      </div>

      <div className="relative z-10">
        <h1 className="text-[10rem] md:text-[15rem] font-bold text-white/5 leading-none select-none">404</h1>
        <div className="relative -mt-12 md:-mt-20">
           <h2 className="text-3xl md:text-4xl font-light text-white mb-6">Pagina nao encontrada</h2>
           <p className="text-white/80 text-base md:text-lg mb-10 max-w-md mx-auto font-light">
             A pagina que voce procura nao existe ou foi movida.
           </p>
           <Link to="/">
             <Button variant="gold" className="px-8 py-4 text-xs">
                Voltar ao Inicio
             </Button>
           </Link>
        </div>
      </div>
    </div>
  );
};

export const HomePage = () => {
  usePageMeta("Fundacao Luso-Brasileira", "Cultura, Conhecimento e Cooperacao.");

  const [loading, setLoading] = useState(true);

  // Search State
  const [searchInputValue, setSearchInputValue] = useState('');
  const debouncedSearchQuery = useDebounce(searchInputValue, 300);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isHoveringHero, setIsHoveringHero] = useState(false);

  const heroRef = useRef<HTMLElement>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInputValue(e.target.value);
    setIsSearching(true);
    if (!showResults && e.target.value.length > 0) setShowResults(true);
  };

  const searchResults = useMemo(() => {
      // Logic runs only when debounced value changes
      const results = searchFoundation(debouncedSearchQuery);
      return results;
  }, [debouncedSearchQuery]);

  // Search Feedback for Screen Readers
  const resultsCount = searchResults.events.length + searchResults.partners.length + searchResults.spaces.length + (searchResults.members?.length ?? 0);
  const searchFeedback = showResults ? (resultsCount > 0 ? `${resultsCount} resultados encontrados.` : "Nenhum resultado encontrado.") : "";

  // Turn off searching state when debounce settles
  useEffect(() => {
      setIsSearching(false);
  }, [debouncedSearchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const [partnersTick, setPartnersTick] = useState(0);
  useEffect(() => {
    const update = () => setPartnersTick(t => t + 1);
    window.addEventListener(FLB_STATE_EVENT, update);
    return () => window.removeEventListener(FLB_STATE_EVENT, update);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();

      // Coordinates relative to the hero section
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Parallax ratio (0 to 1 based on width)
      const ratio = Math.max(0, Math.min(1, x / rect.width));

      // Use requestAnimationFrame for smoother performance
      requestAnimationFrame(() => {
          if (heroRef.current) {
              heroRef.current.style.setProperty('--mouse-ratio', ratio.toString());
              heroRef.current.style.setProperty('--mouse-x', `${x}px`);
              heroRef.current.style.setProperty('--mouse-y', `${y}px`);
          }
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  if (loading) {
    return <PremiumLoader />;
  }

  // Use live data from DB (merged with seed in syncMembers). partnersTick ensures re-render.
  void partnersTick;
  const govMembers = PARTNERS.filter(p => p.category === 'Governança');
  const presidente = govMembers.filter(m => m.tier === 'presidente');
  const direcao = govMembers.filter(m => m.tier === 'direcao');
  const secretarioGeral = govMembers.filter(m => m.tier === 'secretario-geral');
  const vogais = govMembers.filter(m => m.tier === 'vogal');

  return (
    <main className="overflow-x-hidden bg-brand-900 text-white selection:bg-sand-400 selection:text-brand-900">

      {/* 1. HERO INSTITUCIONAL */}
      <section
        ref={heroRef}
        onMouseEnter={() => setIsHoveringHero(true)}
        onMouseLeave={() => setIsHoveringHero(false)}
        className="relative z-30 pt-36 pb-24 md:pt-64 md:pb-48 px-6 bg-brand-900 min-h-[85vh] md:min-h-[90vh] flex flex-col justify-center group"
        style={{ '--mouse-ratio': '0.5', '--mouse-x': '50%', '--mouse-y': '50%' } as React.CSSProperties}
        aria-label="Introducao"
      >
        {/* Layer 1: Ambient Background (Blurred & Dark) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
           <div className="absolute inset-0 bg-noise opacity-[0.07] mix-blend-overlay z-10 pointer-events-none"></div>

           {/* PORTUGAL FLAG - LEFT (AMBIENT) */}
           <div
             className="absolute top-[-5%] md:top-[-20%] left-[-15%] md:left-[-5%] w-[80vw] md:w-[60vw] h-[100%] md:h-[140%] bg-no-repeat bg-contain bg-center transition-transform duration-[1500ms] ease-out will-change-transform mix-blend-screen opacity-15 md:opacity-20 blur-[60px] md:blur-[80px]"
             style={{
               backgroundImage: `url('/flag-portugal.svg')`,
               transform: 'translateX(calc(var(--mouse-ratio) * -20px)) scale(1.1)'
             }}
           />

           {/* BRAZIL FLAG - RIGHT (AMBIENT) */}
           <div
             className="absolute top-[-5%] md:top-[-20%] right-[-15%] md:right-[-5%] w-[80vw] md:w-[60vw] h-[100%] md:h-[140%] bg-no-repeat bg-contain bg-center transition-transform duration-[1500ms] ease-out will-change-transform mix-blend-screen opacity-15 md:opacity-20 blur-[60px] md:blur-[80px]"
             style={{
               backgroundImage: `url('/flag-brazil.svg')`,
               transform: 'translateX(calc((1 - var(--mouse-ratio)) * 20px)) scale(1.1)'
             }}
           />

           {/* Stronger Dark Overlay for Readability */}
           <div className="absolute inset-0 bg-brand-900/85 mix-blend-multiply z-20"></div>
           <div className="absolute inset-0 bg-gradient-to-b from-brand-900/90 via-transparent to-brand-900 z-20"></div>
        </div>

        {/* Layer 2: Spotlight Reveal (Sharp & Bright) - Only visible via mask around mouse */}
        <div
            className={`hidden md:block absolute inset-0 pointer-events-none overflow-hidden select-none z-10 transition-opacity duration-700 ease-out ${isHoveringHero ? 'opacity-100' : 'opacity-0'}`}
            style={{
                maskImage: 'radial-gradient(circle 350px at var(--mouse-x) var(--mouse-y), black 0%, transparent 70%)',
                WebkitMaskImage: 'radial-gradient(circle 350px at var(--mouse-x) var(--mouse-y), black 0%, transparent 70%)'
            }}
        >
           {/* PORTUGAL FLAG - LEFT (SHARP) */}
           <div
             className="absolute top-[-20%] left-[-5%] w-[60vw] h-[140%] bg-no-repeat bg-contain bg-center transition-transform duration-[1500ms] ease-out will-change-transform mix-blend-normal opacity-90 blur-0"
             style={{
               backgroundImage: `url('/flag-portugal.svg')`,
               transform: 'translateX(calc(var(--mouse-ratio) * -40px)) scale(1.2)'
             }}
           />

           {/* BRAZIL FLAG - RIGHT (SHARP) */}
           <div
             className="absolute top-[-20%] right-[-5%] w-[60vw] h-[140%] bg-no-repeat bg-contain bg-center transition-transform duration-[1500ms] ease-out will-change-transform mix-blend-normal opacity-90 blur-0"
             style={{
               backgroundImage: `url('/flag-brazil.svg')`,
               transform: 'translateX(calc((1 - var(--mouse-ratio)) * 40px)) scale(1.2)'
             }}
           />

           {/* Subtle Light Overlay to "Clarear" */}
           <div className="absolute inset-0 bg-white/10 mix-blend-soft-light"></div>
        </div>

        <div className="max-w-[1600px] mx-auto relative z-20 text-left md:text-center w-full">
          <Reveal>
            <div className="flex flex-col items-start md:items-center mb-8 md:mb-10">
                <img
                  src="/logo-flb.png"
                  alt="Logo Fundacao Luso-Brasileira"
                  className="h-32 md:h-44 lg:h-56 w-auto object-contain mb-6 drop-shadow-2xl"
                />
                <div className="inline-flex items-center gap-3">
                    <div className="h-px w-6 md:w-8 bg-sand-400/50"></div>
                    <span className="text-[9px] md:text-[10px] font-bold tracking-[0.3em] uppercase text-sand-400">Fundacao Luso-Brasileira</span>
                    <div className="h-px w-6 md:w-8 bg-sand-400/50"></div>
                </div>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <h1 className="text-4xl sm:text-5xl md:text-8xl lg:text-9xl font-light tracking-tighter mb-8 md:mb-10 leading-[1.1] md:leading-[1.05] text-white text-balance drop-shadow-2xl">
                Cultura
                <span className="font-script text-5xl sm:text-6xl md:text-9xl px-2 md:px-4 align-middle relative -top-1 md:-top-4 opacity-90 mx-1 md:mx-2 hover:scale-110 transition-transform duration-500 inline-block cursor-default text-sand-400" style={{ textShadow: '0 0 30px rgba(201,175,136,0.3)' }} aria-hidden="true">e</span>
                <span className="sr-only"> e </span>
                <br className="md:hidden" />
                Cooperacao.
            </h1>
          </Reveal>

          <Reveal delay={200}>
            <p className="text-base sm:text-lg md:text-2xl text-slate-200 font-light max-w-3xl mr-auto md:mx-auto mb-12 md:mb-16 leading-relaxed tracking-wide drop-shadow-md pr-4 md:pr-0">
                Promovendo iniciativas culturais, educativas e tecnologicas que aproximam Portugal, Brasil e a lusofonia.
            </p>
          </Reveal>

          <Reveal delay={300} className="max-w-lg mr-auto md:mx-auto relative z-30 w-full">
            <div className="relative group w-full">
              <div className="absolute inset-0 bg-white/5 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              <label htmlFor="hero-search" className="sr-only">Explorar acervo e membros</label>
              <input
                id="hero-search"
                type="text"
                value={searchInputValue}
                onChange={handleSearchChange}
                placeholder="Explorar acervo e membros..."
                className="relative w-full bg-white/5 backdrop-blur-2xl border border-white/10 rounded-full py-4 md:py-5 pl-12 md:pl-14 pr-12 text-sm md:text-base text-white placeholder:text-white/60 focus:outline-none focus:bg-white/10 focus:border-sand-400/50 transition-all duration-300 shadow-2xl hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.1)]"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={showResults}
                aria-controls="search-results-list"
                aria-haspopup="listbox"
              />
              <Search className="absolute left-5 md:left-6 top-1/2 -translate-y-1/2 text-white/60 w-4 h-4 md:w-5 md:h-5 group-focus-within:text-sand-400 transition-colors duration-300" aria-hidden="true" />

              {isSearching ? (
                  <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-sand-400 animate-spin w-5 h-5" aria-hidden="true" />
              ) : searchInputValue ? (
                  <button
                    onClick={() => { setSearchInputValue(''); setShowResults(false); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-full"
                    aria-label="Limpar busca"
                  >
                      <X size={16} />
                  </button>
              ) : null}

              <div className="sr-only" aria-live="polite">
                  {searchFeedback}
              </div>
            </div>

            {showResults && (
              <>
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9998] md:hidden animate-in fade-in duration-300"
                    onClick={() => setShowResults(false)}
                    aria-hidden="true"
                ></div>

                <div className="
                    fixed top-24 left-0 w-full z-[9999] px-4 max-h-[80vh] overflow-y-auto pb-10
                    md:absolute md:top-full md:left-0 md:w-full md:px-0 md:h-auto md:max-h-none md:z-50 md:overflow-visible md:pb-0
                    animate-in fade-in slide-in-from-top-4 duration-300
                ">
                    <SearchResults query={debouncedSearchQuery} results={searchResults} onClose={() => { setShowResults(false); setSearchInputValue(''); }} />
                </div>
              </>
            )}
          </Reveal>
        </div>

        <div className="absolute bottom-8 md:bottom-12 left-1/2 -translate-x-1/2 animate-bounce text-white/30" aria-hidden="true">
           <ArrowRight className="rotate-90 w-5 h-5 md:w-6 md:h-6" />
        </div>
      </section>

      {/* 2. PROPOSITO ESTRATEGICO */}
      <div className="bg-white relative z-20 rounded-t-[2.5rem] -mt-10 pt-16 pb-16 shadow-[0_-20px_60px_rgba(0,0,0,0.08)] border-t border-slate-200/50">
        <SectionWrapper className="py-16 md:py-24 relative">
          <div className="grid md:grid-cols-12 gap-10 md:gap-12 items-start">
            <div className="md:col-span-4">
               <Reveal>
                   <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                     <span className="w-8 h-px bg-sand-400"></span> Proposito
                   </h2>
               </Reveal>
            </div>
            <div className="md:col-span-8">
               <Reveal delay={100}>
                   <p className="text-2xl md:text-4xl lg:text-5xl font-light text-brand-900 leading-[1.15] tracking-tight mb-8 text-balance">
                     Quem Somos
                   </p>
               </Reveal>
               <div className="grid md:grid-cols-2 gap-8">
                   <Reveal delay={200}>
                       <p className="text-base md:text-lg text-slate-600 font-light leading-relaxed">
                         A Fundacao Luso-Brasileira tem por finalidade promover e apoiar iniciativas de caracter Cultural, Educativo, Tecnologico e Patrimonial a concretizar em Portugal, no Brasil e nos restantes paises e territorios de Lingua Portuguesa.
                       </p>
                   </Reveal>
                   <Reveal delay={300}>
                       <p className="text-base md:text-lg text-slate-600 font-light leading-relaxed">
                         Esta ao servico das empresas e de todos os agentes que promovem a aproximacao economica, empresarial e cultural, em particular, entre <strong className="text-brand-900 font-medium">Portugal e o Brasil</strong> mas, tambem, entre estes dois paises e restantes membros da Comunidade de Paises de Lingua Oficial Portuguesa.
                       </p>
                   </Reveal>
               </div>
            </div>
            <div className="md:col-span-8 mt-2">
              <Reveal delay={400}>
                <Link to="/quem-somos" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-brand-900 hover:text-sand-600 transition-colors">
                  Conhecer a nossa missao completa <ArrowRight size={12} />
                </Link>
              </Reveal>
            </div>
          </div>
        </SectionWrapper>

        {/* 3. PRESIDENT'S MESSAGE - Construindo Pontes */}
        <SectionWrapper className="py-16 md:py-24">
          <Reveal>
            <div className="grid md:grid-cols-12 gap-8 md:gap-16 items-center">
              {/* Foto do Presidente */}
              <div className="md:col-span-5">
                <div className="aspect-[4/5] w-full max-w-md mx-auto md:mx-0 overflow-hidden">
                  <img
                    src="/presidente.webp"
                    alt="Paulo Campos Costa"
                    className="w-full h-full object-cover grayscale"
                  />
                </div>
              </div>

              {/* Conteudo */}
              <div className="md:col-span-7">
                <Badge variant="light" className="mb-6 bg-slate-100 text-slate-600 border-slate-200">Presidencia</Badge>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif text-brand-900 mb-8 leading-tight">
                  Construindo Pontes
                </h2>

                <blockquote className="text-base md:text-lg text-slate-600 font-light leading-relaxed mb-8 border-l-4 border-sand-400 pl-6 italic">
                  "E uma honra e um privilegio presidir a esta Fundacao e uma enorme responsabilidade. A Lingua Portuguesa interliga muitos continentes, paises, personalidades, instituicoes e negocios, e por essa razao acredito que a Fundacao deve recuperar relacoes antigas e impulsionar novas parcerias. Entre Portugal e o Brasil nao podem existir entraves, temos de construir pontes que unam a nossa rica e diversificada cultura."
                </blockquote>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-medium text-brand-900">Paulo Campos Costa</p>
                    <p className="text-xs uppercase tracking-widest text-slate-400">Presidente da Fundacao</p>
                    <p className="text-[10px] uppercase tracking-widest text-sand-500 mt-1">Ex-EDP Global</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-900 rounded-lg flex items-center justify-center">
                      <span className="text-white font-serif font-bold text-lg">F</span>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-brand-900">Fundacao</p>
                      <p className="text-[9px] font-light uppercase tracking-wider text-slate-500">Luso-Brasileira</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </SectionWrapper>
      </div>

      {/* 4. BOARD OF DIRECTORS (Conselho) - LIGHT MODE */}
<section className="py-24 md:py-32 bg-[#f8f6f2] relative overflow-hidden">
  <div className="max-w-[1600px] mx-auto px-6 lg:px-12 relative z-10">
    <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-start">
      {/* Left Column - Info */}
      <div className="lg:w-1/3 lg:sticky lg:top-32">
        <Reveal>
          <Badge variant="light" className="mb-6 bg-slate-100 text-slate-600 border-slate-200">Governança</Badge>
          <h2 className="text-4xl md:text-5xl font-serif text-brand-900 mb-6 leading-tight">Conselho de<br/><span className="italic text-sand-500">Administração</span></h2>
          <p className="text-slate-600 font-light leading-relaxed mb-10 text-base md:text-lg">
            Liderança comprometida com a excelência, transparência e a perenidade da missão institucional da Fundação.
          </p>
          <Link to="/administracao">
            <Button variant="primary" className="px-6 py-3.5 text-[10px] group">
              Ver Organograma Completo <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </Reveal>
      </div>

      {/* Right Column - Pyramid Cards */}
      <div className="lg:w-2/3 w-full">
        <div className="flex flex-col gap-4">

          {/* Row 1: Presidente — 1 large card */}
          {presidente.map((m, idx) => (
            <Reveal key={m.id} delay={idx * 100}>
              <Link
                to={`/membro/${m.id}`}
                className="group block focus:outline-none focus:ring-2 focus:ring-offset-4 focus:ring-sand-400 rounded-2xl"
                aria-label={`Ver perfil de ${m.name}, ${m.role}`}
              >
                <div className="relative bg-white border border-slate-200/80 rounded-2xl p-5 md:p-6 flex items-center gap-5 hover:border-sand-400/50 hover:shadow-lg transition-all duration-500 hover:-translate-y-0.5">
                  <div className="w-20 h-20 md:w-24 md:h-24 relative overflow-hidden rounded-xl shrink-0 shadow-sm bg-slate-100">
                    {m.image && <img src={m.image} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-sand-500 mb-1">Presidente</p>
                    <h3 className="text-xl md:text-2xl font-serif text-brand-900 group-hover:text-sand-600 transition-colors">{m.name}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-brand-900 group-hover:text-white transition-all duration-300 shrink-0" aria-hidden="true">
                    <ArrowUpRight size={16} />
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}

          {/* Row 2: Direção (2) + Secretário Geral (1) — same row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...direcao, ...secretarioGeral].map((m, idx) => (
              <Reveal key={m.id} delay={150 + idx * 50}>
                <Link
                  to={`/membro/${m.id}`}
                  className="group block focus:outline-none focus:ring-2 focus:ring-offset-4 focus:ring-sand-400 rounded-2xl"
                  aria-label={`Ver perfil de ${m.name}, ${m.role}`}
                >
                  <div className="relative bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-4 hover:border-sand-400/50 hover:shadow-lg transition-all duration-500 hover:-translate-y-0.5">
                    <div className="w-12 h-12 md:w-14 md:h-14 relative overflow-hidden rounded-full shrink-0 shadow-sm bg-slate-100">
                      {m.image && <img src={m.image} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-sand-500 mb-0.5">{m.role}</p>
                      <h3 className="text-base md:text-lg font-serif text-brand-900 group-hover:text-sand-600 transition-colors leading-tight">{m.name}</h3>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-brand-900 group-hover:text-white transition-all duration-300 shrink-0 opacity-0 group-hover:opacity-100" aria-hidden="true">
                      <ArrowUpRight size={14} />
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>

          {/* Row 3: Vogais — 4 mini cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
            {vogais.map((m, idx) => (
              <Reveal key={m.id} delay={250 + idx * 50}>
                <Link
                  to={`/membro/${m.id}`}
                  className="group block focus:outline-none focus:ring-2 focus:ring-offset-4 focus:ring-sand-400 rounded-2xl"
                  aria-label={`Ver perfil de ${m.name}, ${m.role}`}
                >
                  <div className="relative bg-white border border-slate-200/80 rounded-2xl p-3 flex items-center gap-3 hover:border-sand-400/50 hover:shadow-md transition-all duration-500 hover:-translate-y-0.5">
                    <div className="w-10 h-10 relative overflow-hidden rounded-full shrink-0 shadow-sm bg-slate-100">
                      {m.image && <img src={m.image} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-[8px] font-bold uppercase tracking-widest text-sand-500 mb-0.5">Vogal</p>
                      <h3 className="text-xs font-serif text-brand-900 group-hover:text-sand-600 transition-colors truncate">{m.name}</h3>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>

        </div>
      </div>
    </div>
  </div>
</section>

      {/* 5. PATROCINADORES */}
<section className="relative py-20 md:py-28 overflow-hidden bg-white border-t border-slate-100">
  <div className="max-w-[1600px] mx-auto px-6 lg:px-12 relative z-10">
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
      <Reveal>
        <div>
          <Badge variant="light" className="mb-4 bg-slate-100 text-slate-600 border-slate-200">Parceiros</Badge>
          <h2 className="text-3xl md:text-4xl font-serif text-brand-900 leading-tight">
            Pilares da <span className="italic text-sand-500">Nossa Missão</span>
          </h2>
        </div>
      </Reveal>
      <Reveal delay={100}>
        <Link to="/parceiros">
          <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-brand-900 hover:text-white hover:border-brand-900 px-8 py-3.5 text-[10px] bg-white whitespace-nowrap">
            Ver Todos os Parceiros <ArrowRight size={12} className="ml-2 inline" />
          </Button>
        </Link>
      </Reveal>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {(PARTNERS.length > 0 ? PARTNERS.filter(p => ['Parceiro Platinum', 'Parceiro Gold'].includes(p.category)) : PARTNERS_SEED.filter(p => ['Parceiro Platinum', 'Parceiro Gold'].includes(p.category))).map((partner, idx) => (
        <Reveal key={partner.id} delay={idx * 60} className="h-full">
          <a
            href={partner.website || '#'}
            target={partner.website ? '_blank' : undefined}
            rel="noopener noreferrer"
            className="group h-full block focus:outline-none focus:ring-2 focus:ring-sand-400 rounded-2xl"
            aria-label={`Parceiro fundador: ${partner.name}`}
          >
            <div className="h-full bg-white rounded-2xl p-5 flex flex-col items-center text-center transition-all duration-500 border border-slate-200/80 hover:border-sand-400/50 hover:shadow-xl hover:-translate-y-1">
              <div className="text-[9px] font-medium text-slate-400 uppercase tracking-wider self-end mb-2">
                Est. {partner.since || '1998'}
              </div>
              <div className="h-20 w-full flex items-center justify-center mb-4">
                <img
                  src={partner.image}
                  alt=""
                  className="max-h-full max-w-[80%] object-contain filter grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                />
              </div>
              <h3 className="text-sm font-serif text-brand-900 group-hover:text-sand-600 transition-colors">{partner.name}</h3>
            </div>
          </a>
        </Reveal>
      ))}
    </div>
  </div>
</section>

      {/* 7. CHAMADA FINAL */}
      <section className="relative bg-brand-900 text-white overflow-hidden py-28 md:py-36 px-6 text-center group">
         <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white rounded-full blur-[200px] -mr-40 -mt-40 animate-pulse-slow"></div>
         </div>

         <div className="relative z-10 max-w-3xl mx-auto">
            <Reveal>
                <div className="w-12 h-12 border border-white/10 rounded-xl flex items-center justify-center mx-auto mb-8 bg-white/5 backdrop-blur-md">
                   <Building2 className="text-white/80" size={20} aria-hidden="true" />
                </div>
            </Reveal>

            <Reveal delay={100}>
                <h2 className="text-4xl md:text-6xl font-light tracking-tight mb-6 leading-[1.1]">
                   Um legado em movimento.
                </h2>
            </Reveal>

            <Reveal delay={200}>
                <p className="text-lg md:text-xl text-white/60 font-light mb-10 leading-relaxed max-w-xl mx-auto">
                   Junte-se a nos para preservar a historia e impulsionar a inovacao entre nossas nacoes.
                </p>
            </Reveal>

            <Reveal delay={300}>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                   <Link to="/precadastro">
                      <Button variant="gold" className="px-8 py-4 rounded-full text-xs hover:scale-105 transition-transform duration-300">
                         Tornar-se Membro
                      </Button>
                   </Link>
                </div>
            </Reveal>
         </div>
      </section>

    </main>
  );
};
