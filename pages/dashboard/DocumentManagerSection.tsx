// pages/dashboard/DocumentManagerSection.tsx
// CRUD dos documentos institucionais (página /documentacao).
// Permite adicionar/editar/excluir e enviar PDF (Storage) ou colar URL.
import React, { useEffect, useRef, useState } from 'react';
import { FileText, Plus, Trash2, Check, X, Pencil, Upload, Lock, Loader2, EyeOff } from 'lucide-react';
import { DOCUMENTS, FLB_STATE_EVENT } from '../../store/app.store';
import { createDocument, updateDocument, deleteDocument, uploadDocumentFile } from '../../services/documents.service';
import type { InstitutionalDocument, DocumentCategory } from '../../types';

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  'estatutos': 'Estatutos',
  'relatorios-anuais': 'Relatórios Anuais',
  'regulamento-interno': 'Regulamento Interno',
  'orgaos-sociais': 'Órgãos Sociais',
};
const CATEGORY_ORDER: DocumentCategory[] = [
  'estatutos', 'relatorios-anuais', 'regulamento-interno', 'orgaos-sociais',
];

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-brand-900 focus:ring-2 focus:ring-brand-900/10 transition-all';

type FileInputProps = { fileUrl: string; onUrl: (url: string) => void };

const FilePicker: React.FC<FileInputProps> = ({ fileUrl, onUrl }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setUploading(true);
    const url = await uploadDocumentFile(f);
    setUploading(false);
    if (url) onUrl(url);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={fileUrl}
          onChange={e => onUrl(e.target.value)}
          placeholder="Cole o link do PDF ou envie um arquivo →"
          className={inputCls}
        />
        <input ref={fileRef} type="file" accept="application/pdf" onChange={handleFile} className="hidden" />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="shrink-0 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? 'A enviar...' : 'Enviar PDF'}
        </button>
      </div>
      {fileUrl && (
        <p className="text-[11px] text-slate-400 truncate">Arquivo: <span className="text-slate-600">{fileUrl}</span></p>
      )}
    </div>
  );
};

const AddDocumentForm = () => {
  const [category, setCategory] = useState<DocumentCategory>('relatorios-anuais');
  const [title, setTitle] = useState('');
  const [year, setYear] = useState('');
  const [description, setDescription] = useState('');
  const [gated, setGated] = useState(true);
  const [fileUrl, setFileUrl] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => { setTitle(''); setYear(''); setDescription(''); setFileUrl(''); setGated(true); };

  const handleAdd = async () => {
    if (busy || title.trim().length < 2 || !fileUrl.trim()) return;
    setBusy(true);
    const created = await createDocument({
      category,
      title: title.trim(),
      description: description.trim() || null,
      year: year.trim() ? Number(year.trim()) : null,
      gated,
      file_url: fileUrl.trim(),
    });
    setBusy(false);
    if (created) reset();
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 mb-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Adicionar documento</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
        <select value={category} onChange={e => setCategory(e.target.value as DocumentCategory)} className={inputCls}>
          {CATEGORY_ORDER.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </select>
        <input value={year} onChange={e => setYear(e.target.value)} placeholder="Ano (opcional, ex.: 2024)" inputMode="numeric" className={inputCls} />
      </div>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título do documento" className={`${inputCls} mb-2`} />
      <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição (opcional)" className={`${inputCls} mb-2`} />
      <div className="mb-3"><FilePicker fileUrl={fileUrl} onUrl={setFileUrl} /></div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
          <input type="checkbox" checked={gated} onChange={e => setGated(e.target.checked)} className="rounded border-slate-300" />
          <Lock size={12} /> Exigir nome + email para baixar
        </label>
        <button
          onClick={handleAdd}
          disabled={busy || title.trim().length < 2 || !fileUrl.trim()}
          className="bg-brand-900 hover:bg-brand-800 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 disabled:opacity-40"
        ><Plus size={14} /> Adicionar</button>
      </div>
    </div>
  );
};

const DocumentRow: React.FC<{ doc: InstitutionalDocument }> = ({ doc }) => {
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState(doc.title);
  const [year, setYear] = useState(doc.year ? String(doc.year) : '');
  const [description, setDescription] = useState(doc.description || '');
  const [gated, setGated] = useState(doc.gated);
  const [fileUrl, setFileUrl] = useState(doc.file_url);

  const startEdit = () => {
    setTitle(doc.title);
    setYear(doc.year ? String(doc.year) : '');
    setDescription(doc.description || '');
    setGated(doc.gated);
    setFileUrl(doc.file_url);
    setConfirmDel(false);
    setEditing(true);
  };

  const saveEdit = async () => {
    if (busy || title.trim().length < 2 || !fileUrl.trim()) return;
    setBusy(true);
    const ok = await updateDocument(doc.id, {
      title: title.trim(),
      description: description.trim() || null,
      year: year.trim() ? Number(year.trim()) : null,
      gated,
      file_url: fileUrl.trim(),
    });
    setBusy(false);
    if (ok) setEditing(false);
  };

  const toggleActive = async () => {
    if (busy) return;
    setBusy(true);
    await updateDocument(doc.id, { active: !doc.active });
    setBusy(false);
  };

  const handleDelete = async () => {
    if (busy) return;
    setBusy(true);
    await deleteDocument(doc.id);
    setBusy(false);
  };

  if (editing) {
    return (
      <div className="px-4 py-3 bg-amber-50/40 space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título" className={`${inputCls} sm:col-span-2`} />
          <input value={year} onChange={e => setYear(e.target.value)} placeholder="Ano" inputMode="numeric" className={inputCls} />
        </div>
        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição (opcional)" className={inputCls} />
        <FilePicker fileUrl={fileUrl} onUrl={setFileUrl} />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
            <input type="checkbox" checked={gated} onChange={e => setGated(e.target.checked)} className="rounded border-slate-300" />
            <Lock size={12} /> Exigir nome + email
          </label>
          <div className="flex items-center gap-1.5">
            <button onClick={saveEdit} disabled={busy} className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors disabled:opacity-40" title="Guardar"><Check size={15} /></button>
            <button onClick={() => setEditing(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors" title="Cancelar"><X size={15} /></button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-2.5 flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${doc.active ? 'text-slate-700' : 'text-slate-400 line-through'}`}>
          {doc.title}{doc.year ? ` (${doc.year})` : ''}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {doc.gated && (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-sand-700"><Lock size={9} /> Identificação</span>
          )}
          {!doc.active && <span className="text-[9px] font-bold uppercase tracking-widest text-red-400">Inativo</span>}
        </div>
      </div>
      {confirmDel ? (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-red-500">Excluir?</span>
          <button onClick={handleDelete} disabled={busy} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40" title="Confirmar"><Check size={15} /></button>
          <button onClick={() => setConfirmDel(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors" title="Cancelar"><X size={15} /></button>
        </div>
      ) : (
        <div className="flex items-center gap-0.5">
          <button onClick={toggleActive} disabled={busy} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-900 hover:bg-slate-100 transition-colors" title={doc.active ? 'Ocultar' : 'Mostrar'}><EyeOff size={14} /></button>
          <button onClick={startEdit} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-900 hover:bg-slate-100 transition-colors" title="Editar"><Pencil size={14} /></button>
          <button onClick={() => setConfirmDel(true)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Excluir"><Trash2 size={14} /></button>
        </div>
      )}
    </div>
  );
};

export const DocumentManagerSection = () => {
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
            <FileText size={16} /> Documentação Institucional
            <span className="ml-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Download com nome + email</span>
          </h3>
        </div>

        <div className="p-5">
          <AddDocumentForm />

          <div className="space-y-4">
            {CATEGORY_ORDER.map(cat => {
              const docs = DOCUMENTS
                .filter(d => d.category === cat)
                .sort((a, b) => (a.order - b.order) || a.title.localeCompare(b.title));
              return (
                <div key={cat} className="rounded-xl border border-slate-100 overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50/60 border-b border-slate-100">
                    <p className="text-xs font-bold text-brand-900">{CATEGORY_LABELS[cat]}</p>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {docs.length === 0
                      ? <p className="px-4 py-4 text-center text-slate-400 text-xs">Nenhum documento nesta categoria.</p>
                      : docs.map(d => <DocumentRow key={d.id} doc={d} />)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
