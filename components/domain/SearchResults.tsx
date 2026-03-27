// components/domain/SearchResults.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { X, Search as SearchIcon } from 'lucide-react';
import type { Partner, Event, Space, MemberSeed } from '../../types';

export const SearchResults = ({
  query,
  results,
  onClose
}: {
  query: string;
  results: { partners: Partner[], events: Event[], spaces: Space[], members: MemberSeed[] };
  onClose: () => void;
}) => {
  if (!query) return null;
  const hasResults = results.partners.length > 0 || results.events.length > 0 || results.spaces.length > 0 || results.members.length > 0;

  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden max-w-3xl mx-auto w-full">
      <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Resultados para "{query}"</span>
        <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full"><X size={16} className="text-slate-500" /></button>
      </div>
      <div className="max-h-[60vh] overflow-y-auto p-2">
        {!hasResults && (
          <div className="p-8 text-center text-slate-400">
            <SearchIcon size={24} className="mx-auto mb-2 opacity-20" />
            <p>Nenhum resultado encontrado.</p>
          </div>
        )}
        {results.members.length > 0 && (
          <div className="mb-4">
            <h4 className="px-4 py-2 text-xs font-bold text-brand-900 uppercase">Pessoas</h4>
            {results.members.map(m => (
              <Link to={`/membro/${m.id}`} key={m.id} onClick={onClose} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors group">
                <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden shrink-0 flex items-center justify-center text-slate-500 text-sm font-bold">
                  {m.image ? <img src={m.image} className="w-full h-full object-cover" alt="" /> : m.name.charAt(0)}
                </div>
                <div>
                  <div className="font-medium text-slate-900 group-hover:text-brand-900">{m.name}</div>
                  <div className="text-xs text-slate-500">{m.role}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
        {results.events.length > 0 && (
          <div className="mb-4">
            <h4 className="px-4 py-2 text-xs font-bold text-brand-900 uppercase">Eventos</h4>
            {results.events.map(e => (
              <Link to={`/eventos/${e.id}`} key={e.id} onClick={onClose} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors group">
                <div className="w-12 h-12 rounded-lg bg-slate-200 overflow-hidden shrink-0"><img src={e.image} className="w-full h-full object-cover grayscale group-hover:grayscale-0" alt="" /></div>
                <div>
                  <div className="font-medium text-slate-900 group-hover:text-brand-900">{e.title}</div>
                  <div className="text-xs text-slate-500">{e.date} &bull; {e.category}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
        {results.partners.length > 0 && (
          <div className="mb-4">
            <h4 className="px-4 py-2 text-xs font-bold text-brand-900 uppercase">Parceiros</h4>
            {results.partners.map(p => (
              <Link to={`/membro/${p.id}`} key={p.id} onClick={onClose} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors group">
                <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden shrink-0"><img src={p.image} className="w-full h-full object-cover grayscale group-hover:grayscale-0" alt="" /></div>
                <div>
                  <div className="font-medium text-slate-900 group-hover:text-brand-900">{p.name}</div>
                  <div className="text-xs text-slate-500">{p.role || p.category}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
