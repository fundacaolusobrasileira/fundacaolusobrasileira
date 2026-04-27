// components/domain/PartnerCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';

interface PartnerCardProps {
  partner: {
    id: string;
    name: string;
    image?: string;
    bio?: string;
    category: string;
    since?: string;
    pageRoute?: string;
    featured?: boolean;
  };
}

export const PartnerCard: React.FC<PartnerCardProps> = ({ partner }) => {
  const route = partner.pageRoute ?? `/membro/${partner.id}`;
  return (
    <Link
      to={route}
      className="group bg-white border border-slate-200/80 rounded-2xl p-6 hover:border-sand-400/50 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-500 flex flex-col h-full focus:outline-none focus:ring-2 focus:ring-sand-400"
      aria-label={`Parceiro: ${partner.name}`}
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="h-14 w-20 flex items-center justify-center shrink-0 bg-slate-50 rounded-xl p-2">
          {partner.image
            ? <img src={partner.image} alt="" width={80} height={56} loading="lazy" className="max-h-full max-w-full object-contain filter grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" />
            : <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xl font-serif text-brand-900/40">{partner.name.charAt(0)}</div>
          }
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-sand-500">
              {partner.category}{partner.since ? ` \u00B7 Est. ${partner.since}` : ''}
            </p>
            {partner.featured && (
              <span className="inline-flex items-center rounded-full bg-sand-100 px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest text-sand-700">
                Destaque
              </span>
            )}
          </div>
          <h3 className="text-sm font-serif text-brand-900 group-hover:text-sand-600 transition-colors">{partner.name}</h3>
        </div>
      </div>
      {partner.bio && (
        <p className="text-sm text-slate-500 font-light leading-relaxed line-clamp-3 flex-grow">{partner.bio}</p>
      )}
    </Link>
  );
};
