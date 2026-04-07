// pages/legaltech-space/LegaltechSpacePage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import {
  Globe,
  Calendar,
  Users,
  Link2,
  Server,
  Code2,
  Layout,
  TrendingUp,
  Palette,
  Package,
  Briefcase,
} from 'lucide-react';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Reveal } from '../../components/ui/Reveal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { SectionWrapper } from '../../components/ui/Layout';

const BUILT_FOR_FOUNDATION = [
  {
    icon: Globe,
    title: 'Plataforma web completa',
    description:
      'Desenvolvimento integral da plataforma pública e privada da Fundação, do design ao deployment.',
  },
  {
    icon: Calendar,
    title: 'Sistema de gestão de eventos',
    description:
      'Criação, publicação e gestão de eventos com controlo de inscrições e páginas de detalhe.',
  },
  {
    icon: Users,
    title: 'Perfis públicos conectados',
    description:
      'Sistema de perfis de membros com páginas públicas individuais e gestão de informação pessoal.',
  },
  {
    icon: Link2,
    title: 'Integração entre membros, espaços e experiências',
    description:
      'Arquitetura que conecta utilizadores, parceiros e conteúdos numa experiência coesa.',
  },
  {
    icon: Server,
    title: 'Arquitetura escalável',
    description:
      'Infraestrutura serverless com Vercel e Supabase, pensada para crescer sem atrito.',
  },
];

const PLATFORM_FEATURES = [
  {
    icon: Calendar,
    title: 'Gestão de eventos',
    description: 'Publicação e listagem de eventos com inscrições e páginas de detalhe.',
  },
  {
    icon: Users,
    title: 'Perfis profissionais',
    description: 'Cada membro tem o seu espaço público configurável na plataforma.',
  },
  {
    icon: Globe,
    title: 'Páginas públicas',
    description: 'Parceiros e iniciativas com páginas dedicadas e conteúdo próprio.',
  },
  {
    icon: Link2,
    title: 'Integração de utilizadores',
    description: 'Autenticação, pré-cadastro e onboarding integrados no mesmo sistema.',
  },
  {
    icon: Package,
    title: 'Sistema modular',
    description: 'Cada funcionalidade é um módulo independente, fácil de expandir.',
  },
];

const SERVICES = [
  {
    icon: Code2,
    title: 'Desenvolvimento de software personalizado',
    description: 'Aplicações web e plataformas construídas de raiz para o seu negócio.',
  },
  {
    icon: Layout,
    title: 'Sites e landing pages',
    description: 'Presença digital de alto nível, com foco em conversão e identidade.',
  },
  {
    icon: TrendingUp,
    title: 'Marketing digital',
    description: 'Estratégia e execução para crescimento online com resultados mensuráveis.',
  },
  {
    icon: Palette,
    title: 'Design e identidade visual',
    description: 'Branding, UI/UX e materiais que comunicam quem você é.',
  },
  {
    icon: Package,
    title: 'Estruturação de produtos digitais',
    description: 'Da ideia ao produto: estratégia, arquitetura e lançamento.',
  },
  {
    icon: Briefcase,
    title: 'Consultoria e posicionamento',
    description: 'Visão estratégica para empresas que querem crescer com clareza.',
  },
];

const SANDRO_PHOTO =
  'https://media.licdn.com/dms/image/v2/D4D03AQFxCoviPbJ-lQ/profile-displayphoto-shrink_200_200/profile-displayphoto-shrink_200_200/0/1669909237046?e=2147483647&v=beta&t=vWFMH2pXrGbpTf1w3LS_s41n-qe_sXwgf0S1hLZdKi4';

export const LegaltechSpacePage = () => {
  usePageMeta(
    'Legaltech Space Group – Parceiro Tecnológico',
    'A empresa responsável pela infraestrutura digital da plataforma da Fundação Luso-Brasileira.'
  );

  return (
    <main className="bg-white text-slate-900 overflow-hidden">
      {/* ── HERO ── */}
      <section className="bg-brand-900 pt-40 pb-24 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(201,175,136,0.08),transparent_60%)] pointer-events-none" />
        {/* decorative blob */}
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-sand-400/5 blur-3xl pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10">
          <Reveal>
            <Badge variant="dark" className="mb-6">Parceiro Tecnológico</Badge>
            <h1 className="text-4xl md:text-7xl font-light text-white tracking-tight mb-6 leading-[1.05]">
              Tecnologia, Design{' '}
              <span className="font-serif italic text-sand-400">e Estratégia</span>
              <br />
              <span className="text-white/70">para quem constrói o futuro</span>
            </h1>
            <p className="text-lg text-white/60 max-w-2xl font-light leading-relaxed mb-10">
              A Legaltech Space é responsável pela criação e evolução da infraestrutura
              digital da plataforma, conectando inovação, negócios e experiências.
            </p>
            <a href="mailto:contato@legaltechspace.com">
              <Button variant="gold" className="px-8 py-4 rounded-full text-xs">
                Falar com a equipe
              </Button>
            </a>
          </Reveal>
        </div>
      </section>

      {/* ── O QUE DESENVOLVEMOS PARA A FUNDAÇÃO ── */}
      <SectionWrapper className="py-20 md:py-28">
        <div className="grid md:grid-cols-12 gap-10 mb-16">
          <div className="md:col-span-4">
            <Reveal>
              <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                <span className="w-8 h-px bg-sand-400" /> O que desenvolvemos
              </h2>
            </Reveal>
          </div>
          <div className="md:col-span-8">
            <Reveal delay={100}>
              <p className="text-3xl md:text-4xl font-light text-brand-900 leading-tight tracking-tight">
                Uma infraestrutura digital construída de raiz para a Fundação Luso-Brasileira.
              </p>
            </Reveal>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {BUILT_FOR_FOUNDATION.map((item, idx) => (
            <Reveal key={item.title} delay={idx * 80}>
              <div className="p-6 border border-slate-200 rounded-2xl hover:border-sand-400/50 hover:shadow-md transition-all duration-300 h-full flex flex-col">
                <div className="w-10 h-10 bg-brand-900 rounded-xl flex items-center justify-center mb-5 shrink-0">
                  <item.icon size={18} className="text-sand-400" />
                </div>
                <h3 className="text-base font-serif text-brand-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500 font-light leading-relaxed">{item.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </SectionWrapper>

      {/* ── FUNCIONALIDADES DA PLATAFORMA ── */}
      <section className="bg-[#f8f6f2] py-20 md:py-28">
        <SectionWrapper>
          <Reveal>
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-12 flex items-center gap-3">
              <span className="w-8 h-px bg-sand-400" /> Funcionalidades da Plataforma
            </h2>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {PLATFORM_FEATURES.map((feat, idx) => (
              <Reveal key={feat.title} delay={idx * 80}>
                <div className="bg-white p-6 border border-slate-200/80 rounded-2xl hover:border-sand-400/50 hover:shadow-md transition-all duration-300 h-full flex flex-col">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mb-4 shrink-0">
                    <feat.icon size={18} className="text-brand-900" />
                  </div>
                  <h3 className="text-base font-serif text-brand-900 mb-2">{feat.title}</h3>
                  <p className="text-sm text-slate-500 font-light leading-relaxed">{feat.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </SectionWrapper>
      </section>

      {/* ── COMO PODEMOS AJUDAR ── */}
      <SectionWrapper className="py-20 md:py-28">
        <div className="grid md:grid-cols-12 gap-10 mb-16">
          <div className="md:col-span-4">
            <Reveal>
              <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                <span className="w-8 h-px bg-sand-400" /> Serviços
              </h2>
            </Reveal>
          </div>
          <div className="md:col-span-8">
            <Reveal delay={100}>
              <p className="text-3xl md:text-4xl font-light text-brand-900 leading-tight tracking-tight">
                Como podemos ajudar o seu projeto a crescer.
              </p>
            </Reveal>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SERVICES.map((svc, idx) => (
            <Reveal key={svc.title} delay={idx * 80}>
              <div className="bg-brand-900 p-6 rounded-2xl h-full flex flex-col hover:shadow-xl transition-all duration-300">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-5 shrink-0">
                  <svc.icon size={18} className="text-sand-400" />
                </div>
                <h3 className="text-base font-serif text-white mb-2">{svc.title}</h3>
                <p className="text-sm text-white/60 font-light leading-relaxed">{svc.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </SectionWrapper>

      {/* ── EXPERIÊNCIA E BAGAGEM ── */}
      <section className="bg-brand-900 py-20 md:py-28">
        <SectionWrapper>
          <div className="grid md:grid-cols-12 gap-10 md:gap-16 items-start">
            <div className="md:col-span-4">
              <Reveal>
                <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] flex items-center gap-3">
                  <span className="w-8 h-px bg-sand-400" /> Experiência
                </h2>
              </Reveal>
            </div>
            <div className="md:col-span-8">
              <Reveal delay={100}>
                <p className="text-3xl md:text-4xl font-light text-white leading-tight tracking-tight mb-8">
                  Onde eventos, hospitalidade, estratégia e tecnologia se encontram.
                </p>
                <p className="text-base text-white/60 font-light leading-relaxed mb-10">
                  A Legaltech Space não é só uma empresa de tecnologia. Tem bagagem real em
                  organização de eventos, gestão de espaços e hotelaria, estratégia de negócios
                  e operação de plataformas com utilizadores reais. Isso significa que entendemos
                  o problema antes de escrever uma linha de código.
                </p>

                {/* Perfil do fundador */}
                <div className="flex items-start gap-5 p-6 bg-white/5 rounded-2xl border border-white/10">
                  <img
                    src={SANDRO_PHOTO}
                    alt="Sandro Sanches"
                    className="w-16 h-16 rounded-full object-cover shrink-0 ring-2 ring-sand-400/40"
                  />
                  <div className="min-w-0">
                    <p className="text-base font-medium text-white mb-0.5">Sandro Sanches</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-sand-400 mb-3">
                      Fundador · Legaltech Space Group
                    </p>
                    <p className="text-sm text-white/60 font-light leading-relaxed mb-4">
                      Empreendedor com experiência em tecnologia, estratégia digital e gestão de negócios.
                      Responsável pela visão e execução da infraestrutura digital da Fundação Luso-Brasileira.
                    </p>
                    <a
                      href="https://br.linkedin.com/in/sandrosanches"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-sand-400 hover:text-white transition-colors"
                    >
                      LinkedIn →
                    </a>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </SectionWrapper>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="bg-[#f8f6f2] py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <Badge variant="light" className="mb-6 bg-sand-400/10 text-sand-600 border-sand-400/30">
              Para membros da Fundação
            </Badge>
            <h2 className="text-4xl md:text-5xl font-light text-brand-900 tracking-tight mb-6 leading-tight">
              Se você faz parte da Fundação, já tem acesso a uma{' '}
              <span className="font-serif italic text-sand-500">infraestrutura de alto nível.</span>
              <br />
              Agora é hora de usar isso para crescer.
            </h2>
            <p className="text-slate-500 font-light leading-relaxed mb-10 max-w-xl mx-auto">
              A mesma equipe que construiu esta plataforma pode ajudar o seu projeto a sair do papel.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="mailto:contato@legaltechspace.com">
                <Button variant="gold" className="px-8 py-4 rounded-full text-xs">
                  Quero desenvolver meu projeto
                </Button>
              </a>
              <Link to="/parceiros">
                <Button variant="outline" className="px-8 py-4 rounded-full text-xs">
                  Ver outros parceiros
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
};
