// validation/article.schemas.ts
// Área Editorial — validação do artigo e do corpo em blocos (zod v4).
// Segue o estilo de validation/schemas.ts: mensagens em português, objetos
// "planos" (sem .refine no topo) para que `.partial()` continue a funcionar
// nos patches, tal como DocumentSchema já faz.
import { z } from 'zod';
import { isSafeHttpUrl } from '../utils/url';

// ---------------------------------------------------------------------------
// Auxiliares
// ---------------------------------------------------------------------------

/** URL obrigatória, http/https apenas — mesmo critério do resto do projeto. */
const safeUrl = (message = 'URL deve ser HTTP/HTTPS válida') =>
  z.string()
    .min(1, 'URL obrigatória')
    .max(2048, 'URL muito longa')
    .refine(isSafeHttpUrl, { message });

/** URL opcional: aceita ausente, null ou '' — só valida quando há conteúdo. */
const optionalSafeUrl = (message = 'URL deve ser HTTP/HTTPS válida') =>
  z.string()
    .max(2048, 'URL muito longa')
    .refine(v => v === '' || isSafeHttpUrl(v), { message })
    .optional()
    .nullable();

const optionalText = (max: number, message: string) =>
  z.string().trim().max(max, message).optional().nullable();

/** Data em texto (ISO ou qualquer coisa que o Date aceite). */
const dateText = z.string()
  .min(1, 'Data obrigatória')
  .refine(v => !Number.isNaN(Date.parse(v)), { message: 'Data inválida' });

const blockId = z.string().trim().min(1, 'Bloco sem identificador').max(64, 'Identificador de bloco muito longo');

// ---------------------------------------------------------------------------
// CORPO EM BLOCOS — união discriminada por `type`
// Espelha ArticleBlock de types/articles.ts. Cada bloco tem o seu renderizador,
// por isso nunca há HTML cru: o que não passar aqui não chega ao ecrã.
// ---------------------------------------------------------------------------

export const ArticleBlockSchema = z.discriminatedUnion('type', [
  z.object({
    id: blockId,
    type: z.literal('paragraph'),
    text: z.string().trim().min(1, 'Parágrafo vazio').max(5000, 'Parágrafo muito longo'),
  }),
  z.object({
    id: blockId,
    type: z.literal('heading'),
    level: z.union([z.literal(2), z.literal(3)], { error: 'Nível de título deve ser 2 ou 3' }),
    text: z.string().trim().min(1, 'Título de secção vazio').max(200, 'Título de secção muito longo'),
  }),
  z.object({
    id: blockId,
    type: z.literal('image'),
    url: safeUrl('Imagem deve ter uma URL HTTP/HTTPS válida'),
    caption: optionalText(300, 'Legenda muito longa'),
    alt: optionalText(200, 'Texto alternativo muito longo'),
  }),
  z.object({
    id: blockId,
    type: z.literal('quote'),
    text: z.string().trim().min(1, 'Citação vazia').max(2000, 'Citação muito longa'),
    cite: optionalText(200, 'Autoria da citação muito longa'),
  }),
  z.object({
    id: blockId,
    type: z.literal('list'),
    ordered: z.boolean().optional(),
    items: z.array(z.string().trim().min(1, 'Item de lista vazio').max(500, 'Item de lista muito longo'))
      .min(1, 'A lista precisa de pelo menos um item')
      .max(100, 'Lista com demasiados itens'),
  }),
  z.object({
    id: blockId,
    type: z.literal('video'),
    url: safeUrl('Vídeo deve ter uma URL HTTP/HTTPS válida'),
    caption: optionalText(300, 'Legenda muito longa'),
  }),
  z.object({
    id: blockId,
    type: z.literal('divider'),
  }),
], { error: 'Bloco de conteúdo inválido' });

export const ArticleBodySchema = z.array(ArticleBlockSchema).max(300, 'Artigo com demasiados blocos');

// ---------------------------------------------------------------------------
// Campos simples reutilizáveis
// ---------------------------------------------------------------------------

export const ArticleStatusSchema = z.enum(
  ['rascunho', 'em_revisao', 'agendado', 'publicado', 'arquivado'],
  { message: 'Estado do artigo inválido' },
);

export const ArticleSlugSchema = z.string()
  .trim()
  .min(3, 'Slug deve ter pelo menos 3 caracteres')
  .max(80, 'Slug muito longo')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug só pode ter letras minúsculas, números e hífens');

export const ArticleTagsSchema = z.array(
  z.string().trim().min(2, 'Etiqueta muito curta').max(40, 'Etiqueta muito longa'),
).max(12, 'Máximo de 12 etiquetas');

export const ArticleEntityTypeSchema = z.enum(
  ['partner', 'event', 'council_member', 'document'],
  { message: 'Tipo de entidade inválido' },
);

/** Ligação artigo → entidade do negócio (sem id: é gerado pelo banco). */
export const ArticleEntityLinkInputSchema = z.object({
  entity_type: ArticleEntityTypeSchema,
  entity_id: z.string().uuid('entity_id deve ser um UUID válido'),
  label: optionalText(200, 'Rótulo muito longo'),
});

export type ArticleEntityLinkInput = z.infer<typeof ArticleEntityLinkInputSchema>;

// ---------------------------------------------------------------------------
// ARTIGO
// Objeto plano de propósito: `ArticleSchema.partial()` é o que valida os
// patches de updateArticle/autosaveArticle.
// `summary` aceita vazio porque um rascunho nasce sem resumo — a exigência de
// resumo para publicar vive em articlePublishBlockers(), não aqui.
// ---------------------------------------------------------------------------

export const ArticleSchema = z.object({
  slug: ArticleSlugSchema,
  title: z.string().trim().min(3, 'Título deve ter pelo menos 3 caracteres').max(200, 'Título muito longo'),
  summary: z.string().trim().max(500, 'Resumo muito longo (máx. 500 caracteres)'),
  body: ArticleBodySchema,
  cover_url: optionalSafeUrl('Imagem de capa deve ser uma URL HTTP/HTTPS válida'),
  cover_alt: optionalText(200, 'Texto alternativo da capa muito longo'),
  category_id: z.string().uuid('Categoria inválida').optional().nullable(),
  author_id: z.string().uuid('Autor inválido').optional().nullable(),
  tags: ArticleTagsSchema,
  status: ArticleStatusSchema,
  published_at: dateText.optional().nullable(),
  seo_title: optionalText(120, 'Título de SEO muito longo (máx. 120 caracteres)'),
  seo_description: optionalText(320, 'Descrição de SEO muito longa (máx. 320 caracteres)'),
  seo_image_url: optionalSafeUrl('Imagem de SEO deve ser uma URL HTTP/HTTPS válida'),
  reading_minutes: z.number().int().min(1, 'Tempo de leitura inválido').max(600, 'Tempo de leitura inválido').optional().nullable(),
  created_by: z.string().uuid('Autor da criação inválido').optional().nullable(),
});

export type ArticleInput = z.infer<typeof ArticleSchema>;

/** Patch parcial — usado em update e autosave. */
export const ArticlePatchSchema = ArticleSchema.partial();
export type ArticlePatchInput = z.infer<typeof ArticlePatchSchema>;

// ---------------------------------------------------------------------------
// TAXONOMIA
// ---------------------------------------------------------------------------

export const ArticleCategorySchema = z.object({
  slug: ArticleSlugSchema,
  name: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres').max(120, 'Nome muito longo'),
  description: optionalText(1000, 'Descrição muito longa'),
  order: z.number().int().min(0, 'Ordem não pode ser negativa'),
  active: z.boolean(),
});

export const ArticleAuthorSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres').max(120, 'Nome muito longo'),
  user_id: z.string().uuid('user_id deve ser um UUID válido').optional().nullable(),
  partner_id: z.string().uuid('partner_id deve ser um UUID válido').optional().nullable(),
  bio: optionalText(2000, 'Biografia muito longa'),
  avatar_url: optionalSafeUrl('Avatar deve ser uma URL HTTP/HTTPS válida'),
  active: z.boolean(),
});

export type ArticleCategoryInput = z.infer<typeof ArticleCategorySchema>;
export type ArticleAuthorInput = z.infer<typeof ArticleAuthorSchema>;

// ---------------------------------------------------------------------------
// UPLOAD DE IMAGEM
// O bucket `media` tem whitelist de mimes no servidor; aqui ficamos dentro
// dela (só imagens) para a validação do cliente nunca aceitar o que o
// servidor vai rejeitar.
// ---------------------------------------------------------------------------

export const ARTICLE_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
] as const;

export const MAX_ARTICLE_IMAGE_SIZE = 8 * 1024 * 1024; // 8MB

export const ArticleImageUploadSchema = z.instanceof(File)
  .refine(f => f.size <= MAX_ARTICLE_IMAGE_SIZE, { message: 'Imagem muito grande (máx. 8MB).' })
  .refine(f => (ARTICLE_IMAGE_MIME_TYPES as readonly string[]).includes(f.type), {
    message: 'Tipo de imagem não suportado. Use JPEG, PNG, WEBP, AVIF ou GIF.',
  });
