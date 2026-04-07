// components/domain/PartnerCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ExpandableText } from '../ui/ExpandableText';
import type { PartnerSeed } from '../../data/partners.data';

interface PartnerCardProps {
  partner: PartnerSeed;
}

const CardInner: React.FC<PartnerCardProps> = ({ partner }) => (
  <>
    <div className="flex items-start gap-4 mb-4">
      <div className="h-14 w-20 flex items-center justify-center shrink-0 bg-slate-50 rounded-xl p-2">
        <img
          src={partner.image}
          alt={partner.name}
          className="max-h-full max-w-full object-contain filter grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-500"
        />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-widest text-sand-500 mb-0.5">
          {partner.category}{partner.since ? ` \u00B7 Est. ${partner.since}` : ''}
        </p>
        <h3 className="text-base font-serif text-brand-900">{partner.name}</h3>
      </div>
    </div>
    <ExpandableText
      summary={partner.bio}
      full={partner.bioFull}
      previewLines={3}
      textClassName="text-sm text-slate-500 font-light leading-relaxed"
    />
    {!partner.pageRoute && partner.website && (
      <a
        href={partner.website}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 mt-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-brand-900 transition-colors"
      >
        Site oficial &rarr;
      </a>
    )}
  </>
);

export const PartnerCard: React.FC<PartnerCardProps> = ({ partner }) => {
  const cardClass =
    'bg-white border border-slate-200/80 rounded-2xl p-6 hover:border-sand-400/50 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-500 flex flex-col h-full';

  if (partner.pageRoute) {
    return (
      <Link to={partner.pageRoute} className={`${cardClass} cursor-pointer`}>
        <CardInner partner={partner} />
      </Link>
    );
  }

  return (
    <div className={cardClass}>
      <CardInner partner={partner} />
    </div>
  );
};
