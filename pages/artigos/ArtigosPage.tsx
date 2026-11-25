// pages/artigos/ArtigosPage.tsx
// Listagem pública da Área Editorial (/artigos).

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SectionWrapper, Badge, Reveal, AsyncContent, PremiumLoader } from '../../components/ui';
import { FLB_STATE_EVENT } from '../../store/app.store';
import { getPublishedArticles } from '../../services/articles.service';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Calendar, Clock, User, ChevronLeft, ChevronRight, Newspaper } from 'lucide-react';
import type { ArticleWithRelations, ArticleCategory } from '../../types/articles';

const PAGE_SIZE = 12;
const ALL = '__todos__';

export const formatArticleDate = (value?: string | null): string => {
  if (!value) return '';
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });
};

const publishedTime = (a: ArticleWithRelations) => {
  const t = a.published_at ? new Date(a.published_at).getTime() : NaN;
  return isNaN(t) ? 0 : t;
};

/** Mais recente primeiro. */
const sortByRecent = (list: ArticleWithRelations[]) =>
  [...list].sort((a, b) => publishedTime(b) - publishedTime(a));

// ---------------------------------------------------------------------------
// Metadados (autor · data · tempo de leitura) — reutilizados no destaque e no
// cartão, para não divergirem.
// ---------------------------------------------------------------------------
const ArticleMeta: React.FC<{ article: ArticleWithRelations; tone?: 'light' | 'dark' }> = ({
  article,
  tone = 'light',
}) => {
  const base = tone === 'dark' ? 'text-white/50' : 'text-slate-400';
  const date = formatArticleDate(article.published_at);
  const minutes = article.reading_minutes || null;

  return (
    <div className={`flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-light tracking-wide ${base}`}>
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
      {minutes && (
        <span className="inline-flex items-center gap-1.5">
          <Clock size={11} aria-hidden="true" /> {minutes} min de leitura
        </span>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Destaque: o artigo publicado mais recente, em formato grande.
// ---------------------------------------------------------------------------
const FeaturedArticle: React.FC<{ article: ArticleWithRelations }> = ({ article }) => (
  <Reveal>
    <Link
      to={`/artigos/${article.slug}`}
      className="group block bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 p-2 hover:shadow-premium transition-all duration-700"
    >
      <div className="grid lg:grid-cols-2 gap-0">
        <div className="relative bg-slate-100 overflow-hidden rounded-[2rem] aspect-[16/11] lg:aspect-auto lg:min-h-[26rem]">
          {article.cover_url && (
            <>
              {/* Fundo desfocado: preenche a caixa quando a capa não tem a
                  proporção dela (ex.: cartaz 9:16). Decorativo. */}
              <img
                src={article.cover_url} alt="" aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-40"
              />
              {/* object-contain: a capa aparece SEMPRE inteira, nunca cortada. */}
              <img
                src={article.cover_url}
                alt={article.cover_alt || ''}
                className="absolute inset-0 w-full h-full object-contain grayscale-[20%] group-hover:grayscale-0 group-hover:scale-[1.02] transition-all duration-1000"
              />
            </>
          )}
          <Badge variant="light" className="absolute top-5 left-5 backdrop-blur-md bg-white/90">
            Em destaque
          </Badge>
        </div>

        <div className="p-8 md:p-12 lg:p-14 flex flex-col justify-center">
          {article.category?.name && (
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-sand-600 mb-5">
              {article.category.name}
            </div>
          )}
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-light text-brand-900 tracking-tight leading-[1.1] mb-6">
            {article.title}
          </h2>
          {article.summary && (
            <p className="text-lg text-slate-500 font-light leading-relaxed mb-8 line-clamp-4">
              {article.summary}
            </p>
          )}
          <ArticleMeta article={article} />
          <span className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-brand-900 group-hover:text-sand-600 transition-colors">
            Ler artigo →
          </span>
        </div>
      </div>
    </Link>
  </Reveal>
);

// ---------------------------------------------------------------------------
// Cartão da grelha
// ---------------------------------------------------------------------------
const ArticleCard: React.FC<{ article: ArticleWithRelations }> = ({ article }) => (
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
        {article.category?.name && (
          <Badge variant="light" className="absolute top-4 left-4 backdrop-blur-md bg-white/90">
            {article.category.name}
          </Badge>
        )}
      </div>

      <div className="p-6 flex flex-col flex-grow">
        <h3 className="text-xl font-light text-brand-900 leading-snug mb-3">{article.title}</h3>
        {article.summary && (
          <p className="text-slate-500 text-sm font-light leading-relaxed line-clamp-3 flex-grow">
            {article.summary}
          </p>
        )}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <ArticleMeta article={article} />
        </div>
      </div>
    </article>
  </Link>
);

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------
export const ArtigosPage = () => {
  usePageMeta(
    'Artigos – Fundação Luso-Brasileira',
    'Textos, entrevistas e análises publicados pela Fundação Luso-Brasileira.'
  );

  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState<ArticleWithRelations[]>([]);
  const [categorySlug, setCategorySlug] = useState<string>(ALL);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;

    // `getPublishedArticles()` pode ser síncrona (lê o array do store) ou
    // assíncrona (vai à base de dados). `Promise.resolve` trata os dois casos
    // sem ter de adivinhar a assinatura.
    const load = async () => {
      try {
        const data = await Promise.resolve(getPublishedArticles());
        if (!active) return;
        setArticles(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!active) return;
        if (import.meta.env.DEV) console.error(err);
        setArticles([]);
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
  }, []);

  // As categorias vêm dos próprios artigos publicados: evita mostrar filtros
  // que não devolvem nada e dispensa uma segunda leitura à base de dados.
  const categories: ArticleCategory[] = useMemo(() => {
    const byId = new Map<string, ArticleCategory>();
    articles.forEach(a => {
      if (a.category?.id && !byId.has(a.category.id)) byId.set(a.category.id, a.category);
    });
    return [...byId.values()].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name, 'pt')
    );
  }, [articles]);

  const filtered = useMemo(() => {
    const base = sortByRecent(articles);
    if (categorySlug === ALL) return base;
    return base.filter(a => a.category?.slug === categorySlug);
  }, [articles, categorySlug]);

  const featured = filtered[0];
  const rest = filtered.slice(1);

  // Paginação: o destaque fica sempre fora da contagem e só aparece na
  // primeira página; as restantes mostram 12 cartões cada.
  const totalPages = Math.max(1, Math.ceil(rest.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = rest.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleFilter = (slug: string) => {
    setCategorySlug(slug);
    setPage(1);
  };

  const goToPage = (next: number) => {
    setPage(Math.min(Math.max(1, next), totalPages));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main className="min-h-screen bg-page pt-32 pb-32 text-slate-900 selection:bg-sand-400 selection:text-brand-900">
      <SectionWrapper className="py-0">
        {/* CABEÇALHO */}
        <header className="max-w-3xl mb-16 md:mb-20">
          <Badge variant="gold" className="mb-6">Área Editorial</Badge>
          <h1 className="text-4xl md:text-6xl font-light text-brand-900 tracking-tighter leading-[1.05] mb-6">
            Artigos <span className="font-serif italic text-slate-300 pr-1">e Análises</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-500 font-light leading-relaxed">
            Textos, entrevistas e análises sobre a relação entre Portugal e o Brasil.
          </p>
        </header>

        <AsyncContent loading={loading} fallback={<PremiumLoader fullScreen={false} />}>
          {articles.length === 0 ? (
            // Estado vazio real: nada publicado ainda. Sem conteúdo inventado.
            <div className="text-center py-28 border border-dashed border-slate-200 rounded-[2.5rem] bg-white/60">
              <Newspaper className="mx-auto text-slate-300 mb-5" size={32} aria-hidden="true" />
              <div className="text-3xl text-slate-200 font-serif italic mb-3">Sem artigos</div>
              <p className="text-slate-400 font-light">
                Ainda não há artigos publicados nesta área.
              </p>
            </div>
          ) : (
            <>
              {/* FILTRO POR CATEGORIA */}
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-3 mb-14">
                  <button
                    type="button"
                    onClick={() => handleFilter(ALL)}
                    aria-pressed={categorySlug === ALL}
                    className={`px-7 py-3 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-500 ${
                      categorySlug === ALL
                        ? 'bg-brand-900 text-white shadow-lg scale-105'
                        : 'bg-white border border-slate-200 text-slate-400 hover:border-brand-900 hover:text-brand-900'
                    }`}
                  >
                    Todos
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleFilter(cat.slug)}
                      aria-pressed={categorySlug === cat.slug}
                      className={`px-7 py-3 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-500 ${
                        categorySlug === cat.slug
                          ? 'bg-brand-900 text-white shadow-lg scale-105'
                          : 'bg-white border border-slate-200 text-slate-400 hover:border-brand-900 hover:text-brand-900'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}

              {filtered.length === 0 ? (
                <div className="text-center py-28">
                  <div className="text-3xl text-slate-200 font-serif italic mb-3">Sem resultados</div>
                  <p className="text-slate-400 font-light">
                    Não há artigos publicados nesta categoria.
                  </p>
                </div>
              ) : (
                <div className="space-y-16">
                  {safePage === 1 && featured && <FeaturedArticle article={featured} />}

                  {pageItems.length > 0 && (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {pageItems.map((article, idx) => (
                        <Reveal key={article.id} className="h-full" delay={Math.min(idx, 5) * 60}>
                          <ArticleCard article={article} />
                        </Reveal>
                      ))}
                    </div>
                  )}

                  {/* PAGINAÇÃO */}
                  {totalPages > 1 && (
                    <nav
                      className="flex items-center justify-between gap-4 pt-6 border-t border-slate-200"
                      aria-label="Paginação dos artigos"
                    >
                      <button
                        type="button"
                        onClick={() => goToPage(safePage - 1)}
                        disabled={safePage <= 1}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] bg-white border border-slate-200 text-brand-900 transition-all hover:border-brand-900 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-slate-200"
                      >
                        <ChevronLeft size={14} aria-hidden="true" /> Anterior
                      </button>

                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                        Página {safePage} de {totalPages}
                      </span>

                      <button
                        type="button"
                        onClick={() => goToPage(safePage + 1)}
                        disabled={safePage >= totalPages}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] bg-white border border-slate-200 text-brand-900 transition-all hover:border-brand-900 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-slate-200"
                      >
                        Seguinte <ChevronRight size={14} aria-hidden="true" />
                      </button>
                    </nav>
                  )}
                </div>
              )}
            </>
          )}
        </AsyncContent>
      </SectionWrapper>
    </main>
  );
};

export default ArtigosPage;
