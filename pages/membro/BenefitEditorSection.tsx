import React, { useEffect, useState } from 'react';
import { Trash2, Plus, Loader2, ExternalLink, Check } from 'lucide-react';
import { safeUrl } from '../../utils/url';
import {
  fetchBenefitsByPartner,
  createBenefit,
  updateBenefit,
  deleteBenefit,
} from '../../services/benefits.service';
import type { Benefit, BenefitCategory } from '../../types';

const CATEGORY_CONFIG: Record<BenefitCategory, { label: string; color: string }> = {
  desconto: { label: 'Desconto',  color: 'bg-emerald-100 text-emerald-700' },
  acesso:   { label: 'Acesso',    color: 'bg-blue-100 text-blue-700' },
  serviço:  { label: 'Serviço',   color: 'bg-purple-100 text-purple-700' },
  outro:    { label: 'Outro',     color: 'bg-slate-100 text-slate-500' },
};

const EMPTY_FORM = {
  title: '',
  description: '',
  category: 'outro' as BenefitCategory,
  link: '',
  active: true,
  order: 0,
};

interface EditState {
  title: string;
  description: string;
  category: BenefitCategory;
  link: string;
  active: boolean;
}

export const BenefitEditorSection = ({ partnerId }: { partnerId: string }) => {
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ title: '', description: '', category: 'outro', link: '', active: true });
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchBenefitsByPartner(partnerId).then(data => {
      setBenefits(data);
      setLoading(false);
    });
  }, [partnerId]);

  const startEdit = (b: Benefit) => {
    setEditingId(b.id);
    setEditState({ title: b.title, description: b.description || '', category: b.category, link: b.link || '', active: b.active });
  };

  const handleSaveEdit = async (id: string) => {
    setSaving(id);
    const ok = await updateBenefit(id, editState);
    if (ok) setBenefits(prev => prev.map(b => b.id === id ? { ...b, ...editState } : b));
    setSaving(null);
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    setSaving(id + ':del');
    const ok = await deleteBenefit(id);
    if (ok) setBenefits(prev => prev.filter(b => b.id !== id));
    setSaving(null);
  };

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setCreating(true);
    const created = await createBenefit({ ...form, partner_id: partnerId });
    if (created) {
      setBenefits(prev => [...prev, created]);
      setForm(EMPTY_FORM);
    }
    setCreating(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Existing benefits */}
      {benefits.length === 0 && editingId === null && (
        <p className="text-center text-slate-400 text-sm py-6">Nenhum benefício. Crie um abaixo.</p>
      )}

      {benefits.map(b => {
        const cfg = CATEGORY_CONFIG[b.category] ?? CATEGORY_CONFIG.outro;
        const isEditing = editingId === b.id;
        const isSaving = saving === b.id;
        const isDeleting = saving === b.id + ':del';

        return (
          <div key={b.id} className={`border rounded-xl p-4 transition-colors ${isEditing ? 'border-brand-700 bg-white' : 'border-slate-100 bg-slate-50/50'}`}>
            {isEditing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">Título</label>
                    <input
                      type="text"
                      value={editState.title}
                      onChange={e => setEditState(s => ({ ...s, title: e.target.value }))}
                      className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-brand-700"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">Categoria</label>
                    <select
                      value={editState.category}
                      onChange={e => setEditState(s => ({ ...s, category: e.target.value as BenefitCategory }))}
                      className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-brand-700"
                    >
                      {(Object.keys(CATEGORY_CONFIG) as BenefitCategory[]).map(cat => (
                        <option key={cat} value={cat}>{CATEGORY_CONFIG[cat].label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">Descrição</label>
                  <textarea
                    rows={2}
                    value={editState.description}
                    onChange={e => setEditState(s => ({ ...s, description: e.target.value }))}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-brand-700 resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">Link (opcional)</label>
                    <input
                      type="url"
                      value={editState.link}
                      onChange={e => setEditState(s => ({ ...s, link: e.target.value }))}
                      placeholder="https://..."
                      className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-brand-700"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <button
                        type="button"
                        onClick={() => setEditState(s => ({ ...s, active: !s.active }))}
                        className={`relative w-10 h-5 rounded-full transition-colors ${editState.active ? 'bg-green-500' : 'bg-slate-300'}`}
                      >
                        <span className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${editState.active ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                      <span className="text-xs font-medium text-slate-700">{editState.active ? 'Ativo' : 'Inativo'}</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleSaveEdit(b.id)}
                    disabled={!!isSaving}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-brand-900 text-white hover:bg-brand-800 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    Guardar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    {!b.active && (
                      <span className="text-[10px] text-slate-400 font-medium">inativo</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-slate-800 truncate">{b.title}</p>
                  {b.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{b.description}</p>}
                  {b.link && (
                    <a href={safeUrl(b.link)} target="_blank" rel="noreferrer" className="text-[11px] text-brand-700 hover:underline flex items-center gap-1 mt-0.5">
                      <ExternalLink size={10} /> {b.link.replace(/^https?:\/\//, '').split('/')[0]}
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => startEdit(b)}
                    className="px-2 py-1 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(b.id)}
                    disabled={!!isDeleting}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                    title="Remover"
                  >
                    {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Create form */}
      <div className="border-2 border-dashed border-slate-200 rounded-xl p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Novo Benefício</p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 block">Título *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-brand-700"
                placeholder="Ex: 10% de desconto"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 block">Categoria</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value as BenefitCategory }))}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-brand-700"
              >
                {(Object.keys(CATEGORY_CONFIG) as BenefitCategory[]).map(cat => (
                  <option key={cat} value={cat}>{CATEGORY_CONFIG[cat].label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 block">Descrição</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-brand-700"
              placeholder="Breve descrição..."
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 block">Link (opcional)</label>
            <input
              type="url"
              value={form.link}
              onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-brand-700"
              placeholder="https://..."
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={!form.title.trim() || creating}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-900 text-white text-sm font-medium hover:bg-brand-800 transition-colors disabled:opacity-40"
          >
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Criar Benefício
          </button>
        </div>
      </div>
    </div>
  );
};
