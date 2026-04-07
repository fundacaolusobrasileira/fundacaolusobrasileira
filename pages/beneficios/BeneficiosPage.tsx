import React, { useEffect, useState } from 'react';
import { ExternalLink, Loader2, Gift } from 'lucide-react';
import { SectionWrapper } from '../../components/ui/Layout';
import { Reveal } from '../../components/ui/Reveal';
import { fetchBenefits } from '../../services/benefits.service';
import { PARTNERS, FLB_STATE_EVENT } from '../../store/app.store';
import { usePageMeta } from '../../hooks/usePageMeta';
import type { Benefit, BenefitCategory, Partner } from '../../types';

const CATEGORY_CONFIG: Record<BenefitCategory, { label: string; color: string }> = {
  desconto: { label: 'Desconto',  color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  acesso:   { label: 'Acesso',    color: 'bg-blue-100 text-blue-700 border-blue-200' },
  serviço:  { label: 'Serviço',   color: 'bg-purple-100 text-purple-700 border-purple-200' },
  outro:    { label: 'Outro',     color: 'bg-slate-100 text-slate-500 border-slate-200' },
};

interface GroupedBenefits {
  partner: Partner;
  benefits: Benefit[];
}

export const BeneficiosPage = () => {
  usePageMeta('Benefícios – Fundação Luso-Brasileira', 'Benefícios exclusivos para a comunidade luso-brasileira, oferecidos pelos nossos parceiros.');

  const [loading, setLoading] = useState(true);
  const [grouped, setGrouped] = useState<GroupedBenefits[]>([]);
  const [, setTick] = useState(0);

  useEffect(() => {
    const handler = () => setTick(t => t + 1);
    window.addEventListener(FLB_STATE_EVENT, handler);
    return () => window.removeEventListener(FLB_STATE_EVENT, handler);
  }, []);

  useEffect(() => {
    fetchBenefits().then(benefits => {
      const map = new Map<string, Benefit[]>();
      for (const b of benefits) {
        const arr = map.get(b.partner_id) || [];
        arr.push(b);
        map.set(b.partner_id, arr);
      }

      const result: GroupedBenefits[] = [];
      map.forEach((bens, partnerId) => {
        const partner = PARTNERS.find(p => p.id === partnerId);
        if (partner) result.push({ partner, benefits: bens });
      });

      result.sort((a, b) => (a.partner.order ?? 999) - (b.partner.order ?? 999));
      setGrouped(result);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-brand-900 pt-40 pb-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900 via-brand-900 to-brand-800 opacity-80" />
        <SectionWrapper className="relative z-10">
          <Reveal>
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-sand-400/20 flex items-center justify-center">
                  <Gift size={20} className="text-sand-400" />
                </div>
                <span className="text-sand-400 text-sm font-medium uppercase tracking-widest">Comunidade</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-light text-white mb-4">Benefícios</h1>
              <p className="text-slate-300 text-lg font-light leading-relaxed">
                Vantagens exclusivas oferecidas pelos nossos parceiros à comunidade luso-brasileira.
              </p>
            </div>
          </Reveal>
        </SectionWrapper>
      </section>

      {/* Content */}
      <SectionWrapper className="py-20 md:py-28">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={28} className="animate-spin text-slate-400" />
          </div>
        ) : grouped.length === 0 ? (
          <div className="text-center py-24">
            <Gift size={40} className="text-slate-300 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">Nenhum benefício disponível de momento.</p>
          </div>
        ) : (
          <div className="space-y-16">
            {grouped.map(({ partner, benefits }, idx) => (
              <Reveal key={partner.id} delay={idx * 60}>
                <div>
                  {/* Partner header */}
                  <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-100">
                    {partner.image ? (
                      <img
                        src={partner.image}
                        alt={partner.name}
                        className="w-14 h-14 rounded-full object-cover border-2 border-slate-100"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-serif text-xl">
                        {partner.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h2 className="text-xl font-serif text-brand-900">{partner.name}</h2>
                      {partner.category && (
                        <span className="text-xs text-slate-400">{partner.category}</span>
                      )}
                    </div>
                  </div>

                  {/* Benefits grid */}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {benefits.map(b => {
                      const cfg = CATEGORY_CONFIG[b.category] ?? CATEGORY_CONFIG.outro;
                      return (
                        <div key={b.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.color}`}>
                              {cfg.label}
                            </span>
                          </div>
                          <h3 className="font-semibold text-slate-900 text-sm mb-1">{b.title}</h3>
                          {b.description && (
                            <p className="text-xs text-slate-500 leading-relaxed mb-3">{b.description}</p>
                          )}
                          {b.link && (
                            <a
                              href={b.link}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-900 transition-colors"
                            >
                              Saber mais <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </SectionWrapper>
    </div>
  );
};
