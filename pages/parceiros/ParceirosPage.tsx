// pages/parceiros/ParceirosPage.tsx
import React, { useState, useEffect } from 'react';
import { usePageMeta } from '../../hooks/usePageMeta';
import { PARTNERS_SEED } from '../../data/partners.data';
import { PARTNERS, FLB_STATE_EVENT } from '../../store/app.store';
import { PartnerCard } from '../../components/domain/PartnerCard';
import { Reveal } from '../../components/ui/Reveal';
import { Badge } from '../../components/ui/Badge';
import { SectionWrapper } from '../../components/ui/Layout';
import { Star, Award, Shield, Landmark, Heart, Store } from 'lucide-react';
import { Link } from 'react-router-dom';

const SectionDivider = ({ icon: Icon, label, dark }: { icon: React.ElementType; label: string; dark?: boolean }) => (
  <Reveal>
    <div className="flex items-center gap-3 mb-12">
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${dark ? 'bg-brand-900' : 'bg-slate-100'}`}>
        <Icon size={10} className={dark ? 'text-sand-400' : 'text-brand-700'} />
        <span className={`text-[9px] font-bold uppercase tracking-[0.2em] ${dark ? 'text-white' : 'text-brand-900'}`}>{label}</span>
      </div>
      <div className="h-px bg-slate-200 flex-grow"></div>
    </div>
  </Reveal>
);

const EmptySection = ({ label }: { label: string }) => (
  <Reveal>
    <p className="text-slate-400 font-light text-sm italic">Em breve</p>
  </Reveal>
);

export const ParceirosPage = () => {
  usePageMeta('Parceiros – Fundação Luso-Brasileira', 'Rede de patrocinadores, parceiros e amigos da Fundação Luso-Brasileira.');

  const [tick, setTick] = useState(0);

  useEffect(() => {
    const update = () => setTick(t => t + 1);
    window.addEventListener(FLB_STATE_EVENT, update);
    return () => window.removeEventListener(FLB_STATE_EVENT, update);
  }, []);

  // Use live Supabase data when available, otherwise fall back to seed data
  const source = PARTNERS.length > 0 ? PARTNERS : PARTNERS_SEED;

  const platinum = source.filter(p => p.category === 'Parceiro Platinum');
  const gold = source.filter(p => p.category === 'Parceiro Gold');
  const silver = source.filter(p => p.category === 'Parceiro Silver');
  const apoioPublico = source.filter(p => p.category === 'Apoio Público');
  const outroApoio = source.filter(p => p.category === 'Outro Apoio');
  const exposicao = source.filter(p => p.category === 'Exposição');

  return (
    <main className="bg-white min-h-screen overflow-hidden">
      {/* HERO */}
      <section className="bg-brand-900 pt-40 pb-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(201,175,136,0.08),transparent_60%)] pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10">
          <Reveal>
            <Badge variant="dark" className="mb-6">Rede de Apoio</Badge>
            <h1 className="text-5xl md:text-7xl font-light text-white tracking-tight mb-6 leading-[1.05]">
              Nossa <span className="font-serif italic text-sand-400">Rede</span>
            </h1>
            <p className="text-lg text-white/60 font-light leading-relaxed max-w-2xl">
              As instituições e pessoas que sustentam a ponte cultural e empresarial entre Portugal e Brasil.
            </p>
          </Reveal>
        </div>
      </section>

      {/* PARCEIROS PLATINUM */}
      <SectionWrapper className="py-20 md:py-28">
        <SectionDivider icon={Star} label="Parceiros Platinum" dark />
        {platinum.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {platinum.map((partner, idx) => (
              <Reveal key={partner.id} delay={idx * 60}>
                <PartnerCard partner={partner} />
              </Reveal>
            ))}
          </div>
        ) : (
          <EmptySection label="Parceiros Platinum" />
        )}
      </SectionWrapper>

      {/* PARCEIROS GOLD */}
      <section className="bg-[#f8f6f2] py-20">
        <SectionWrapper>
          <SectionDivider icon={Award} label="Parceiros Gold" />
          {gold.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {gold.map((partner, idx) => (
                <Reveal key={partner.id} delay={idx * 60}>
                  <PartnerCard partner={partner} />
                </Reveal>
              ))}
            </div>
          ) : (
            <EmptySection label="Parceiros Gold" />
          )}
        </SectionWrapper>
      </section>

      {/* PARCEIROS SILVER */}
      <SectionWrapper className="py-20 md:py-28">
        <SectionDivider icon={Shield} label="Parceiros Silver" dark />
        {silver.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {silver.map((partner, idx) => (
              <Reveal key={partner.id} delay={idx * 60}>
                <PartnerCard partner={partner} />
              </Reveal>
            ))}
          </div>
        ) : (
          <EmptySection label="Parceiros Silver" />
        )}
      </SectionWrapper>

      {/* APOIOS PÚBLICOS */}
      <section className="bg-[#f8f6f2] py-20">
        <SectionWrapper>
          <SectionDivider icon={Landmark} label="Apoios Públicos e Fundos Estruturais" />
          {apoioPublico.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {apoioPublico.map((partner, idx) => (
                <Reveal key={partner.id} delay={idx * 60}>
                  <PartnerCard partner={partner} />
                </Reveal>
              ))}
            </div>
          ) : (
            <EmptySection label="Apoios Públicos" />
          )}
        </SectionWrapper>
      </section>

      {/* OUTROS APOIOS */}
      <SectionWrapper className="py-20 md:py-28">
        <SectionDivider icon={Heart} label="Outros Apoios" dark />
        {outroApoio.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {outroApoio.map((partner, idx) => (
              <Reveal key={partner.id} delay={idx * 60}>
                <PartnerCard partner={partner} />
              </Reveal>
            ))}
          </div>
        ) : (
          <EmptySection label="Outros Apoios" />
        )}
      </SectionWrapper>

      {/* EXPOSIÇÃO E ESPAÇOS COMERCIAIS */}
      <section className="bg-[#f8f6f2] py-20">
        <SectionWrapper>
          <SectionDivider icon={Store} label="Exposição e Espaços Comerciais" />
          {exposicao.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {exposicao.map((partner, idx) => (
                <Reveal key={partner.id} delay={idx * 60}>
                  <PartnerCard partner={partner} />
                </Reveal>
              ))}
            </div>
          ) : (
            <EmptySection label="Exposição" />
          )}
        </SectionWrapper>
      </section>

      {/* CTA */}
      <section className="bg-brand-900 py-20 text-center px-6">
        <Reveal>
          <p className="text-white/50 text-sm font-light mb-4">Interessado em fazer parte da nossa rede?</p>
          <Link
            to="/precadastro"
            className="inline-flex items-center gap-2 px-6 py-3 bg-sand-400 text-brand-900 text-xs font-bold uppercase tracking-widest rounded-full hover:bg-sand-300 transition-colors"
          >
            Tornar-se Parceiro
          </Link>
        </Reveal>
      </section>
    </main>
  );
};
