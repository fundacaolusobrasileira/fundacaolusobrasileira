// pages/artigos/ArticleBlocks.tsx
// Renderizador do corpo de um artigo.
//
// REGRA DE SEGURANÇA DESTE FICHEIRO (não a quebre):
// não existe — e não pode passar a existir — uma única ocorrência de
// `dangerouslySetInnerHTML` no projeto. O corpo do artigo é uma lista de
// blocos tipados (ver types/articles.ts) e cada bloco é renderizado como um
// elemento React com o texto como *filho*. O React escapa o texto, por isso
// conteúdo escrito no painel editorial não consegue injetar HTML nem scripts.
//
// Consequência prática: não há negrito/itálico "inline" vindo do conteúdo.
// É uma troca deliberada — formatação rica exigiria interpretar marcação, e
// isso é exatamente a superfície de ataque que estamos a evitar.

import React from 'react';
import type { ArticleBlock } from '../../types/articles';

// ---------------------------------------------------------------------------
// VÍDEO — validação de domínio
// ---------------------------------------------------------------------------
// A Content-Security-Policy do site permite iframes apenas de youtube,
// youtube-nocookie e vimeo. Qualquer outro domínio seria bloqueado pelo
// browser e resultaria numa caixa vazia, por isso validamos aqui e ignoramos
// o bloco em silêncio em vez de renderizar um iframe condenado.
const ALLOWED_VIDEO_HOSTS = [
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'vimeo.com',
  'www.vimeo.com',
  'player.vimeo.com',
];

/**
 * Devolve o URL de *embed* seguro para o vídeo, ou `null` se o domínio não
 * estiver na lista permitida (ou o URL não for sequer válido).
 */
export const toSafeEmbedUrl = (rawUrl: string): string | null => {
  if (!rawUrl) return null;

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null; // URL relativo ou malformado: não arriscamos.
  }

  if (parsed.protocol !== 'https:') return null;
  if (!ALLOWED_VIDEO_HOSTS.includes(parsed.hostname.toLowerCase())) return null;

  const host = parsed.hostname.toLowerCase();

  // youtu.be/ID
  if (host === 'youtu.be') {
    const id = parsed.pathname.replace(/^\/+/, '').split('/')[0];
    return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
  }

  // youtube.com/watch?v=ID  ou  youtube.com/embed/ID
  if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
    const v = parsed.searchParams.get('v');
    if (v) return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(v)}`;
    const match = parsed.pathname.match(/^\/embed\/([^/?#]+)/);
    if (match) return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(match[1])}`;
    return null;
  }

  // vimeo.com/ID  ou  player.vimeo.com/video/ID
  if (host.endsWith('vimeo.com')) {
    const match = parsed.pathname.match(/(?:^\/video\/|^\/)(\d+)/);
    return match ? `https://player.vimeo.com/video/${match[1]}` : null;
  }

  return null;
};

// ---------------------------------------------------------------------------
// Blocos
// ---------------------------------------------------------------------------

const BlockRenderer: React.FC<{ block: ArticleBlock }> = ({ block }) => {
  switch (block.type) {
    case 'paragraph':
      if (!block.text) return null;
      // whitespace-pre-line: preserva as quebras de linha escritas no painel,
      // tal como fazemos na descrição do evento.
      return (
        <p className="text-lg md:text-xl text-slate-600 font-light leading-relaxed whitespace-pre-line">
          {block.text}
        </p>
      );

    case 'heading':
      if (!block.text) return null;
      return block.level === 3 ? (
        <h3 className="text-xl md:text-2xl font-medium text-brand-900 tracking-tight pt-4">
          {block.text}
        </h3>
      ) : (
        <h2 className="text-2xl md:text-3xl font-serif text-brand-900 tracking-tight pt-6">
          {block.text}
        </h2>
      );

    case 'image':
      if (!block.url) return null;
      return (
        <figure className="my-4">
          <div className="overflow-hidden rounded-[2rem] bg-slate-100 border border-slate-100">
            <img
              src={block.url}
              alt={block.alt || block.caption || ''}
              loading="lazy"
              className="w-full h-auto object-cover"
            />
          </div>
          {block.caption && (
            <figcaption className="mt-3 text-xs text-slate-400 font-light tracking-wide">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );

    case 'quote':
      if (!block.text) return null;
      return (
        <blockquote className="my-4 border-l-2 border-sand-400 pl-6 md:pl-8">
          <p className="text-xl md:text-2xl font-serif italic text-brand-900 leading-relaxed">
            {block.text}
          </p>
          {block.cite && (
            <cite className="block mt-4 not-italic text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              {block.cite}
            </cite>
          )}
        </blockquote>
      );

    case 'list': {
      const items = (block.items || []).filter(Boolean);
      if (items.length === 0) return null;
      const itemClass = 'text-lg text-slate-600 font-light leading-relaxed';
      return block.ordered ? (
        <ol className="list-decimal pl-6 space-y-2 marker:text-sand-600">
          {items.map((item, idx) => (
            <li key={idx} className={itemClass}>{item}</li>
          ))}
        </ol>
      ) : (
        <ul className="list-disc pl-6 space-y-2 marker:text-sand-400">
          {items.map((item, idx) => (
            <li key={idx} className={itemClass}>{item}</li>
          ))}
        </ul>
      );
    }

    case 'video': {
      const embedUrl = toSafeEmbedUrl(block.url);
      // Domínio fora da CSP (ou URL inválido): ignoramos o bloco.
      if (!embedUrl) return null;
      return (
        <figure className="my-4">
          <div className="relative w-full overflow-hidden rounded-[2rem] bg-brand-900 aspect-video border border-slate-100">
            <iframe
              src={embedUrl}
              title={block.caption || 'Vídeo do artigo'}
              className="absolute inset-0 w-full h-full"
              loading="lazy"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          {block.caption && (
            <figcaption className="mt-3 text-xs text-slate-400 font-light tracking-wide">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );
    }

    case 'divider':
      return <hr className="my-6 border-0 h-px bg-slate-200" />;

    default:
      // Tipo desconhecido (corpo gravado por uma versão mais recente do painel):
      // não rebenta o ecrã, apenas não mostra nada.
      return null;
  }
};

export const ArticleBlocks: React.FC<{ blocks?: ArticleBlock[] | null; className?: string }> = ({
  blocks,
  className = '',
}) => {
  const list = Array.isArray(blocks) ? blocks : [];
  if (list.length === 0) return null;

  return (
    <div className={`space-y-6 ${className}`}>
      {list.map((block, idx) => (
        <BlockRenderer key={block?.id || `block-${idx}`} block={block} />
      ))}
    </div>
  );
};

export default ArticleBlocks;
