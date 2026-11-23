// types/articles.ts
// Área Editorial. Mantido fora de types/index.ts para isolar o domínio novo.

export type ArticleStatus = 'rascunho' | 'em_revisao' | 'agendado' | 'publicado' | 'arquivado';

/** Entidades do negócio que um artigo pode citar. */
export type ArticleEntityType = 'partner' | 'event' | 'council_member' | 'document';

// ---------------------------------------------------------------------------
// CORPO EM BLOCOS
// Decisão de produto: o corpo é uma lista de blocos tipados, não HTML.
// Nada de `dangerouslySetInnerHTML` — cada bloco tem o seu renderizador, por
// isso não existe superfície de XSS vinda do conteúdo.
// ---------------------------------------------------------------------------

export type ArticleBlock =
  | { id: string; type: 'paragraph'; text: string }
  | { id: string; type: 'heading'; level: 2 | 3; text: string }
  | { id: string; type: 'image'; url: string; caption?: string; alt?: string }
  | { id: string; type: 'quote'; text: string; cite?: string }
  | { id: string; type: 'list'; ordered?: boolean; items: string[] }
  | { id: string; type: 'video'; url: string; caption?: string }
  | { id: string; type: 'divider' };

export type ArticleBlockType = ArticleBlock['type'];

export interface ArticleCategory {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  order: number;
  active: boolean;
  created_at?: string;
}

export interface ArticleAuthor {
  id: string;
  name: string;
  /** Liga ao perfil de utilizador, quando existir. */
  user_id?: string | null;
  /** Liga a um membro/parceiro para reaproveitar foto e biografia. */
  partner_id?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  active: boolean;
  created_at?: string;
}

export interface ArticleEntityLink {
  id: string;
  article_id: string;
  entity_type: ArticleEntityType;
  entity_id: string;
  /** Rótulo congelado no momento da ligação, para a lista não ficar vazia
   *  se a entidade for removida. Não é fonte da verdade. */
  label?: string | null;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: ArticleBlock[];
  cover_url?: string | null;
  cover_alt?: string | null;
  category_id?: string | null;
  author_id?: string | null;
  tags: string[];
  status: ArticleStatus;
  /** Data de publicação. No futuro = agendado: a própria policy de leitura
   *  pública exige `published_at <= now()`, por isso não é preciso cron. */
  published_at?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_image_url?: string | null;
  reading_minutes?: number | null;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
}

/** Artigo com as relações já resolvidas, para o ecrã não ter de as procurar. */
export interface ArticleWithRelations extends Article {
  category?: ArticleCategory | null;
  author?: ArticleAuthor | null;
  entities?: ArticleEntityLink[];
}

export interface ArticleVersion {
  id: string;
  article_id: string;
  version: number;
  snapshot: Partial<Article>;
  created_at: string;
  created_by?: string | null;
}

// ---------------------------------------------------------------------------
// Auxiliares puros — sem dependências, fáceis de testar.
// ---------------------------------------------------------------------------

/** Converte um título em slug: sem acentos, minúsculas, hífens. */
export const slugifyArticle = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

/** Texto corrido do corpo, para contagem de palavras e descrição automática. */
export const articleBlocksToText = (blocks: ArticleBlock[]): string =>
  (blocks || [])
    .map(b => {
      switch (b.type) {
        case 'paragraph':
        case 'heading':
        case 'quote':
          return b.text || '';
        case 'list':
          return (b.items || []).join(' ');
        case 'image':
        case 'video':
          return b.caption || '';
        default:
          return '';
      }
    })
    .filter(Boolean)
    .join(' ');

/** Tempo de leitura em minutos, a 200 palavras por minuto, mínimo 1. */
export const estimateReadingMinutes = (blocks: ArticleBlock[]): number => {
  const words = articleBlocksToText(blocks).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
};

/** Checklist de pré-publicação. Lista vazia = pode publicar. */
export const articlePublishBlockers = (a: Partial<Article>): string[] => {
  const missing: string[] = [];
  if (!a.title?.trim()) missing.push('Título');
  if (!a.summary?.trim()) missing.push('Resumo');
  if (!a.cover_url) missing.push('Imagem de capa');
  if (!a.category_id) missing.push('Categoria');
  if (!a.seo_title?.trim()) missing.push('Título de SEO');
  if (!a.seo_description?.trim()) missing.push('Descrição de SEO');
  if (!a.body || a.body.length === 0) missing.push('Corpo do artigo');
  return missing;
};
