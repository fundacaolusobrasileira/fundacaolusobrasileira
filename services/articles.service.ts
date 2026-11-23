// services/articles.service.ts
// Área Editorial — camada de dados dos artigos. Segue o molde de
// services/documents.service.ts: normalize(), syncX(), guarda isEditor(),
// Zod antes do banco, verificação de linhas afetadas em UPDATE/DELETE
// (a RLS nega em silêncio com { error: null, data: [] }), logActivity + toast.
import { supabase } from '../supabaseClient';
import {
  ARTICLES,
  ARTICLE_CATEGORIES,
  ARTICLE_AUTHORS,
  SITE_SETTINGS,
  setSiteSettings,
  setSiteSettingsLoaded,
  setArticlesLoading,
  AUTH_SESSION,
  notifyState,
  showToast,
  logActivity,
  isEditor,
} from '../store/app.store';
import {
  ArticleSchema,
  ArticlePatchSchema,
  ArticleEntityLinkInputSchema,
  ArticleImageUploadSchema,
  ARTICLE_IMAGE_MIME_TYPES,
  MAX_ARTICLE_IMAGE_SIZE,
  type ArticleEntityLinkInput,
} from '../validation/article.schemas';
import {
  slugifyArticle,
  estimateReadingMinutes,
  articlePublishBlockers,
  type Article,
  type ArticleBlock,
  type ArticleCategory,
  type ArticleAuthor,
  type ArticleEntityLink,
  type ArticleEntityType,
  type ArticleStatus,
  type ArticleVersion,
  type ArticleWithRelations,
} from '../types/articles';

// ---------------------------------------------------------------------------
// normalize — linha do banco → tipo do domínio
// ---------------------------------------------------------------------------

const normalize = (row: any): Article => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  summary: row.summary ?? '',
  body: Array.isArray(row.body) ? (row.body as ArticleBlock[]) : [],
  cover_url: row.cover_url ?? null,
  cover_alt: row.cover_alt ?? null,
  category_id: row.category_id ?? null,
  author_id: row.author_id ?? null,
  tags: Array.isArray(row.tags) ? row.tags : [],
  status: (row.status ?? 'rascunho') as ArticleStatus,
  published_at: row.published_at ?? null,
  seo_title: row.seo_title ?? null,
  seo_description: row.seo_description ?? null,
  seo_image_url: row.seo_image_url ?? null,
  reading_minutes: row.reading_minutes ?? null,
  created_at: row.created_at,
  updated_at: row.updated_at,
  created_by: row.created_by ?? null,
});

const normalizeCategory = (row: any): ArticleCategory => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  description: row.description ?? null,
  order: row.order ?? 0,
  active: row.active !== false,
  created_at: row.created_at,
});

const normalizeAuthor = (row: any): ArticleAuthor => ({
  id: row.id,
  name: row.name,
  user_id: row.user_id ?? null,
  partner_id: row.partner_id ?? null,
  bio: row.bio ?? null,
  avatar_url: row.avatar_url ?? null,
  active: row.active !== false,
  created_at: row.created_at,
});

const normalizeEntityLink = (row: any): ArticleEntityLink => ({
  id: row.id,
  article_id: row.article_id,
  entity_type: row.entity_type as ArticleEntityType,
  entity_id: row.entity_id,
  label: row.label ?? null,
});

const normalizeVersion = (row: any): ArticleVersion => ({
  id: row.id,
  article_id: row.article_id,
  version: row.version,
  snapshot: (row.snapshot ?? {}) as Partial<Article>,
  created_at: row.created_at,
  created_by: row.created_by ?? null,
});

// ---------------------------------------------------------------------------
// Auxiliares internos
// ---------------------------------------------------------------------------

const ts = (value?: string | null): number => (value ? Date.parse(value) : NaN);

/** Já visível ao público: publicado e com data vencida (mesma regra da RLS). */
const isLive = (a: Article): boolean => {
  if (a.status !== 'publicado' || !a.published_at) return false;
  const when = ts(a.published_at);
  return !Number.isNaN(when) && when <= Date.now();
};

/** Ordenação canónica: published_at desc, created_at desc. */
const byRecency = (a: Article, b: Article): number => {
  const pa = ts(a.published_at);
  const pb = ts(b.published_at);
  if (!Number.isNaN(pa) && !Number.isNaN(pb) && pa !== pb) return pb - pa;
  if (Number.isNaN(pa) !== Number.isNaN(pb)) return Number.isNaN(pa) ? -1 : 1; // sem data primeiro (rascunhos no topo do painel)
  const ca = ts(a.created_at) || 0;
  const cb = ts(b.created_at) || 0;
  return cb - ca;
};

/** Resolve categoria e autor a partir da taxonomia já em memória. */
const withRelations = (a: Article, entities?: ArticleEntityLink[]): ArticleWithRelations => ({
  ...a,
  category: ARTICLE_CATEGORIES.find(c => c.id === a.category_id) ?? null,
  author: ARTICLE_AUTHORS.find(x => x.id === a.author_id) ?? null,
  ...(entities ? { entities } : {}),
});

const currentUserId = async (): Promise<string | null> => {
  if (AUTH_SESSION.userId) return AUTH_SESSION.userId;
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
};

const upsertLocal = (article: Article): void => {
  const idx = ARTICLES.findIndex(a => a.id === article.id);
  if (idx === -1) ARTICLES.push(article);
  else ARTICLES[idx] = article;
};

const fetchArticleById = async (id: string): Promise<Article | null> => {
  const { data, error } = await supabase.from('articles').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return normalize(data);
};

// ---------------------------------------------------------------------------
// SYNC
// ---------------------------------------------------------------------------

/**
 * Carrega os artigos para o estado global.
 * Editores (e autores autenticados) recebem o que a RLS lhes permitir ver —
 * incluindo rascunhos próprios. Para visitantes não autenticados filtramos
 * explicitamente pelos publicados, o que coincide com a RLS e evita trazer
 * carga inútil.
 */
export const syncArticles = async (): Promise<void> => {
  setArticlesLoading(true);
  let query = supabase.from('articles').select('*');
  if (!AUTH_SESSION.isLoggedIn) {
    query = query.eq('status', 'publicado').lte('published_at', new Date().toISOString());
  }
  const { data, error } = await query
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  ARTICLES.length = 0;
  // Em caso de erro (tabela não migrada / sem permissão) deixamos vazio: a
  // página mostra o estado "em preparação" sem quebrar.
  if (!error && data) ARTICLES.push(...data.map(normalize));
  setArticlesLoading(false);
  notifyState();
};

/** Categorias e autores (leitura pública pela RLS). */
export const syncArticleTaxonomy = async (): Promise<void> => {
  const [cats, authors] = await Promise.all([
    supabase.from('article_categories').select('*').order('order', { ascending: true }).order('name', { ascending: true }),
    supabase.from('article_authors').select('*').order('name', { ascending: true }),
  ]);

  ARTICLE_CATEGORIES.length = 0;
  if (!cats.error && cats.data) ARTICLE_CATEGORIES.push(...cats.data.map(normalizeCategory));

  ARTICLE_AUTHORS.length = 0;
  if (!authors.error && authors.data) ARTICLE_AUTHORS.push(...authors.data.map(normalizeAuthor));

  notifyState();
};

/** Definições do site (site_settings), achatadas em { key: value }. */
export const syncSiteSettings = async (): Promise<void> => {
  const { data, error } = await supabase.from('site_settings').select('key, value');
  const next: Record<string, unknown> = {};
  if (!error && data) for (const row of data) next[row.key] = row.value;
  setSiteSettings(next);
  setSiteSettingsLoaded(!error);
  notifyState();
};

/** Interruptor da Área Editorial. Enquanto não houver resposta, assume desligado. */
export const isArticlesEnabled = (): boolean => {
  const raw = SITE_SETTINGS['articles_enabled'];
  return raw === true || raw === 'true';
};

// ---------------------------------------------------------------------------
// LEITURA (derivada do estado global — chame os sync primeiro)
// ---------------------------------------------------------------------------

export const getPublishedArticles = (): ArticleWithRelations[] =>
  ARTICLES.filter(isLive).sort(byRecency).map(a => withRelations(a));

/**
 * Procura primeiro no estado global; se não estiver lá (acesso direto por URL
 * antes do sync, ou pré-visualização de rascunho) vai ao banco. Traz também as
 * ligações a entidades. Devolve null quando não existe ou a RLS não permite.
 */
export const getArticleBySlug = async (slug: string): Promise<ArticleWithRelations | null> => {
  let article = ARTICLES.find(a => a.slug === slug) ?? null;
  if (!article) {
    const { data, error } = await supabase.from('articles').select('*').eq('slug', slug).maybeSingle();
    if (error || !data) return null;
    article = normalize(data);
    upsertLocal(article);
    notifyState();
  }

  const { data: links } = await supabase
    .from('article_entities')
    .select('*')
    .eq('article_id', article.id);

  return withRelations(article, (links ?? []).map(normalizeEntityLink));
};

export const getArticlesByCategory = (slug: string): ArticleWithRelations[] => {
  const category = ARTICLE_CATEGORIES.find(c => c.slug === slug);
  if (!category) return [];
  return ARTICLES
    .filter(a => a.category_id === category.id && isLive(a))
    .sort(byRecency)
    .map(a => withRelations(a));
};

/**
 * Relacionados: mesma categoria, excluindo o próprio. Se não houver os
 * suficientes, completa com os mais recentes para a secção nunca ficar curta.
 */
export const getRelatedArticles = (article: Article, limit = 3): ArticleWithRelations[] => {
  if (limit <= 0) return [];
  const pool = ARTICLES.filter(a => a.id !== article.id && a.slug !== article.slug && isLive(a)).sort(byRecency);
  const sameCategory = article.category_id ? pool.filter(a => a.category_id === article.category_id) : [];
  const result = sameCategory.slice(0, limit);
  if (result.length < limit) {
    for (const a of pool) {
      if (result.length >= limit) break;
      if (!result.some(r => r.id === a.id)) result.push(a);
    }
  }
  return result.map(a => withRelations(a));
};

/** Artigos publicados que citam uma entidade (parceiro, evento, etc.). */
export const getArticlesForEntity = async (
  entityType: ArticleEntityType,
  entityId: string,
): Promise<ArticleWithRelations[]> => {
  const { data: links, error: linksError } = await supabase
    .from('article_entities')
    .select('article_id')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId);
  if (linksError || !links || links.length === 0) return [];

  const ids = [...new Set(links.map((l: any) => l.article_id))];
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .in('id', ids)
    .eq('status', 'publicado')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(normalize).map(a => withRelations(a));
};

// ---------------------------------------------------------------------------
// ESCRITA
// ---------------------------------------------------------------------------

/** Confirma se o slug já está tomado. Em erro devolve false: o UNIQUE do banco é a rede de segurança. */
const slugTaken = async (slug: string): Promise<boolean> => {
  const { data, error } = await supabase.from('articles').select('id').eq('slug', slug).limit(1);
  if (error || !data) return false;
  return data.length > 0;
};

/** Slug a partir do título; se existir, acrescenta sufixo numérico (-2, -3, ...). */
const buildUniqueSlug = async (title: string): Promise<string> => {
  const base = slugifyArticle(title) || 'artigo';
  let candidate = base;
  for (let n = 2; n <= 50; n++) {
    if (!(await slugTaken(candidate))) return candidate;
    candidate = `${base.slice(0, 74)}-${n}`;
  }
  return `${base.slice(0, 68)}-${Date.now().toString(36)}`;
};

export interface CreateArticleInput {
  title: string;
  summary?: string;
  body?: ArticleBlock[];
  cover_url?: string | null;
  cover_alt?: string | null;
  category_id?: string | null;
  author_id?: string | null;
  tags?: string[];
  seo_title?: string | null;
  seo_description?: string | null;
  seo_image_url?: string | null;
}

/** Nasce sempre 'rascunho' e com created_by = utilizador atual (a RLS exige-o). */
export const createArticle = async (input: CreateArticleInput): Promise<Article | null> => {
  if (!isEditor()) { showToast('Sem permissão.', 'error'); return null; }

  const userId = await currentUserId();
  if (!userId) { showToast('Sessão inválida. Entre novamente para criar artigos.', 'error'); return null; }

  const body = input.body ?? [];
  const candidate = {
    slug: await buildUniqueSlug(input.title || ''),
    title: (input.title || '').trim(),
    summary: (input.summary ?? '').trim(),
    body,
    cover_url: input.cover_url ?? null,
    cover_alt: input.cover_alt ?? null,
    category_id: input.category_id ?? null,
    author_id: input.author_id ?? null,
    tags: input.tags ?? [],
    status: 'rascunho' as ArticleStatus,
    published_at: null,
    seo_title: input.seo_title ?? null,
    seo_description: input.seo_description ?? null,
    seo_image_url: input.seo_image_url ?? null,
    reading_minutes: estimateReadingMinutes(body),
    created_by: userId,
  };

  const parsed = ArticleSchema.safeParse(candidate);
  if (!parsed.success) {
    showToast(parsed.error.issues[0]?.message || 'Dados inválidos.', 'error');
    return null;
  }

  // Corrida de slug: outro utilizador pode ter criado o mesmo slug entre a
  // verificação e o insert, e a RLS pode esconder rascunhos alheios do
  // slugTaken(). Em violação de unicidade (23505) tentamos o sufixo seguinte.
  let payload = { ...parsed.data };
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase.from('articles').insert([payload]).select().single();
    if (!error && data) {
      const created = normalize(data);
      upsertLocal(created);
      logActivity('Criou artigo', created.title);
      notifyState();
      showToast('Artigo criado como rascunho.', 'success');
      return created;
    }
    if (error?.code !== '23505') {
      showToast(`Erro ao criar artigo${error?.message ? `: ${error.message}` : '.'}`, 'error');
      return null;
    }
    payload = { ...payload, slug: `${payload.slug.slice(0, 68)}-${attempt + 2}` };
  }
  showToast('Não foi possível gerar um endereço único para este artigo.', 'error');
  return null;
};

export type ArticlePatch = Partial<Pick<Article,
  'slug' | 'title' | 'summary' | 'body' | 'cover_url' | 'cover_alt' | 'category_id' |
  'author_id' | 'tags' | 'status' | 'published_at' | 'seo_title' | 'seo_description' |
  'seo_image_url' | 'reading_minutes'>>;

/**
 * Núcleo partilhado por update/autosave/publish/unpublish/archive.
 * `silent` desliga toast e logActivity (usado pelo autosave).
 */
const applyPatch = async (
  id: string,
  patch: ArticlePatch,
  opts: { silent?: boolean; action?: string; successMessage?: string } = {},
): Promise<boolean> => {
  const { silent = false, action = 'Editou artigo', successMessage = 'Artigo atualizado.' } = opts;

  if (!isEditor()) {
    if (!silent) showToast('Sem permissão.', 'error');
    return false;
  }

  // Tempo de leitura acompanha o corpo: recalculado sempre que o body muda.
  const effective: ArticlePatch = { ...patch };
  if (patch.body !== undefined) effective.reading_minutes = estimateReadingMinutes(patch.body || []);

  const parsed = ArticlePatchSchema.safeParse(effective);
  if (!parsed.success) {
    if (!silent) showToast(parsed.error.issues[0]?.message || 'Dados inválidos.', 'error');
    else console.warn('[articles] autosave inválido:', parsed.error.issues[0]?.message);
    return false;
  }
  if (Object.keys(parsed.data).length === 0) return true; // nada a gravar

  // RLS USING denial devolve { error: null, data: [] } — confirmar linhas afetadas.
  const { data, error } = await supabase
    .from('articles')
    .update(parsed.data)
    .eq('id', id)
    .select('id');
  if (error) {
    if (!silent) showToast(`Erro ao gravar artigo${error.message ? `: ${error.message}` : '.'}`, 'error');
    else console.warn('[articles] autosave falhou:', error.message);
    return false;
  }
  if (!data || data.length === 0) {
    if (!silent) showToast('Sem permissão para gravar este artigo.', 'error');
    else console.warn('[articles] autosave sem permissão (RLS negou em silêncio).');
    return false;
  }

  const idx = ARTICLES.findIndex(a => a.id === id);
  if (idx !== -1) ARTICLES[idx] = { ...ARTICLES[idx], ...(parsed.data as Partial<Article>) } as Article;
  if (!silent) {
    logActivity(action, ARTICLES.find(a => a.id === id)?.title || id);
    showToast(successMessage, 'success');
  }
  notifyState();
  return true;
};

export const updateArticle = async (id: string, patch: ArticlePatch): Promise<boolean> =>
  applyPatch(id, patch);

/**
 * Gravação automática: sem toast e sem logActivity (corre a cada poucos
 * segundos — não pode poluir o histórico nem piscar notificações).
 * Devolve true só quando o banco confirmou a linha gravada.
 */
export const autosaveArticle = async (id: string, patch: ArticlePatch): Promise<boolean> =>
  applyPatch(id, patch, { silent: true });

/**
 * Publica agora (sem `when`) ou agenda (com `when` no futuro): em ambos os
 * casos grava status 'publicado' e a data pretendida. A policy de leitura
 * pública exige published_at <= now(), por isso o agendamento acontece sozinho
 * — não existe cron.
 */
export const publishArticle = async (id: string, when?: string | Date): Promise<boolean> => {
  if (!isEditor()) { showToast('Sem permissão.', 'error'); return false; }

  const article = ARTICLES.find(a => a.id === id) ?? (await fetchArticleById(id));
  if (!article) { showToast('Artigo não encontrado.', 'error'); return false; }

  const blockers = articlePublishBlockers(article);
  if (blockers.length > 0) {
    showToast(`Não é possível publicar. Falta preencher: ${blockers.join(', ')}.`, 'error');
    return false;
  }

  const target = when ? new Date(when) : new Date();
  if (Number.isNaN(target.getTime())) { showToast('Data de publicação inválida.', 'error'); return false; }

  const isFuture = target.getTime() > Date.now();
  const ok = await applyPatch(id, {
    status: 'publicado',
    published_at: target.toISOString(),
    // Tempo de leitura acertado antes de ir ao ar, sem reescrever o corpo.
    reading_minutes: estimateReadingMinutes(article.body || []),
  }, {
    action: isFuture ? 'Agendou artigo' : 'Publicou artigo',
    successMessage: isFuture
      ? `Artigo agendado para ${target.toLocaleString('pt-PT')}.`
      : 'Artigo publicado.',
  });
  return ok;
};

/** Volta a rascunho e limpa a data — sai imediatamente do site público. */
export const unpublishArticle = async (id: string): Promise<boolean> =>
  applyPatch(id, { status: 'rascunho', published_at: null }, {
    action: 'Despublicou artigo',
    successMessage: 'Artigo retirado do site.',
  });

/** Arquiva mantendo a data de publicação, para o histórico não se perder. */
export const archiveArticle = async (id: string): Promise<boolean> =>
  applyPatch(id, { status: 'arquivado' }, {
    action: 'Arquivou artigo',
    successMessage: 'Artigo arquivado.',
  });

export const deleteArticle = async (id: string): Promise<boolean> => {
  if (!isEditor()) { showToast('Sem permissão.', 'error'); return false; }

  const { data, error } = await supabase
    .from('articles')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) { showToast('Erro ao remover artigo.', 'error'); return false; }
  if (!data || data.length === 0) { showToast('Sem permissão para remover este artigo.', 'error'); return false; }

  const idx = ARTICLES.findIndex(a => a.id === id);
  if (idx !== -1) {
    const title = ARTICLES[idx].title;
    ARTICLES.splice(idx, 1);
    logActivity('Removeu artigo', title);
    notifyState();
    showToast('Artigo removido.', 'success');
  }
  return true;
};

/**
 * Substitui as ligações do artigo a entidades do negócio.
 * Apaga as atuais e insere as novas. Nota: um DELETE que afete 0 linhas é
 * legítimo (o artigo podia não ter ligações), por isso a confirmação de
 * permissão é feita no INSERT — e, quando a lista fica vazia, por uma
 * releitura das ligações.
 */
export const setArticleEntities = async (
  articleId: string,
  links: ArticleEntityLinkInput[],
): Promise<boolean> => {
  if (!isEditor()) { showToast('Sem permissão.', 'error'); return false; }

  const parsedLinks: ArticleEntityLinkInput[] = [];
  for (const link of links || []) {
    const parsed = ArticleEntityLinkInputSchema.safeParse(link);
    if (!parsed.success) {
      showToast(parsed.error.issues[0]?.message || 'Ligação inválida.', 'error');
      return false;
    }
    parsedLinks.push(parsed.data);
  }

  const { error: delError } = await supabase.from('article_entities').delete().eq('article_id', articleId);
  if (delError) { showToast('Erro ao atualizar as ligações do artigo.', 'error'); return false; }

  if (parsedLinks.length > 0) {
    const rows = parsedLinks.map(l => ({
      article_id: articleId,
      entity_type: l.entity_type,
      entity_id: l.entity_id,
      label: l.label ?? null,
    }));
    const { data, error } = await supabase.from('article_entities').insert(rows).select('id');
    if (error) { showToast('Erro ao gravar as ligações do artigo.', 'error'); return false; }
    if (!data || data.length === 0) { showToast('Sem permissão para gravar as ligações.', 'error'); return false; }
  } else {
    // Lista vazia: confirmar que o DELETE realmente passou (a RLS podia ter
    // negado em silêncio e o utilizador ficaria a pensar que gravou).
    const { data } = await supabase.from('article_entities').select('id').eq('article_id', articleId).limit(1);
    if (data && data.length > 0) { showToast('Sem permissão para remover as ligações.', 'error'); return false; }
  }

  logActivity('Atualizou ligações do artigo', ARTICLES.find(a => a.id === articleId)?.title || articleId);
  notifyState();
  showToast('Ligações do artigo atualizadas.', 'success');
  return true;
};

/**
 * Upload de imagem para o Supabase Storage (bucket `media`, pasta articles/).
 * Só mimes que o bucket aceita no servidor. Retorna a URL pública, ou null.
 */
export const uploadArticleImage = async (file: File): Promise<string | null> => {
  if (!isEditor()) { showToast('Sem permissão.', 'error'); return null; }

  const parsed = ArticleImageUploadSchema.safeParse(file);
  if (!parsed.success) {
    showToast(parsed.error.issues[0]?.message || 'Imagem inválida.', 'error');
    return null;
  }
  // Defesa em profundidade: a whitelist do bucket não aceita nada fora destes.
  if (!(ARTICLE_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
    showToast('Tipo de imagem não suportado. Use JPEG, PNG, WEBP, AVIF ou GIF.', 'error');
    return null;
  }
  if (file.size > MAX_ARTICLE_IMAGE_SIZE) {
    showToast('Imagem muito grande (máx. 8MB).', 'error');
    return null;
  }

  const safe = file.name.replace(/[^a-zA-Z0-9.]/g, '');
  const path = `articles/${crypto.randomUUID()}-${safe}`;
  const { error } = await supabase.storage.from('media').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });
  if (error) { showToast(`Erro no upload: ${error.message}`, 'error'); return null; }
  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return data.publicUrl;
};

/** Histórico de versões (só leitura; as versões são criadas pelo trigger). */
export const listArticleVersions = async (articleId: string): Promise<ArticleVersion[]> => {
  const { data, error } = await supabase
    .from('article_versions')
    .select('*')
    .eq('article_id', articleId)
    .order('version', { ascending: false });
  if (error) { showToast('Erro ao carregar o histórico de versões.', 'error'); return []; }
  return (data ?? []).map(normalizeVersion);
};
