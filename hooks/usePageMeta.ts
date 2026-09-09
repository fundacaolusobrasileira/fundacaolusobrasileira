import { useEffect } from 'react';

const setMeta = (selector: string, content: string) => {
  const el = document.head.querySelector(selector);
  if (el) el.setAttribute('content', content);
};

/**
 * Atualiza o title e as metas Open Graph no DOM ao mudar de rota.
 *
 * ATENCAO: isto NAO corrige a previa social. Os crawlers do WhatsApp,
 * LinkedIn, Facebook e X nao executam JavaScript — leem apenas o HTML
 * estatico servido pelo `index.html`, por isso continuam a ver sempre a
 * previa unica da home. Esta atualizacao so beneficia agentes que executam
 * JS (ex.: Googlebot) e o titulo no historico/separador do browser.
 * A correcao real exige SSR/pre-rendering por rota.
 */
export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    document.title = title;
    setMeta('meta[property="og:title"]', title);
    setMeta('meta[name="twitter:title"]', title);

    if (description) {
      setMeta('meta[name="description"]', description);
      setMeta('meta[property="og:description"]', description);
      setMeta('meta[name="twitter:description"]', description);
    }

    if (typeof window !== 'undefined' && window.location) {
      setMeta('meta[property="og:url"]', window.location.href);
    }

    window.scrollTo({ top: 0 });
  }, [title, description]);
}
