// pages/administracao/AdminPage.tsx
import React, { useState, useEffect } from 'react';
import { usePageMeta } from '../../hooks/usePageMeta';
import { PARTNERS, COUNCILS, FLB_STATE_EVENT } from '../../store/app.store';
import { MemberCard } from '../../components/domain/MemberCard';
import { Reveal } from '../../components/ui/Reveal';
import { Badge } from '../../components/ui/Badge';
import { SectionWrapper } from '../../components/ui/Layout';
import { PremiumLoader } from '../../components/ui/Loaders';
import type { Partner, MemberTier, CouncilMember, CouncilType } from '../../types';

interface TierSectionProps {
  title: string;
  subtitle?: string;
  members: Partner[];
  size?: 'large' | 'medium' | 'small';
  cols?: string;
  /**
   * When true the section is always rendered, even if the members array is
   * empty. An "Em breve" placeholder is shown in that case. Used for the
   * Conselho Fiscal and Conselho de Curadores sections, which are publicly
   * announced but not yet populated.
   */
  showEmptyPlaceholder?: boolean;
  emptyMessage?: string;
}

const TierSection: React.FC<TierSectionProps> = ({
  title,
  subtitle,
  members,
  size = 'medium',
  cols = 'sm:grid-cols-2 lg:grid-cols-3',
  showEmptyPlaceholder = false,
  emptyMessage = 'Em breve.',
}) => {
  if (!members.length && !showEmptyPlaceholder) return null;
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
      {members.length ? (
        <div className={`grid gap-4 ${cols}`}>
          {members.map((member, idx) => (
            <Reveal key={member.id} delay={idx * 60}>
              <MemberCard member={member} size={size} showExpandable />
            </Reveal>
          ))}
        </div>
      ) : (
        <Reveal>
          <div className="py-10 px-6 text-center border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-sand-400 mb-2">Em breve</p>
            <p className="text-white/50 text-sm font-light max-w-xl mx-auto leading-relaxed">{emptyMessage}</p>
          </div>
        </Reveal>
      )}
    </div>
  );
};

/**
 * Conselho de Curadores e Conselho Fiscal são listados APENAS por nome
 * (sem foto, sem card de perfil, sem link). Os dados vêm da tabela isolada
 * `council_members` (store COUNCILS), por isso nomes que também são membros
 * do Conselho de Administração podem repetir aqui sem conflito.
 */
interface CouncilNameSectionProps {
  title: string;
  subtitle?: string;
  members: CouncilMember[];
  emptyMessage: string;
}

const CouncilNameSection: React.FC<CouncilNameSectionProps> = ({ title, subtitle, members, emptyMessage }) => (
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
    {members.length ? (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((m, idx) => (
          <Reveal key={m.id} delay={idx * 40}>
            <div className="flex items-center gap-3 px-5 py-4 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] transition-colors">
              <span className="h-1.5 w-1.5 rounded-full bg-sand-400/70 shrink-0" />
              <div className="min-w-0">
                <p className="text-white/90 font-light leading-snug">{m.name}</p>
                {m.role && (
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sand-500/80 mt-0.5">{m.role}</p>
                )}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    ) : (
      <Reveal>
        <div className="py-10 px-6 text-center border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-sand-400 mb-2">Em breve</p>
          <p className="text-white/50 text-sm font-light max-w-xl mx-auto leading-relaxed">{emptyMessage}</p>
        </div>
      </Reveal>
    )}
  </div>
);

const byCouncilOrder = (a: CouncilMember, b: CouncilMember) =>
  (a.order - b.order) || a.name.localeCompare(b.name);

const byDisplayOrder = (a: Partner, b: Partner) => {
  if (Boolean(a.featured) !== Boolean(b.featured)) return a.featured ? -1 : 1;
  if ((a.order || 99) !== (b.order || 99)) return (a.order || 99) - (b.order || 99);
  return a.name.localeCompare(b.name);
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

  const governanceMembers = PARTNERS.filter((p: Partner) => p.category === 'Governança' && p.active !== false);

  const byTier = (tier: MemberTier) =>
    PARTNERS
      .filter((p: Partner) => p.tier === tier && p.active !== false)
      .sort(byDisplayOrder);

  const presidente = byTier('presidente');
  const direcao = byTier('direcao');
  const secretario = byTier('secretario-geral');
  const vogais = byTier('vogal');
  const conselhoFiscal = byTier('conselho-fiscal');
  const conselhoCuradores = byTier('conselho-curadores');
  // Conselhos listados só por nome (tabela council_members → store COUNCILS).
  const byCouncil = (council: CouncilType) =>
    COUNCILS.filter((m: CouncilMember) => m.council === council && m.active !== false).sort(byCouncilOrder);
  const curadoresNames = byCouncil('curadores');
  const fiscalNames = byCouncil('fiscal');
  const assignedIds = new Set(
    [...presidente, ...direcao, ...secretario, ...vogais, ...conselhoFiscal, ...conselhoCuradores]
      .map(member => member.id)
  );
  const semCargoDefinido = governanceMembers
    .filter(member => !assignedIds.has(member.id))
    .sort(byDisplayOrder);

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
        <CouncilNameSection
          title="Conselho Fiscal"
          subtitle="Órgão de fiscalização da Fundação"
          members={fiscalNames}
          emptyMessage="A composição do Conselho Fiscal será divulgada em breve."
        />
        <CouncilNameSection
          title="Conselho de Curadores"
          subtitle="Órgão consultivo e de orientação estratégica"
          members={curadoresNames}
          emptyMessage="A composição do Conselho de Curadores será divulgada em breve."
        />
        <TierSection
          title="Governança"
          subtitle="Perfis sem cargo definido"
          members={semCargoDefinido}
          size="medium"
          cols="sm:grid-cols-2 lg:grid-cols-3"
        />

        {!presidente.length && !direcao.length && !secretario.length && !vogais.length && !semCargoDefinido.length && (
          <div className="py-20 text-center border border-dashed border-white/10 rounded-3xl">
            <p className="text-white/40 text-sm">A sincronizar membros...</p>
          </div>
        )}
      </SectionWrapper>
    </div>
  );
};
