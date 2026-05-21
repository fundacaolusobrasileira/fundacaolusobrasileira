// pages/dashboard/CouncilManagerSection.tsx
// Gestão (CRUD) dos nomes do Conselho de Curadores e do Conselho Fiscal.
// Apenas nomes — não perfis. Dados na tabela isolada `council_members`.
import React, { useEffect, useState } from 'react';
import { Landmark, Plus, Trash2, Check, X, Pencil } from 'lucide-react';
import { COUNCILS, FLB_STATE_EVENT } from '../../store/app.store';
import { createCouncilMember, updateCouncilMember, deleteCouncilMember } from '../../services/councils.service';
import type { CouncilMember, CouncilType } from '../../types';

const COUNCIL_LABELS: Record<CouncilType, { title: string; hint: string }> = {
  administracao: { title: 'Conselho de Administração', hint: 'Órgão de administração da Fundação' },
  executivo: { title: 'Conselho Executivo', hint: 'Órgão executivo da Fundação' },
  fiscal: { title: 'Conselho Fiscal', hint: 'Órgão de fiscalização da Fundação' },
  curadores: { title: 'Conselho de Curadores', hint: 'Órgão consultivo e de orientação estratégica' },
};

const COUNCIL_ORDER: CouncilType[] = ['administracao', 'executivo', 'fiscal', 'curadores'];

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-brand-900 focus:ring-2 focus:ring-brand-900/10 transition-all';

const CouncilGroup: React.FC<{ council: CouncilType }> = ({ council }) => {
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [busy, setBusy] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');

  const [confirmId, setConfirmId] = useState<string | null>(null);

  const label = COUNCIL_LABELS[council];
  const members = COUNCILS
    .filter(m => m.council === council)
    .sort((a, b) => (a.order - b.order) || a.name.localeCompare(b.name));

  const handleAdd = async () => {
    if (newName.trim().length < 2 || busy) return;
    setBusy(true);
    const created = await createCouncilMember({ council, name: newName.trim(), role: newRole.trim() || null });
    setBusy(false);
    if (created) { setNewName(''); setNewRole(''); }
  };

  const startEdit = (m: CouncilMember) => {
    setConfirmId(null);
    setEditingId(m.id);
    setEditName(m.name);
    setEditRole(m.role || '');
  };
  const cancelEdit = () => { setEditingId(null); setEditName(''); setEditRole(''); };
  const saveEdit = async (id: string) => {
    if (editName.trim().length < 2 || busy) return;
    setBusy(true);
    const ok = await updateCouncilMember(id, { name: editName.trim(), role: editRole.trim() || null });
    setBusy(false);
    if (ok) cancelEdit();
  };

  const handleDelete = async (id: string) => {
    if (busy) return;
    setBusy(true);
    await deleteCouncilMember(id);
    setBusy(false);
    setConfirmId(null);
  };

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/40 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-white/60">
        <p className="text-sm font-semibold text-brand-900">{label.title}</p>
        <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-0.5">
          {label.hint} · {members.length} {members.length === 1 ? 'nome' : 'nomes'}
        </p>
      </div>

      {/* Lista */}
      <div className="divide-y divide-slate-100">
        {members.length === 0 && (
          <p className="px-4 py-6 text-center text-slate-400 text-xs">Nenhum nome ainda. Adicione abaixo.</p>
        )}
        {members.map(m => (
          <div key={m.id} className="px-4 py-2.5 flex items-center gap-2">
            {editingId === m.id ? (
              <>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="Nome"
                    className={inputCls}
                  />
                  <input
                    value={editRole}
                    onChange={e => setEditRole(e.target.value)}
                    placeholder="Cargo (opcional, ex.: Presidente)"
                    className={inputCls}
                  />
                </div>
                <button
                  onClick={() => saveEdit(m.id)}
                  disabled={busy}
                  className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors disabled:opacity-40"
                  title="Guardar"
                ><Check size={15} /></button>
                <button
                  onClick={cancelEdit}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                  title="Cancelar"
                ><X size={15} /></button>
              </>
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 truncate">{m.name}</p>
                  {m.role && (
                    <p className="text-[10px] font-bold uppercase tracking-widest text-sand-600 mt-0.5">{m.role}</p>
                  )}
                </div>
                {confirmId === m.id ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-red-500">Excluir?</span>
                    <button
                      onClick={() => handleDelete(m.id)}
                      disabled={busy}
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                      title="Confirmar exclusão"
                    ><Check size={15} /></button>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                      title="Cancelar"
                    ><X size={15} /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => startEdit(m)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-brand-900 hover:bg-slate-100 transition-colors"
                      title="Editar"
                    ><Pencil size={14} /></button>
                    <button
                      onClick={() => setConfirmId(m.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Excluir"
                    ><Trash2 size={14} /></button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Adicionar */}
      <div className="px-4 py-3 border-t border-slate-100 bg-white/40 flex flex-col sm:flex-row gap-2">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          placeholder="Nome a adicionar"
          className={inputCls}
        />
        <input
          value={newRole}
          onChange={e => setNewRole(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          placeholder="Cargo (opcional)"
          className={`${inputCls} sm:max-w-[200px]`}
        />
        <button
          onClick={handleAdd}
          disabled={busy || newName.trim().length < 2}
          className="shrink-0 bg-brand-900 hover:bg-brand-800 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40"
        ><Plus size={14} /> Adicionar</button>
      </div>
    </div>
  );
};

export const CouncilManagerSection = () => {
  const [, setTick] = useState(0);
  useEffect(() => {
    const handler = () => setTick(v => v + 1);
    window.addEventListener(FLB_STATE_EVENT, handler);
    return () => window.removeEventListener(FLB_STATE_EVENT, handler);
  }, []);

  return (
    <div className="mt-6 animate-fadeInUpSlow delay-300">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-50 flex items-center justify-between bg-white/50 backdrop-blur-sm">
          <h3 className="font-medium text-brand-900 flex items-center gap-2">
            <Landmark size={16} /> Conselhos da Fundação
            <span className="ml-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nome &amp; função</span>
          </h3>
        </div>
        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
          {COUNCIL_ORDER.map(council => (
            <CouncilGroup key={council} council={council} />
          ))}
        </div>
      </div>
    </div>
  );
};
