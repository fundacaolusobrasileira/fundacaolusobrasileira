// pages/dashboard/ArticleEditor.tsx
// Editor de artigos da Área Editorial. Modal (focus trap + Escape) com duas
// colunas: formulário à esquerda, prévia à direita.
//
// Decisões:
// - A prévia reutiliza <ArticleBlocks /> da página pública. Não existe aqui um
//   segundo renderizador: se houvesse, a prévia e o site divergiriam com o tempo.
// - Autosave só em rascunho, com debounce de 3s, e o temporizador é limpo no
//   unmount — sem isso o editor gravaria depois de fechado.
// - GUARDAR e PUBLICAR são botões diferentes. Publicar exige o checklist de
//   articlePublishBlockers() vazio.
// - Data futura = agendamento. A policy de leitura pública exige
//   published_at <= now(), por isso o artigo aparece sozinho na hora marcada.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus, Trash2, ChevronUp, ChevronDown, Upload, Loader2, Check, X, Save,
  Send, Clock, AlertTriangle, Link2, Image as ImageIcon, Type, Quote,
  List as ListIcon, Video, Minus, Heading2, Eye,
} from 'lucide-react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../components/ui';
import { ARTICLE_CATEGORIES, ARTICLE_AUTHORS, PARTNERS, EVENTS, generateId, showToast } from '../../store/app.store';
import {
  createArticle, updateArticle, autosaveArticle, publishArticle, uploadArticleImage, setArticleEntities,
} from '../../services/articles.service';
import { ArticleBlocks } from '../artigos/ArticleBlocks';
import {
  slugifyArticle, estimateReadingMinutes, articlePublishBlockers,
} from '../../types/articles';
import type {
  Article, ArticleBlock, ArticleBlockType, ArticleStatus, ArticleWithRelations,
} from '../../types/articles';

// Rótulos e cores dos estados. Exportado porque a lista também os usa.
export const STATUS_META: Record<ArticleStatus, { label: string; cls: string }> = {
  rascunho:   { label: 'Rascunho',   cls: 'bg-slate-100 text-slate-600' },
  em_revisao: { label: 'Em revisão', cls: 'bg-amber-100 text-amber-700' },
  agendado:   { label: 'Agendado',   cls: 'bg-sky-100 text-sky-700' },
  publicado:  { label: 'Publicado',  cls: 'bg-green-100 text-green-700' },
  arquivado:  { label: 'Arquivado',  cls: 'bg-slate-100 text-slate-400 line-through' },
};

const BLOCK_META: Record<ArticleBlockType, { label: string; icon: React.ReactNode }> = {
  paragraph: { label: 'Parágrafo', icon: <Type size={13} /> },
  heading:   { label: 'Subtítulo', icon: <Heading2 size={13} /> },
  image:     { label: 'Imagem',    icon: <ImageIcon size={13} /> },
  quote:     { label: 'Citação',   icon: <Quote size={13} /> },
  list:      { label: 'Lista',     icon: <ListIcon size={13} /> },
  video:     { label: 'Vídeo',     icon: <Video size={13} /> },
  divider:   { label: 'Separador', icon: <Minus size={13} /> },
};
const BLOCK_ORDER: ArticleBlockType[] = ['paragraph', 'heading', 'image', 'quote', 'list', 'video', 'divider'];

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-brand-900 focus:ring-2 focus:ring-brand-900/10 transition-all';
const labelCls = 'text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1';

const newBlock = (type: ArticleBlockType): ArticleBlock => {
  const id = generateId('blk');
  switch (type) {
    case 'heading': return { id, type: 'heading', level: 2, text: '' };
    case 'image':   return { id, type: 'image', url: '', caption: '', alt: '' };
    case 'quote':   return { id, type: 'quote', text: '', cite: '' };
    case 'list':    return { id, type: 'list', ordered: false, items: [''] };
    case 'video':   return { id, type: 'video', url: '', caption: '' };
    case 'divider': return { id, type: 'divider' };
    default:        return { id, type: 'paragraph', text: '' };
  }
};

/** ISO → valor de <input type="datetime-local"> na hora local do utilizador. */
const toLocalInput = (iso?: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

// ---------------------------------------------------------------- uploader
const ImageField: React.FC<{ url: string; onUrl: (u: string) => void; placeholder?: string }> = ({
  url, onUrl, placeholder = 'Cole o link da imagem ou envie um ficheiro →',
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const aliveRef = useRef(true);
  useEffect(() => () => { aliveRef.current = false; }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setUploading(true);
    const uploaded = await uploadArticleImage(f);
    if (!aliveRef.current) return;
    setUploading(false);
    if (uploaded) onUrl(uploaded);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <input value={url} onChange={e => onUrl(e.target.value)} placeholder={placeholder} className={inputCls} />
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="shrink-0 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
      >
        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
        {uploading ? 'A enviar...' : 'Enviar'}
      </button>
    </div>
  );
};

// ---------------------------------------------------------------- bloco
type BlockRowProps = {
  block: ArticleBlock;
  index: number;
  total: number;
  onChange: (patch: Record<string, unknown>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
};

const BlockRow: React.FC<BlockRowProps> = ({ block, index, total, onChange, onMove, onRemove }) => (
  <div className="rounded-xl border border-slate-100 bg-slate-50/40 overflow-hidden">
    <div className="px-3 py-2 flex items-center gap-2 border-b border-slate-100 bg-white/60">
      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
        {BLOCK_META[block.type].icon} {BLOCK_META[block.type].label}
      </span>
      <span className="text-[10px] text-slate-300">#{index + 1}</span>
      <div className="ml-auto flex items-center gap-0.5">
        <button
          type="button" onClick={() => onMove(-1)} disabled={index === 0}
          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-900 hover:bg-slate-100 transition-colors disabled:opacity-30"
          title="Subir"
        ><ChevronUp size={14} /></button>
        <button
          type="button" onClick={() => onMove(1)} disabled={index === total - 1}
          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-900 hover:bg-slate-100 transition-colors disabled:opacity-30"
          title="Descer"
        ><ChevronDown size={14} /></button>
        <button
          type="button" onClick={onRemove}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          title="Remover bloco"
        ><Trash2 size={14} /></button>
      </div>
    </div>

    <div className="p-3 space-y-2">
      {block.type === 'paragraph' && (
        <textarea
          value={block.text} rows={4} onChange={e => onChange({ text: e.target.value })}
          placeholder="Texto do parágrafo" className={inputCls}
        />
      )}

      {block.type === 'heading' && (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={block.text} onChange={e => onChange({ text: e.target.value })}
            placeholder="Texto do subtítulo" className={inputCls}
          />
          <select
            value={String(block.level)}
            onChange={e => onChange({ level: Number(e.target.value) === 3 ? 3 : 2 })}
            className={`${inputCls} sm:max-w-[140px]`}
          >
            <option value="2">Nível 2</option>
            <option value="3">Nível 3</option>
          </select>
        </div>
      )}

      {block.type === 'image' && (
        <>
          <ImageField url={block.url} onUrl={u => onChange({ url: u })} />
          <input
            value={block.alt || ''} onChange={e => onChange({ alt: e.target.value })}
            placeholder="Texto alternativo (descreve a imagem a quem não a vê)" className={inputCls}
          />
          <input
            value={block.caption || ''} onChange={e => onChange({ caption: e.target.value })}
            placeholder="Legenda (opcional)" className={inputCls}
          />
        </>
      )}

      {block.type === 'quote' && (
        <>
          <textarea
            value={block.text} rows={3} onChange={e => onChange({ text: e.target.value })}
            placeholder="Texto da citação" className={inputCls}
          />
          <input
            value={block.cite || ''} onChange={e => onChange({ cite: e.target.value })}
            placeholder="Autoria da citação (opcional)" className={inputCls}
          />
        </>
      )}

      {block.type === 'list' && (
        <>
          <textarea
            value={(block.items || []).join('\n')} rows={4}
            onChange={e => onChange({ items: e.target.value.split('\n') })}
            placeholder="Um item por linha" className={inputCls}
          />
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox" checked={!!block.ordered}
              onChange={e => onChange({ ordered: e.target.checked })}
              className="rounded border-slate-300"
            /> Lista numerada
          </label>
        </>
      )}

      {block.type === 'video' && (
        <>
          <input
            value={block.url} onChange={e => onChange({ url: e.target.value })}
            placeholder="Link do vídeo (YouTube, Vimeo...)" className={inputCls}
          />
          <input
            value={block.caption || ''} onChange={e => onChange({ caption: e.target.value })}
            placeholder="Legenda (opcional)" className={inputCls}
          />
        </>
      )}

      {block.type === 'divider' && (
        <p className="text-[11px] text-slate-400">Linha de separação. Não tem conteúdo.</p>
      )}
    </div>
  </div>
);

// ---------------------------------------------------------------- editor
type EntityPick = { entity_type: 'partner' | 'event'; entity_id: string; label: string };

type ArticleEditorProps = {
  isOpen: boolean;
  article: ArticleWithRelations | null;
  onClose: () => void;
};

export const ArticleEditor: React.FC<ArticleEditorProps> = ({ isOpen, article, onClose }) => {
  const [articleId, setArticleId] = useState<string | null>(article?.id ?? null);
  const [status, setStatus] = useState<ArticleStatus>(article?.status ?? 'rascunho');

  const [title, setTitle] = useState(article?.title ?? '');
  const [slug, setSlug] = useState(article?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!!article?.slug);
  const [summary, setSummary] = useState(article?.summary ?? '');
  const [categoryId, setCategoryId] = useState(article?.category_id ?? '');
  const [authorId, setAuthorId] = useState(article?.author_id ?? '');
  const [tagsText, setTagsText] = useState((article?.tags ?? []).join(', '));
  const [coverUrl, setCoverUrl] = useState(article?.cover_url ?? '');
  const [coverAlt, setCoverAlt] = useState(article?.cover_alt ?? '');
  const [seoTitle, setSeoTitle] = useState(article?.seo_title ?? '');
  const [seoDescription, setSeoDescription] = useState(article?.seo_description ?? '');
  const [seoImageUrl, setSeoImageUrl] = useState(article?.seo_image_url ?? '');
  const [blocks, setBlocks] = useState<ArticleBlock[]>(article?.body ?? []);
  const [scheduleAt, setScheduleAt] = useState(toLocalInput(article?.published_at));
  const [entities, setEntities] = useState<EntityPick[]>(
    (article?.entities ?? [])
      .filter(e => e.entity_type === 'partner' || e.entity_type === 'event')
      .map(e => ({ entity_type: e.entity_type as 'partner' | 'event', entity_id: e.entity_id, label: e.label || '' })),
  );

  const [busy, setBusy] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  // Refs de controlo: o autosave não pode gravar depois do unmount nem gravar
  // o estado inicial (que ainda não é uma alteração do utilizador).
  const aliveRef = useRef(true);
  const dirtyRef = useRef(false);
  useEffect(() => () => { aliveRef.current = false; }, []);

  const tags = useMemo(
    () => tagsText.split(',').map(t => t.trim()).filter(Boolean),
    [tagsText],
  );

  const draft: Partial<Article> = useMemo(() => ({
    title: title.trim(),
    slug: (slugTouched ? slug : slugifyArticle(title)).trim(),
    summary: summary.trim(),
    body: blocks,
    cover_url: coverUrl.trim() || null,
    cover_alt: coverAlt.trim() || null,
    category_id: categoryId || null,
    author_id: authorId || null,
    tags,
    seo_title: seoTitle.trim() || null,
    seo_description: seoDescription.trim() || null,
    seo_image_url: seoImageUrl.trim() || null,
    reading_minutes: estimateReadingMinutes(blocks),
  }), [
    title, slug, slugTouched, summary, blocks, coverUrl, coverAlt,
    categoryId, authorId, tags, seoTitle, seoDescription, seoImageUrl,
  ]);

  const draftKey = JSON.stringify(draft);

  // Qualquer alteração vinda do utilizador marca o rascunho como sujo.
  const markDirty = useCallback(() => { dirtyRef.current = true; }, []);

  // ------------------------------------------------------------- autosave
  // Debounce de 3s, só em rascunho e só depois de existir id. O timer é limpo
  // no cleanup (também no unmount), por isso fechar o editor cancela a gravação.
  useEffect(() => {
    if (!isOpen) return;
    if (status !== 'rascunho') return;
    if (!articleId) return;
    if (!dirtyRef.current) return;

    const timer = window.setTimeout(async () => {
      if (!aliveRef.current) return;
      setSaveState('saving');
      try {
        await autosaveArticle(articleId, draft);
      } catch {
        // autosaveArticle é silencioso por contrato; aqui também.
      }
      if (!aliveRef.current) return;
      dirtyRef.current = false;
      setSavedAt(new Date());
      setSaveState('saved');
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [isOpen, status, articleId, draftKey]);

  if (!isOpen) return null;

  const blockers = articlePublishBlockers(draft);
  const canPublish = blockers.length === 0;

  const scheduledDate = scheduleAt ? new Date(scheduleAt) : null;
  const isScheduled = !!scheduledDate && !Number.isNaN(scheduledDate.getTime()) && scheduledDate.getTime() > Date.now();

  // ------------------------------------------------------------- blocos
  const updateBlock = (index: number, patch: Record<string, unknown>) => {
    markDirty();
    setBlocks(bs => bs.map((b, i) => (i === index ? ({ ...b, ...patch } as ArticleBlock) : b)));
  };
  const moveBlock = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= blocks.length) return;
    markDirty();
    setBlocks(bs => {
      const copy = [...bs];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  };
  const removeBlock = (index: number) => {
    markDirty();
    setBlocks(bs => bs.filter((_, i) => i !== index));
  };
  const addBlock = (type: ArticleBlockType) => {
    markDirty();
    setBlocks(bs => [...bs, newBlock(type)]);
  };

  // ------------------------------------------------------------- entidades
  const toggleEntity = (entity_type: 'partner' | 'event', entity_id: string, label: string) => {
    markDirty();
    setEntities(list => {
      const exists = list.some(e => e.entity_type === entity_type && e.entity_id === entity_id);
      return exists
        ? list.filter(e => !(e.entity_type === entity_type && e.entity_id === entity_id))
        : [...list, { entity_type, entity_id, label }];
    });
  };
  const isPicked = (entity_type: 'partner' | 'event', entity_id: string) =>
    entities.some(e => e.entity_type === entity_type && e.entity_id === entity_id);

  // ------------------------------------------------------------- gravar
  /** Grava o artigo (cria, se ainda não existir) e devolve o id. */
  const persist = async (): Promise<string | null> => {
    let id = articleId;
    if (!id) {
      // O título é o único campo obrigatório para criar. Validamos aqui em vez
      // de deixar o tipo em `Partial<Article>` chegar ao serviço: sem isto o
      // utilizador clicava em Guardar e nada acontecia, sem explicação.
      const title = draft.title?.trim();
      if (!title) {
        showToast('Dê um título ao artigo antes de guardar.', 'error');
        return null;
      }
      // `status` não entra aqui de propósito: createArticle cria sempre como
      // rascunho, e a policy de INSERT só aceita 'rascunho'/'em_revisao'.
      // Quem promove o estado é publishArticle/archiveArticle.
      const created = await createArticle({ ...draft, title });
      id = created?.id ?? null;
      if (!id) return null;
      setArticleId(id);
      setStatus(created?.status ?? 'rascunho');
    } else {
      const ok = await updateArticle(id, draft);
      if (ok === false) return null;
    }
    await setArticleEntities(id, entities);
    return id;
  };

  const handleSave = async () => {
    if (busy || !title.trim()) return;
    setBusy(true);
    const id = await persist();
    if (!aliveRef.current) return;
    setBusy(false);
    if (id) {
      dirtyRef.current = false;
      setSavedAt(new Date());
      setSaveState('saved');
    }
  };

  const handlePublish = async () => {
    if (busy || !canPublish) return;
    setBusy(true);
    const id = await persist();
    if (!id) {
      if (aliveRef.current) setBusy(false);
      return;
    }
    const when = isScheduled && scheduledDate ? scheduledDate.toISOString() : undefined;
    const ok = await publishArticle(id, when);
    if (!aliveRef.current) return;
    setBusy(false);
    if (ok !== false) {
      dirtyRef.current = false;
      onClose();
    }
  };

  const titleId = 'article-editor-title';
  const previewBlocks = blocks;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-6xl" titleId={titleId}>
      <ModalHeader id={titleId}>
        {articleId ? 'Editar artigo' : 'Novo artigo'}
      </ModalHeader>

      {/* !p-0: o ModalBody traz p-8 por omissão e aqui as colunas têm o seu
          próprio espaçamento interno. */}
      <ModalBody className="!p-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
          {/* ------------------------------------------------ formulário */}
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${STATUS_META[status].cls}`}>
                {STATUS_META[status].label}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {estimateReadingMinutes(blocks)} min de leitura
              </span>
            </div>

            <div>
              <label className={labelCls} htmlFor="art-title">Título</label>
              <input
                id="art-title" value={title}
                onChange={e => { markDirty(); setTitle(e.target.value); }}
                placeholder="Título do artigo" className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls} htmlFor="art-slug">Endereço (slug)</label>
              <input
                id="art-slug"
                value={slugTouched ? slug : slugifyArticle(title)}
                onChange={e => { markDirty(); setSlugTouched(true); setSlug(slugifyArticle(e.target.value)); }}
                placeholder="gerado a partir do título" className={inputCls}
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Gerado automaticamente a partir do título. Pode editar.
              </p>
            </div>

            <div>
              <label className={labelCls} htmlFor="art-summary">Resumo</label>
              <textarea
                id="art-summary" value={summary} rows={3}
                onChange={e => { markDirty(); setSummary(e.target.value); }}
                placeholder="Resumo que aparece nas listagens" className={inputCls}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="art-cat">Categoria</label>
                <select
                  id="art-cat" value={categoryId}
                  onChange={e => { markDirty(); setCategoryId(e.target.value); }}
                  className={inputCls}
                >
                  <option value="">— Escolher categoria —</option>
                  {ARTICLE_CATEGORIES.filter(c => c.active).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="art-author">Autor</label>
                <select
                  id="art-author" value={authorId}
                  onChange={e => { markDirty(); setAuthorId(e.target.value); }}
                  className={inputCls}
                >
                  <option value="">— Sem autor —</option>
                  {ARTICLE_AUTHORS.filter(a => a.active).map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls} htmlFor="art-tags">Etiquetas</label>
              <input
                id="art-tags" value={tagsText}
                onChange={e => { markDirty(); setTagsText(e.target.value); }}
                placeholder="Separadas por vírgula" className={inputCls}
              />
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tags.map(t => (
                    <span key={t} className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-500">{t}</span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className={labelCls}>Imagem de capa</label>
              <ImageField url={coverUrl} onUrl={u => { markDirty(); setCoverUrl(u); }} />
              <input
                value={coverAlt}
                onChange={e => { markDirty(); setCoverAlt(e.target.value); }}
                placeholder="Texto alternativo da capa" className={`${inputCls} mt-2`}
              />
              {coverUrl && (
                <img src={coverUrl} alt="" className="mt-2 w-full h-40 object-cover rounded-lg border border-slate-100" />
              )}
            </div>

            {/* --------------------------------------------- blocos */}
            <div>
              <p className={labelCls}>Corpo do artigo</p>
              <div className="space-y-2">
                {blocks.length === 0 && (
                  <p className="px-4 py-6 text-center text-slate-400 text-xs rounded-xl border border-dashed border-slate-200">
                    Sem blocos ainda. Adicione o primeiro abaixo.
                  </p>
                )}
                {blocks.map((b, i) => (
                  <BlockRow
                    key={b.id}
                    block={b}
                    index={i}
                    total={blocks.length}
                    onChange={patch => updateBlock(i, patch)}
                    onMove={dir => moveBlock(i, dir)}
                    onRemove={() => removeBlock(i)}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {BLOCK_ORDER.map(t => (
                  <button
                    key={t} type="button" onClick={() => addBlock(t)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-brand-900 hover:text-brand-900 text-[10px] font-bold uppercase tracking-widest transition-colors"
                  >
                    <Plus size={12} /> {BLOCK_META[t].label}
                  </button>
                ))}
              </div>
            </div>

            {/* --------------------------------------------- SEO */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/40 p-4 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">SEO</p>
              <div>
                <label className={labelCls} htmlFor="art-seo-title">Título de SEO</label>
                <input
                  id="art-seo-title" value={seoTitle}
                  onChange={e => { markDirty(); setSeoTitle(e.target.value); }}
                  placeholder="Título para motores de busca" className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="art-seo-desc">Descrição de SEO</label>
                <textarea
                  id="art-seo-desc" value={seoDescription} rows={2}
                  onChange={e => { markDirty(); setSeoDescription(e.target.value); }}
                  placeholder="Descrição curta para motores de busca e redes" className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Imagem de SEO</label>
                <ImageField
                  url={seoImageUrl}
                  onUrl={u => { markDirty(); setSeoImageUrl(u); }}
                  placeholder="Link da imagem de partilha (opcional)"
                />
              </div>
            </div>

            {/* --------------------------------------------- entidades */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/40 p-4 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <Link2 size={12} /> Ligações a parceiros e eventos
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Parceiros</p>
                  <div className="max-h-40 overflow-y-auto custom-scrollbar rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
                    {PARTNERS.length === 0 && <p className="px-3 py-3 text-[11px] text-slate-400">Nenhum parceiro no sistema.</p>}
                    {PARTNERS.map(p => (
                      <label key={p.id} className="flex items-center gap-2 px-3 py-2 text-xs text-slate-600 cursor-pointer select-none hover:bg-slate-50">
                        <input
                          type="checkbox" checked={isPicked('partner', p.id)}
                          onChange={() => toggleEntity('partner', p.id, p.name)}
                          className="rounded border-slate-300"
                        />
                        <span className="truncate">{p.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Eventos</p>
                  <div className="max-h-40 overflow-y-auto custom-scrollbar rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
                    {EVENTS.length === 0 && <p className="px-3 py-3 text-[11px] text-slate-400">Nenhum evento no sistema.</p>}
                    {EVENTS.map(ev => (
                      <label key={ev.id} className="flex items-center gap-2 px-3 py-2 text-xs text-slate-600 cursor-pointer select-none hover:bg-slate-50">
                        <input
                          type="checkbox" checked={isPicked('event', ev.id)}
                          onChange={() => toggleEntity('event', ev.id, ev.title)}
                          className="rounded border-slate-300"
                        />
                        <span className="truncate">{ev.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* --------------------------------------------- agendamento */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/40 p-4 space-y-2">
              <label className={labelCls} htmlFor="art-when">Data e hora de publicação</label>
              <input
                id="art-when" type="datetime-local" value={scheduleAt}
                onChange={e => { markDirty(); setScheduleAt(e.target.value); }}
                className={inputCls}
              />
              <p className="text-[11px] text-slate-500 flex items-start gap-1.5">
                <Clock size={12} className="mt-0.5 shrink-0" />
                {isScheduled
                  ? 'Com data futura, o artigo fica visível sozinho no site na data e hora marcadas — não precisa de voltar aqui.'
                  : 'Deixe vazio ou com data passada para publicar imediatamente.'}
              </p>
            </div>

            {/* --------------------------------------------- checklist */}
            {blockers.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 flex items-center gap-1.5 mb-2">
                  <AlertTriangle size={12} /> Falta preencher para publicar
                </p>
                <ul className="space-y-1">
                  {blockers.map(b => (
                    <li key={b} className="text-xs text-amber-800 flex items-center gap-1.5">
                      <X size={12} className="shrink-0" /> {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {blockers.length === 0 && (
              <p className="text-xs text-green-700 flex items-center gap-1.5">
                <Check size={13} /> Checklist completo. Pode publicar.
              </p>
            )}
          </div>

          {/* ------------------------------------------------ prévia */}
          <div className="p-6 bg-slate-50/50">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5 mb-3">
              <Eye size={12} /> Prévia
            </p>
            <div className="rounded-xl border border-slate-200 bg-white p-5 overflow-hidden">
              {coverUrl && (
                <img src={coverUrl} alt={coverAlt || ''} className="w-full h-44 object-cover rounded-lg mb-4" />
              )}
              <h1 className="text-2xl font-light text-brand-900 leading-snug">
                {title.trim() || 'Título do artigo'}
              </h1>
              {summary.trim() && <p className="text-sm text-slate-600 mt-2 leading-relaxed">{summary.trim()}</p>}
              <div className="mt-5">
                {/* Mesmo renderizador da página pública — a prévia não pode divergir. */}
                <ArticleBlocks blocks={previewBlocks} />
              </div>
            </div>
          </div>
        </div>
      </ModalBody>

      <ModalFooter className="flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Indicador discreto do autosave */}
        <div className="text-[11px] text-slate-400 min-h-[16px] flex items-center gap-1.5">
          {status === 'rascunho' && saveState === 'saving' && (
            <><Loader2 size={12} className="animate-spin" /> A guardar…</>
          )}
          {status === 'rascunho' && saveState === 'saved' && savedAt && (
            <>Guardado às {hhmm(savedAt)}</>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button" onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-100 transition-colors"
          >Fechar</button>

          <button
            type="button" onClick={handleSave} disabled={busy || !title.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-white text-xs font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Guardar
          </button>

          <button
            type="button" onClick={handlePublish} disabled={busy || !canPublish}
            title={canPublish ? undefined : `Falta: ${blockers.join(', ')}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-900 hover:bg-brand-800 text-white text-xs font-bold uppercase tracking-wider shadow-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isScheduled ? <Clock size={14} /> : <Send size={14} />}
            {isScheduled ? 'Agendar publicação' : 'Publicar'}
          </button>
        </div>
      </ModalFooter>
    </Modal>
  );
};
