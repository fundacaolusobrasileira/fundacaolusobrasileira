// pages/artigos/ArtigoDetalhePage.tsx
// Página pública de um artigo (/artigos/:slug).

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { SectionWrapper, Card, Button, Badge, Reveal, PremiumLoader } from '../../components/ui';
import { ShareActions } from '../../component.ui';
import { EVENTS, PARTNERS, FLB_STATE_EVENT } from '../../store/app.store';
import { getArticleBySlug, getRelatedArticles } from '../../services/articles.service';
import { usePageMeta } from '../../hooks/usePageMeta';
import { ArticleBlocks } from './ArticleBlocks';
import { formatArticleDate } from './ArtigosPage';
import { Calendar, Clock, User, ArrowLeft, Link2 } from 'lucide-react';
import type { ArticleWithRelations, ArticleEntityLink } from '../../types/articles';

// ---------------------------------------------------------------------------
// "Mencionados neste artigo"
// ---------------------------------------------------------------------------
// O `label` guardado na ligação é um rótulo congelado: serve de recurso se a
// entidade já não existir no store. Quando existe, preferimos o nome atual.
const resolveEntity = (link: ArticleEntityLink): { to: string; label: string } | null => {
  switch (link.entity_type) {
    case 'partner': {
      const partner = PARTNERS.find(p => p.id === link.entity_id);
      return { to: `/parceiros/${link.entity_id}`, label: partner?.name || link.label || 'Parceiro' };
    }
    case 'event': {
      const event = EVENTS.find(e => e.id === link.entity_id);
      return { to: `/eventos/${link.entity_id}`, label: event?.title || link.label || 'Evento' };
    }
    case 'council_member': {
      // Os membros do conselho usam a mesma rota de perfil dos membros.
      const member = PARTNERS.find(p => p.id === link.entity_id);
      return { to: `/membro/${link.entity_id}`, label: member?.name || link.label || 'Membro' };
    }
    case 'document':
      return { to: '/documentacao', label: link.label || 'Documento institucional' };
    default:
      return null;
  }
};

const MentionedEntities: React.FC<{ entities: ArticleEntityLink[] }> = ({ entities }) => {
  const resolved = entities.map(resolveEntity).filter(Boolean) as { to: string; label: string }[];
  if (resolved.length === 0) return null;

  return (
    <section className="mt-20 pt-12 border-t border-slate-200">
      <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-8 flex items-center gap-3">
        <span className="w-8 h-px bg-sand-400"></span> Mencionados neste artigo
      </h2>
      <ul className="flex flex-wrap gap-3">
        {resolved.map(item => (
          <li key={`${item.to}-${item.label}`}>
            <Link
              to={item.to}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-white text-xs text-slate-600 hover:text-brand-900 hover:border-sand-400/60 hover:shadow-sm transition-all"
            >
              <Link2 size={12} aria-hidden="true" /> {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};

// ---------------------------------------------------------------------------
// JSON-LD
// ---------------------------------------------------------------------------
/**
 * Injeta o schema.org/Article no `document.head` e remove-o na limpeza.
 *
 * HONESTIDADE SOBRE O ALCANCE DISTO: este bloco só é visto por rastreadores
 * que executam JavaScript (o Googlebot executa). Os rastreadores de
 * pré-visualização do WhatsApp, do LinkedIn e do Facebook NÃO executam JS —
 * leem apenas o HTML estático servido pelo `index.html`. Enquanto o site usar
 * HashRouter (a rota vive depois do `#`, que nem chega ao servidor), a
 * pré-visualização social de qualquer artigo partilhado continuará a ser a da
 * homepage. A correção real exige SSR ou pré-renderização por rota — o mesmo
 * aviso que já está em hooks/usePageMeta.ts.
 */
const useArticleJsonLd = (article?: ArticleWithRelations) => {
  useEffect(() => {
    if (!article) return;

    const payload = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.seo_title || article.title,
      description: article.seo_description || article.summary || undefined,
      image: article.seo_image_url || article.cover_url || undefined,
      datePublished: article.published_at || undefined,
      dateModified: article.updated_at || article.published_at || undefined,
      author: article.author?.name
        ? { '@type': 'Person', name: article.author.name }
        : { '@type': 'Organization', name: 'Fundação Luso-Brasileira' },
      publisher: { '@type': 'Organization', name: 'Fundação Luso-Brasileira' },
      articleSection: article.category?.name || undefined,
      keywords: article.tags?.length ? article.tags.join(', ') : undefined,
      mainEntityOfPage: typeof window !== 'undefined' ? window.location.href : undefined,
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-flb-article-jsonld', article.slug);
    // textContent (não innerHTML) e JSON.stringify: o conteúdo nunca é
    // interpretado como HTML.
    script.textContent = JSON.stringify(payload);
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [article]);
};

// ---------------------------------------------------------------------------
// Cartão de artigo relacionado
// ---------------------------------------------------------------------------
const RelatedCard: React.FC<{ article: ArticleWithRelations }> = ({ article }) => (
  <Link to={`/artigos/${article.slug}`} className="group block h-full">
    <article className="h-full bg-white rounded-[2rem] overflow-hidden border border-slate-100/60 p-2 flex flex-col hover:shadow-premium transition-all duration-700">
      <div className="bg-slate-100 relative overflow-hidden rounded-[1.5rem] aspect-[16/10]">
        {article.cover_url && (
          <>
            <img
              src={article.cover_url} alt="" aria-hidden="true" loading="lazy"
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-40"
            />
            <img
              src={article.cover_url}
              alt={article.cover_alt || ''}
              loading="lazy"
              className="relative w-full h-full object-contain grayscale group-hover:grayscale-0 transition-all duration-1000"
            />
          </>
        )}
      </div>
      <div className="p-6 flex flex-col flex-grow">
        {article.category?.name && (
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-sand-600 mb-3">
            {article.category.name}
          </div>
        )}
        <h3 className="text-lg font-light text-brand-900 leading-snug flex-grow">{article.title}</h3>
        {article.published_at && (
          <div className="mt-5 pt-4 border-t border-slate-100 text-[11px] text-slate-400 font-light">
            {formatArticleDate(article.published_at)}
          </div>
        )}
      </div>
    </article>
  </Link>
);

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------
export const ArtigoDetalhePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [article, setArticle] = useState<ArticleWithRelations | undefined>(undefined);
  const [related, setRelated] = useState<ArticleWithRelations[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    window.scrollTo(0, 0);

    // `Promise.resolve` para tolerar serviço síncrono (store) ou assíncrono.
    const load = async () => {
      if (!slug) {
        if (active) { setArticle(undefined); setLoading(false); }
        return;
      }
      try {
        const found = await Promise.resolve(getArticleBySlug(slug));
        if (!active) return;
        setArticle(found || undefined);

        if (found) {
          try {
            const rel = await Promise.resolve(getRelatedArticles(found, 3));
            if (active) setRelated(Array.isArray(rel) ? rel : []);
          } catch {
            if (active) setRelated([]);
          }
        } else {
          setRelated([]);
        }
      } catch (err) {
        if (!active) return;
        if (import.meta.env.DEV) console.error(err);
        setArticle(undefined);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    window.addEventListener(FLB_STATE_EVENT, load);
    return () => {
      active = false;
      window.removeEventListener(FLB_STATE_EVENT, load);
    };
  }, [slug]);

  usePageMeta(
    article ? (article.seo_title || article.title) : 'Artigo não encontrado',
    article
      ? (article.seo_description || article.summary || undefined)
      : 'O artigo que procura não existe ou já não está disponível.'
  );

  useArticleJsonLd(article);

  if (loading) return <PremiumLoader />;

  // Slug inexistente (ou artigo despublicado): estado explícito, nunca ecrã branco.
  if (!article) {
    return (
      <main className="min-h-screen bg-page pt-32 pb-32 flex items-start justify-center">
        <Card className="p-12 text-center max-w-lg border border-slate-200">
          <h1 className="text-3xl font-light text-brand-900 mb-4">Artigo não encontrado</h1>
          <p className="text-slate-500 font-light mb-8">
            O artigo que procura não existe ou já não está disponível.
          </p>
          <Button onClick={() => navigate('/artigos')} className="gap-2">
            <ArrowLeft size={16} aria-hidden="true" /> Voltar aos artigos
          </Button>
        </Card>
      </main>
    );
  }

  const date = formatArticleDate(article.published_at);

  return (
    <main className="min-h-screen bg-page pt-32 pb-32 text-slate-900 selection:bg-sand-400 selection:text-brand-900">
      <SectionWrapper className="py-0">
        <div className="max-w-3xl mx-auto">
          <Link
            to="/artigos"
            className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-brand-900 transition-colors mb-10"
          >
            <ArrowLeft size={14} aria-hidden="true" /> Artigos
          </Link>

          {/* CABEÇALHO */}
          <header className="mb-12">
            {article.category?.name && (
              <Badge variant="gold" className="mb-6">{article.category.name}</Badge>
            )}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-brand-900 tracking-tighter leading-[1.05] mb-8">
              {article.title}
            </h1>
            {article.summary && (
              <p className="text-xl text-slate-500 font-light leading-relaxed font-serif mb-10">
                {article.summary}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-6 pt-8 border-t border-slate-200">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] font-light tracking-wide text-slate-400">
                {article.author?.name && (
                  <span className="inline-flex items-center gap-1.5">
                    <User size={11} aria-hidden="true" /> {article.author.name}
                  </span>
                )}
                {date && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar size={11} aria-hidden="true" /> {date}
                  </span>
                )}
                {article.reading_minutes && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock size={11} aria-hidden="true" /> {article.reading_minutes} min de leitura
                  </span>
                )}
              </div>
              <ShareActions title={article.title} url={window.location.href} />
            </div>
          </header>

          {/* CAPA */}
          {article.cover_url && (
            <figure className="mb-14">
              <div className="overflow-hidden rounded-[2.5rem] bg-slate-100 border border-slate-100">
                <img
                  src={article.cover_url}
                  alt={article.cover_alt || ''}
                  className="w-full h-auto object-cover"
                />
              </div>
              {article.cover_alt && (
                <figcaption className="mt-3 text-xs text-slate-400 font-light tracking-wide">
                  {article.cover_alt}
                </figcaption>
              )}
            </figure>
          )}

          {/* CORPO */}
          <ArticleBlocks blocks={article.body} />

          {/* ETIQUETAS */}
          {(article.tags?.length ?? 0) > 0 && (
            <div className="mt-16 flex flex-wrap gap-2">
              {article.tags.map(tag => (
                <span
                  key={tag}
                  className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-[11px] text-slate-500 font-light"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* MENCIONADOS */}
          {article.entities && article.entities.length > 0 && (
            <MentionedEntities entities={article.entities} />
          )}
        </div>

        {/* RELACIONADOS */}
        {related.length > 0 && (
          <section className="mt-24 pt-16 border-t border-slate-200">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-10 flex items-center gap-3">
              <span className="w-8 h-px bg-sand-400"></span> Continue a ler
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {related.map((item, idx) => (
                <Reveal key={item.id} className="h-full" delay={Math.min(idx, 3) * 80}>
                  <RelatedCard article={item} />
                </Reveal>
              ))}
            </div>
          </section>
        )}
      </SectionWrapper>
    </main>
  );
};

export default ArtigoDetalhePage;
