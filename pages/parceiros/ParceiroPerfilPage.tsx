// pages/parceiros/ParceiroPerfilPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { safeUrl } from '../../utils/url';
import { ArrowLeft, ExternalLink, Tag } from 'lucide-react';
import { PARTNERS, FLB_STATE_EVENT } from '../../store/app.store';
import { PARTNERS_SEED } from '../../data/partners.data';
import { usePageMeta } from '../../hooks/usePageMeta';
import { SectionWrapper } from '../../components/ui/Layout';
import { Badge } from '../../components/ui/Badge';
import { PremiumLoader } from '../../components/ui/Loaders';
import { Reveal } from '../../components/ui/Reveal';
import type { PartnerSeed } from '../../data/partners.data';

export const ParceiroPerfilPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [partner, setPartner] = useState<PartnerSeed | null>(null);

  usePageMeta(
    partner ? `${partner.name} – Parceiros` : 'Parceiro',
    partner?.bio ?? ''
  );

  useEffect(() => {
    const source = PARTNERS.length > 0 ? PARTNERS : PARTNERS_SEED;
    const find = () => source.find(p => p.id === id) ?? null;
    setPartner(find());

    const handler = () => setPartner(find());
    window.addEventListener(FLB_STATE_EVENT, handler);
    return () => window.removeEventListener(FLB_STATE_EVENT, handler);
  }, [id]);

  if (!partner) return <PremiumLoader />;

  // If this partner has a custom dedicated page, redirect there
  if (partner.pageRoute && partner.pageRoute !== `/parceiros/${id}`) {
    navigate(partner.pageRoute, { replace: true });
    return null;
  }

  const categoryColors: Record<string, string> = {
    'Parceiro Platinum': 'dark',
    'Parceiro Gold': 'light',
    'Parceiro Silver': 'light',
    'Apoio Público': 'light',
    'Outro Apoio': 'light',
    'Exposição': 'light',
    'Governança': 'dark',
  };

  return (
    <main className="min-h-screen bg-white overflow-hidden">
      {/* HERO */}
      <section className="bg-brand-900 pt-40 pb-24 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(201,175,136,0.08),transparent_60%)] pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10">
          <Reveal>
            <button
              onClick={() => navigate('/parceiros')}
              className="inline-flex items-center gap-2 text-white/40 hover:text-white text-xs font-medium tracking-wide mb-10 transition-colors"
            >
              <ArrowLeft size={14} /> Todos os Parceiros
            </button>

            <Badge variant={categoryColors[partner.category] as 'dark' | 'light' ?? 'dark'} className="mb-6">
              {partner.category}{partner.since ? ` · Est. ${partner.since}` : ''}
            </Badge>

            <div className="flex items-start gap-6 mb-6">
              <div className="h-16 w-24 flex items-center justify-center shrink-0 bg-white/10 rounded-2xl p-3">
                <img
                  src={partner.image}
                  alt={partner.name}
                  className="max-h-full max-w-full object-contain filter brightness-0 invert opacity-80"
                />
              </div>
              <h1 className="text-4xl md:text-6xl font-light text-white tracking-tight leading-[1.05] pt-1">
                {partner.name}
              </h1>
            </div>

            <p className="text-lg text-white/60 max-w-2xl font-light leading-relaxed">
              {partner.bio}
            </p>
          </Reveal>
        </div>
      </section>

      {/* BODY */}
      <SectionWrapper className="py-20 md:py-28">
        <div className="grid md:grid-cols-12 gap-10 md:gap-16">
          {/* Main content */}
          <div className="md:col-span-8">
            <Reveal>
              <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                <span className="w-8 h-px bg-sand-400" /> Sobre
              </h2>
              <div className="prose prose-slate max-w-none">
                {partner.bioFull.split('\n\n').map((para, i) => (
                  <p key={i} className="text-base text-slate-600 font-light leading-relaxed mb-5">
                    {para.trim()}
                  </p>
                ))}
              </div>
            </Reveal>
          </div>

          {/* Sidebar */}
          <div className="md:col-span-4 space-y-8">
            {/* Tags */}
            {partner.tags && partner.tags.length > 0 && (
              <Reveal delay={100}>
                <div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <Tag size={10} /> Áreas
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {partner.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Reveal>
            )}

            {/* Website */}
            {partner.website && (
              <Reveal delay={150}>
                <div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">
                    Website
                  </h3>
                  <a
                    href={safeUrl(partner.website)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-brand-900 font-medium hover:text-sand-600 transition-colors"
                  >
                    <ExternalLink size={14} />
                    {partner.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              </Reveal>
            )}

            {/* Country */}
            {partner.country && (
              <Reveal delay={200}>
                <div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">
                    País
                  </h3>
                  <p className="text-sm text-slate-600">{partner.country}</p>
                </div>
              </Reveal>
            )}

            {/* Back link */}
            <Reveal delay={250}>
              <Link
                to="/parceiros"
                className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-brand-900 transition-colors"
              >
                <ArrowLeft size={12} /> Ver todos os parceiros
              </Link>
            </Reveal>
          </div>
        </div>
      </SectionWrapper>
    </main>
  );
};
