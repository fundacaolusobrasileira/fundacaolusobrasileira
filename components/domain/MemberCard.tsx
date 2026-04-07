// components/domain/MemberCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, User } from 'lucide-react';
import { ExpandableText } from '../ui/ExpandableText';
import type { Partner, MemberTier } from '../../types';

interface MemberCardProps {
  member: Partner;
  size?: 'large' | 'medium' | 'small';
  showExpandable?: boolean;
}

const tierLabel: Record<MemberTier, string> = {
  'presidente': 'Presidente',
  'direcao': 'Direção',
  'secretario-geral': 'Secretário Geral',
  'vogal': 'Vogal',
};

export const MemberCard: React.FC<MemberCardProps> = ({ member, size = 'medium', showExpandable = false }) => {
  const label = member.tier ? tierLabel[member.tier] : (member.role || member.category);

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden hover:border-sand-400/50 hover:shadow-lg transition-all duration-500 hover:-translate-y-0.5 flex flex-col h-full">
      <div className={`flex items-center gap-4 ${size === 'large' ? 'p-6' : 'p-5'}`}>
        <div className={`
          overflow-hidden rounded-xl shrink-0 shadow-sm bg-slate-100 flex items-center justify-center
          ${size === 'large' ? 'w-20 h-20' : size === 'medium' ? 'w-14 h-14' : 'w-11 h-11'}
        `}>
          {(member.image || member.avatar) ? (
            <img src={member.image || member.avatar} alt={member.name} width={200} height={200} loading="lazy" className="w-full h-full object-cover" />
          ) : (
            <User size={size === 'large' ? 28 : 20} className="text-slate-400" />
          )}
        </div>
        <div className="flex-grow min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-widest text-sand-500 mb-0.5">{label}</p>
          <h3 className={`font-serif text-brand-900 leading-tight ${size === 'large' ? 'text-xl' : size === 'medium' ? 'text-base' : 'text-sm'}`}>
            {member.name}
          </h3>
          {member.country && (
            <p className="text-[9px] text-slate-400 mt-0.5 uppercase tracking-wider">{member.country}</p>
          )}
        </div>
      </div>

      {showExpandable && (member.summary || member.bio) && (
        <div className="px-5 pb-4 border-t border-slate-100 pt-4 flex-grow">
          <ExpandableText
            summary={member.summary || member.bio || ''}
            full={member.full || (member.bio !== member.summary ? member.bio : undefined)}
            detailHref={`/membro/${member.id}`}
            detailLabel="Ver perfil"
            previewLines={3}
            textClassName="text-sm text-slate-500 font-light leading-relaxed"
          />
        </div>
      )}

      {!showExpandable && (
        <Link
          to={`/membro/${member.id}`}
          className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-brand-900 hover:bg-slate-50 transition-colors group mt-auto"
        >
          Ver perfil
          <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </Link>
      )}
    </div>
  );
};
