// pages/dashboard/ArticlesManagerSection.tsx
// Gestão da Área Editorial: lista de artigos com busca, filtros e ações.
// A edição acontece no <ArticleEditor /> (modal com prévia ao lado).
import React, { useEffect, useMemo, useState } from 'react';
import {
  Newspaper, Plus, Search, X, Pencil, Trash2, Archive, Send, EyeOff, Loader2, Clock,
} from 'lucide-react';
import { ConfirmDialog } from '../../components/ui';
import {
  ARTICLES, ARTICLE_CATEGORIES, ARTICLE_AUTHORS, FLB_STATE_EVENT,
} from '../../store/app.store';
import {
  publishArticle, unpublishArticle, archiveArticle, deleteArticle,
} from '../../services/articles.service';
import { ArticleEditor, STATUS_META } from './ArticleEditor';
import { articlePublishBlockers } from '../../types/articles';
import type { ArticleStatus, ArticleWithRelations } from '../../types/articles';

const STATUS_ORDER: ArticleStatus[] = ['rascunho', 'em_revisao', 'agendado', 'publicado', 'arquivado'];

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-brand-900 focus:ring-2 focus:ring-brand-900/10 transition-all';

const formatDate = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const ArticleRow: React.FC<{
  article: ArticleWithRelations;
  onEdit: (a: ArticleWithRelations) => void;
  onAskDelete: (a: ArticleWithRelations) => void;
}> = ({ article, onEdit, onAskDelete }) => {
  const [busy, setBusy] = useState(false);

  const category = article.category
    ?? ARTICLE_CATEGORIES.find(c => c.id === article.category_id)
    ?? null;
  const author = article.author
    ?? ARTICLE_AUTHORS.find(a => a.id === article.author_id)
    ?? null;

  const meta = STATUS_META[article.status] ?? STATUS_META.rascunho;
  const blockers = articlePublishBlockers(article);
  const isLive = article.status === 'publicado' || article.status === 'agendado';

  const run = async (fn: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    await fn();
    setBusy(false);
  };

  return (
    <div className="px-4 py-3 flex items-center gap-3">
      {/* Capa em miniatura */}
      <div className="w-14 h-14 shrink-0 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center">
        {article.cover_url
          ? <img src={article.cover_url} alt="" className="w-full h-full object-cover" />
          : <Newspaper size={16} className="text-slate-300" />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 truncate">{article.title || 'Sem título'}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${meta.cls}`}>
            {meta.label}
          </span>
          {category && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-sand-600">{category.name}</span>
          )}
          {author && (
            <span className="text-[10px] text-slate-400 truncate">{author.name}</span>
          )}
          <span className="text-[10px] text-slate-400 inline-flex items-center gap-1">
            <Clock size={9} /> {formatDate(article.published_at)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        {busy && <Loader2 size={14} className="animate-spin text-slate-300 mr-1" />}

        <button
          onClick={() => onEdit(article)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-900 hover:bg-slate-100 transition-colors"
          title="Editar"
        ><Pencil size={14} /></button>

        {isLive ? (
          <button
            onClick={() => run(() => unpublishArticle(article.id))}
            disabled={busy}
            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-40"
            title="Despublicar (volta a rascunho)"
          ><EyeOff size={14} /></button>
        ) : (
          <button
            onClick={() => run(() => publishArticle(article.id))}
            disabled={busy || blockers.length > 0}
            className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-30"
            title={blockers.length > 0 ? `Falta preencher: ${blockers.join(', ')}` : 'Publicar'}
          ><Send size={14} /></button>
        )}

        {article.status !== 'arquivado' && (
          <button
            onClick={() => run(() => archiveArticle(article.id))}
            disabled={busy}
            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-900 hover:bg-slate-100 transition-colors disabled:opacity-40"
            title="Arquivar"
          ><Archive size={14} /></button>
        )}

        <button
          onClick={() => onAskDelete(article)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          title="Remover"
        ><Trash2 size={14} /></button>
      </div>
    </div>
  );
};

export const ArticlesManagerSection = () => {
  // O store muta os arrays no lugar; o tick força o recálculo da lista.
  const [tick, setTick] = useState(0);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | ArticleStatus>('todos');
  const [categoryFilter, setCategoryFilter] = useState<'todas' | string>('todas');

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ArticleWithRelations | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ArticleWithRelations | null>(null);

  useEffect(() => {
    const handler = () => setTick(v => v + 1);
    window.addEventListener(FLB_STATE_EVENT, handler);
    return () => window.removeEventListener(FLB_STATE_EVENT, handler);
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (ARTICLES as ArticleWithRelations[])
      .filter(a => (needle ? (a.title || '').toLowerCase().includes(needle) : true))
      .filter(a => (statusFilter === 'todos' ? true : a.status === statusFilter))
      .filter(a => (categoryFilter === 'todas' ? true : a.category_id === categoryFilter))
      .sort((a, b) => {
        const da = a.published_at || a.updated_at || a.created_at || '';
        const db = b.published_at || b.updated_at || b.created_at || '';
        return db.localeCompare(da);
      });
  }, [query, statusFilter, categoryFilter, tick]);

  const openNew = () => { setEditing(null); setEditorOpen(true); };
  const openEdit = (a: ArticleWithRelations) => { setEditing(a); setEditorOpen(true); };
  const closeEditor = () => { setEditorOpen(false); setEditing(null); };

  const confirmDelete = async () => {
    const target = pendingDelete;
    setPendingDelete(null);
    if (target) await deleteArticle(target.id);
  };

  return (
    <div className="mt-6 animate-fadeInUpSlow delay-300">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-50 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white/50 backdrop-blur-sm">
          <h3 className="font-medium text-brand-900 flex items-center gap-2">
            <Newspaper size={16} /> Área Editorial
            <span className="ml-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {ARTICLES.length} {ARTICLES.length === 1 ? 'artigo' : 'artigos'}
            </span>
          </h3>
          <button
            onClick={openNew}
            className="shrink-0 bg-brand-900 hover:bg-brand-800 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95"
          ><Plus size={14} /> Novo artigo</button>
        </div>

        {/* Busca e filtros */}
        <div className="px-5 pt-5 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar por título..."
              className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-brand-900 focus:ring-2 focus:ring-brand-900/10 transition-all placeholder:text-slate-400"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-900 transition-colors"
                title="Limpar busca"
              ><X size={14} /></button>
            )}
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as 'todos' | ArticleStatus)}
            className={inputCls}
            aria-label="Filtrar por estado"
          >
            <option value="todos">Todos os estados</option>
            {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </select>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className={inputCls}
            aria-label="Filtrar por categoria"
          >
            <option value="todas">Todas as categorias</option>
            {ARTICLE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Lista */}
        <div className="p-5">
          <div className="rounded-xl border border-slate-100 overflow-hidden divide-y divide-slate-100">
            {ARTICLES.length === 0 && (
              <p className="px-4 py-8 text-center text-slate-400 text-xs">
                Nenhum artigo ainda. Comece com “Novo artigo”.
              </p>
            )}
            {ARTICLES.length > 0 && filtered.length === 0 && (
              <p className="px-4 py-8 text-center text-slate-400 text-xs">
                Nenhum artigo corresponde à busca ou aos filtros.
              </p>
            )}
            {filtered.map(a => (
              <ArticleRow key={a.id} article={a} onEdit={openEdit} onAskDelete={setPendingDelete} />
            ))}
          </div>
        </div>
      </div>

      {/* O editor é recriado a cada abertura (key) para não reaproveitar estado
          de um artigo anterior. */}
      {editorOpen && (
        <ArticleEditor
          key={editing?.id || 'novo'}
          isOpen={editorOpen}
          article={editing}
          onClose={closeEditor}
        />
      )}

      <ConfirmDialog
        isOpen={!!pendingDelete}
        title="Remover artigo"
        description={`“${pendingDelete?.title || 'Sem título'}” será removido definitivamente, com o corpo, as ligações e o histórico de versões. Esta ação não pode ser desfeita.`}
        confirmLabel="Remover definitivamente"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
};
