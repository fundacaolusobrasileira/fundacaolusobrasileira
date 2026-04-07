// pages/quem-somos/QuemSomosPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '../../hooks/usePageMeta';
import { MISSION, PRESIDENT_MESSAGE, PILLARS, HISTORY } from '../../data/content.data';
import { ExpandableText } from '../../components/ui/ExpandableText';
import { Reveal } from '../../components/ui/Reveal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { SectionWrapper } from '../../components/ui/Layout';

export const QuemSomosPage = () => {
  usePageMeta('Quem Somos – Fundação Luso-Brasileira', 'Missão, história e valores da Fundação.');

  return (
    <main className="bg-white text-slate-900 overflow-hidden">
      {/* HERO */}
      <section className="bg-brand-900 pt-40 pb-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(201,175,136,0.08),transparent_60%)] pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10">
          <Reveal>
            <Badge variant="dark" className="mb-6">A Fundação</Badge>
            <h1 className="text-5xl md:text-7xl font-light text-white tracking-tight mb-6 leading-[1.05]">
              Quem <span className="font-serif italic text-sand-400">Somos</span>
            </h1>
            <p className="text-lg text-white/60 max-w-2xl font-light leading-relaxed">
              {MISSION.summary}
            </p>
          </Reveal>
        </div>
      </section>

      {/* MISSÃO COMPLETA */}
      <SectionWrapper className="py-20 md:py-28">
        <div className="grid md:grid-cols-12 gap-10">
          <div className="md:col-span-4">
            <Reveal>
              <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                <span className="w-8 h-px bg-sand-400"></span> Missão
              </h2>
            </Reveal>
          </div>
          <div className="md:col-span-8">
            <Reveal delay={100}>
              <ExpandableText
                summary={MISSION.summary}
                full={MISSION.full}
                textClassName="text-lg text-slate-600 font-light leading-relaxed"
                previewLines={5}
              />
            </Reveal>
          </div>
        </div>
      </SectionWrapper>

      {/* HISTÓRIA */}
      <section className="bg-[#f8f6f2] py-20 md:py-28">
        <SectionWrapper>
          <div className="grid md:grid-cols-12 gap-10">
            <div className="md:col-span-4">
              <Reveal>
                <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                  <span className="w-8 h-px bg-sand-400"></span> História
                </h2>
              </Reveal>
            </div>
            <div className="md:col-span-8">
              <Reveal delay={100}>
                <p className="text-3xl md:text-4xl font-light text-brand-900 leading-tight tracking-tight mb-8">
                  Mais de duas décadas de cooperação luso-brasileira.
                </p>
                <ExpandableText
                  summary={HISTORY.summary}
                  full={HISTORY.full}
                  textClassName="text-base text-slate-600 font-light leading-relaxed"
                />
              </Reveal>
            </div>
          </div>
        </SectionWrapper>
      </section>

      {/* 4 PILARES */}
      <SectionWrapper className="py-20 md:py-28">
        <Reveal>
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-12 flex items-center gap-3">
            <span className="w-8 h-px bg-sand-400"></span> Áreas de Atuação
          </h2>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PILLARS.map((pillar, idx) => (
            <Reveal key={pillar.id} delay={idx * 80}>
              <div className="p-6 border border-slate-200 rounded-2xl hover:border-sand-400/50 hover:shadow-md transition-all duration-300 h-full flex flex-col">
                <div className="w-10 h-10 bg-brand-900 rounded-xl flex items-center justify-center mb-5 shrink-0">
                  <pillar.icon size={18} className="text-sand-400" />
                </div>
                <h3 className="text-lg font-serif text-brand-900 mb-3">{pillar.title}</h3>
                <p className="text-sm text-slate-500 font-light leading-relaxed">{pillar.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </SectionWrapper>

      {/* MENSAGEM DO PRESIDENTE */}
      <section className="bg-[#f8f6f2] py-20 md:py-28">
        <SectionWrapper>
          <div className="grid md:grid-cols-12 gap-10 md:gap-16 items-start">
            <div className="md:col-span-5">
              <Reveal>
                <div className="aspect-[4/5] overflow-hidden rounded-2xl shadow-lg">
                  <img src="/presidente.webp" alt="Paulo Campos Costa" width={400} height={500} className="w-full h-full object-cover grayscale" />
                </div>
              </Reveal>
            </div>
            <div className="md:col-span-7">
              <Reveal delay={100}>
                <Badge variant="light" className="mb-6 bg-slate-100 text-slate-600 border-slate-200">Presidência</Badge>
                <h2 className="text-3xl md:text-4xl font-serif text-brand-900 mb-8 leading-tight">
                  Construindo Pontes
                </h2>
                <ExpandableText
                  summary={PRESIDENT_MESSAGE.quote}
                  full={PRESIDENT_MESSAGE.full}
                  previewLines={6}
                  textClassName="text-base md:text-lg text-slate-600 font-light leading-relaxed italic"
                />
                <div className="mt-8 pt-6 border-t border-slate-200">
                  <p className="text-base font-medium text-brand-900">{PRESIDENT_MESSAGE.author}</p>
                  <p className="text-xs uppercase tracking-widest text-slate-400 mt-1">{PRESIDENT_MESSAGE.role}</p>
                  <p className="text-[10px] uppercase tracking-widest text-sand-500 mt-1">{PRESIDENT_MESSAGE.company}</p>
                </div>
              </Reveal>
            </div>
          </div>
        </SectionWrapper>
      </section>

      {/* CTA */}
      <section className="bg-brand-900 py-24 text-center px-6">
        <div className="max-w-2xl mx-auto">
          <Reveal>
            <h2 className="text-4xl font-light text-white tracking-tight mb-6">
              Faça parte desta missão.
            </h2>
            <p className="text-white/60 text-lg font-light mb-10 leading-relaxed">
              Junte-se à Fundação Luso-Brasileira e contribua para o fortalecimento dos laços entre Portugal e Brasil.
            </p>
            <Link to="/precadastro">
              <Button variant="gold" className="px-8 py-4 rounded-full text-xs">
                Tornar-se Membro
              </Button>
            </Link>
          </Reveal>
        </div>
      </section>
    </main>
  );
};
