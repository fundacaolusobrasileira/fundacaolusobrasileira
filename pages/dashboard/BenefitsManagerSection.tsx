// pages/dashboard/BenefitsManagerSection.tsx
import React, { useState } from 'react';
import { Gift, ChevronDown } from 'lucide-react';
import { PARTNERS } from '../../store/app.store';
import { BenefitEditorSection } from '../membro/BenefitEditorSection';
import { isUuid } from '../../utils/uuid';

export const BenefitsManagerSection = () => {
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');

  const partners = PARTNERS
    .filter(p => p.category !== 'Governança' && isUuid(p.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  const selectedPartner = partners.find(p => p.id === selectedPartnerId);

  return (
    <div className="mt-6 animate-fadeInUpSlow delay-300">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-50 flex items-center justify-between bg-white/50 backdrop-blur-sm">
          <h3 className="font-medium text-brand-900 flex items-center gap-2">
            <Gift size={16} /> Benefícios de Parceiros
            <span className="ml-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gestão</span>
          </h3>
        </div>

        <div className="p-5">
          {/* Partner selector */}
          <div className="mb-6">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">
              Selecionar Parceiro
            </label>
            <div className="relative max-w-sm">
              <select
                value={selectedPartnerId}
                onChange={e => setSelectedPartnerId(e.target.value)}
                className="w-full appearance-none px-4 py-2.5 pr-10 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-brand-900 focus:ring-2 focus:ring-brand-900/10 transition-all cursor-pointer"
              >
                <option value="">— Escolher parceiro —</option>
                {partners.map(p => (
                  <option key={p.id} value={p.id}>{p.name} · {p.category}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Benefits editor or empty state */}
          {selectedPartner ? (
            <div>
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
                {selectedPartner.image && (
                  <img src={selectedPartner.image} alt="" className="w-10 h-10 object-contain rounded-lg bg-slate-50 p-1 border border-slate-100" />
                )}
                <div>
                  <p className="text-sm font-semibold text-brand-900">{selectedPartner.name}</p>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400">{selectedPartner.category}</p>
                </div>
              </div>
              <BenefitEditorSection partnerId={selectedPartner.id} />
            </div>
          ) : (
            <div className="py-10 text-center text-slate-400 text-sm">
              Selecione um parceiro para gerir os seus benefícios.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
