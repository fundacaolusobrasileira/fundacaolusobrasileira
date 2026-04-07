// pages/administracao/AdminPage.tsx
import React, { useState, useEffect } from 'react';
import { usePageMeta } from '../../hooks/usePageMeta';
import { PARTNERS, FLB_STATE_EVENT } from '../../store/app.store';
import { MemberCard } from '../../components/domain/MemberCard';
import { Reveal } from '../../components/ui/Reveal';
import { Badge } from '../../components/ui/Badge';
import { SectionWrapper } from '../../components/ui/Layout';
import { PremiumLoader } from '../../components/ui/Loaders';
import type { Partner, MemberTier } from '../../types';

interface TierSectionProps {
  title: string;
  subtitle?: string;
  members: Partner[];
  size?: 'large' | 'medium' | 'small';
  cols?: string;
}

const TierSection: React.FC<TierSectionProps> = ({ title, subtitle, members, size = 'medium', cols = 'sm:grid-cols-2 lg:grid-cols-3' }) => {
  if (!members.length) return null;
  return (
    <div className="mb-16 md:mb-20">
      <Reveal>
        <div className="flex items-center gap-4 mb-8">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-sand-500">{title}</h2>
            {subtitle && <p className="text-sm text-white/40 font-light mt-0.5">{subtitle}</p>}
          </div>
          <div className="h-px bg-white/10 flex-grow"></div>
        </div>
      </Reveal>
      <div className={`grid gap-4 ${cols}`}>
        {members.map((member, idx) => (
          <Reveal key={member.id} delay={idx * 60}>
            <MemberCard member={member} size={size} showExpandable />
          </Reveal>
        ))}
      </div>
    </div>
  );
};

export const AdminPage = () => {
  usePageMeta('Administração – Fundação Luso-Brasileira', 'Conselho de Administração e estrutura de governança.');
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 800);
    const handler = () => setTick(v => v + 1);
    window.addEventListener(FLB_STATE_EVENT, handler);
    return () => { clearTimeout(t); window.removeEventListener(FLB_STATE_EVENT, handler); };
  }, []);

  const byTier = (tier: MemberTier) =>
    PARTNERS
      .filter((p: Partner) => p.tier === tier && p.category !== 'Governança')
      .sort((a: Partner, b: Partner) => (a.order || 99) - (b.order || 99));

  const governanca = PARTNERS
    .filter((p: Partner) => p.category === 'Governança')
    .sort((a: Partner, b: Partner) => (a.order || 99) - (b.order || 99));

  const presidente = byTier('presidente');
  const direcao = byTier('direcao');
  const secretario = byTier('secretario-geral');
  const vogais = byTier('vogal');

  if (loading) return <PremiumLoader />;

  return (
    <div className="bg-brand-900 min-h-screen">
      {/* HERO */}
      <section className="pt-40 pb-20 px-6 border-b border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(201,175,136,0.06),transparent_60%)] pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10">
          <Reveal>
            <Badge variant="dark" className="mb-6">Pessoas</Badge>
            <h1 className="text-5xl md:text-7xl font-light text-white mb-6 tracking-tight leading-[1.05]">
              Conselho de <br />
              <span className="font-serif italic text-white/40">Administração</span>
            </h1>
            <p className="text-lg text-white/50 max-w-2xl font-light leading-relaxed">
              Liderança comprometida com a excelência, transparência e a perenidade da missão institucional da Fundação.
            </p>
          </Reveal>
        </div>
      </section>

      <SectionWrapper className="py-20 md:py-28">
        <TierSection
          title="Presidente"
          members={presidente}
          size="large"
          cols="grid-cols-1 max-w-2xl"
        />
        <TierSection
          title="Direção e Secretariado"
          members={[...direcao, ...secretario]}
          size="medium"
          cols="sm:grid-cols-2 lg:grid-cols-3 max-w-4xl"
        />
        <TierSection
          title="Vogais"
          members={vogais}
          size="small"
          cols="sm:grid-cols-2 lg:grid-cols-4"
        />

        {/* Divisor visual */}
        {governanca.length > 0 && (presidente.length > 0 || direcao.length > 0 || vogais.length > 0) && (
          <div className="my-4 border-t border-white/10" />
        )}

        <TierSection
          title="Governança"
          subtitle="Entidades e representantes com papel institucional na Fundação"
          members={governanca}
          size="medium"
          cols="sm:grid-cols-2 lg:grid-cols-3"
        />

        {!presidente.length && !direcao.length && !secretario.length && !vogais.length && !governanca.length && (
          <div className="py-20 text-center border border-dashed border-white/10 rounded-3xl">
            <p className="text-white/40 text-sm">A sincronizar membros...</p>
          </div>
        )}
      </SectionWrapper>
    </div>
  );
};
