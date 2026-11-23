// tests/artigos.test.tsx
// Área Editorial: auxiliares puros + renderizador de blocos.
// O foco de segurança é `toSafeEmbedUrl`: o corpo do artigo é escrito por
// editores, e um iframe com domínio arbitrário seria uma porta aberta.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  slugifyArticle,
  estimateReadingMinutes,
  articlePublishBlockers,
  articleBlocksToText,
  type ArticleBlock,
} from '../types/articles';
import { ArticleBlocks, toSafeEmbedUrl } from '../pages/artigos/ArticleBlocks';

describe('slugifyArticle', () => {
  it('remove acentos e normaliza', () => {
    expect(slugifyArticle('Fundação Luso-Brasileira')).toBe('fundacao-luso-brasileira');
  });
  it('colapsa pontuação e apara hífens das pontas', () => {
    expect(slugifyArticle('  Portugal & Brasil: Investir!  ')).toBe('portugal-brasil-investir');
  });
  it('limita o comprimento', () => {
    expect(slugifyArticle('a'.repeat(200)).length).toBeLessThanOrEqual(80);
  });
});

describe('estimateReadingMinutes', () => {
  it('devolve no mínimo 1 minuto', () => {
    expect(estimateReadingMinutes([])).toBe(1);
  });
  it('conta ~200 palavras por minuto', () => {
    const blocks: ArticleBlock[] = [{ id: 'b1', type: 'paragraph', text: 'palavra '.repeat(600) }];
    expect(estimateReadingMinutes(blocks)).toBe(3);
  });
});

describe('articleBlocksToText', () => {
  it('junta texto de vários tipos de bloco', () => {
    const blocks: ArticleBlock[] = [
      { id: '1', type: 'heading', level: 2, text: 'Título' },
      { id: '2', type: 'paragraph', text: 'Corpo' },
      { id: '3', type: 'list', items: ['um', 'dois'] },
      { id: '4', type: 'divider' },
    ];
    const txt = articleBlocksToText(blocks);
    expect(txt).toContain('Título');
    expect(txt).toContain('um');
  });
});

describe('articlePublishBlockers', () => {
  it('lista tudo o que falta num artigo vazio', () => {
    const faltas = articlePublishBlockers({});
    expect(faltas).toContain('Título');
    expect(faltas).toContain('Resumo');
    expect(faltas).toContain('Imagem de capa');
    expect(faltas).toContain('Categoria');
  });

  it('devolve lista vazia quando está tudo preenchido', () => {
    expect(articlePublishBlockers({
      title: 'T', summary: 'R', cover_url: 'https://x/y.png', category_id: 'c1',
      seo_title: 'S', seo_description: 'D',
      body: [{ id: '1', type: 'paragraph', text: 'texto' }],
    })).toEqual([]);
  });
});

describe('toSafeEmbedUrl — whitelist de vídeo', () => {
  it('aceita YouTube e converte para embed', () => {
    const url = toSafeEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(url).toContain('youtube');
    expect(url).toContain('dQw4w9WgXcQ');
  });

  it('aceita Vimeo', () => {
    expect(toSafeEmbedUrl('https://vimeo.com/76979871')).toContain('vimeo');
  });

  it('RECUSA domínio arbitrário', () => {
    expect(toSafeEmbedUrl('https://evil.example.com/embed/x')).toBeNull();
  });

  it('RECUSA javascript:', () => {
    expect(toSafeEmbedUrl('javascript:alert(1)')).toBeNull();
  });

  it('RECUSA data:', () => {
    expect(toSafeEmbedUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
  });

  it('RECUSA lixo', () => {
    expect(toSafeEmbedUrl('nao-e-url')).toBeNull();
  });
});

describe('ArticleBlocks', () => {
  it('renderiza parágrafo, subtítulo, citação e lista', () => {
    const blocks: ArticleBlock[] = [
      { id: '1', type: 'heading', level: 2, text: 'Subtítulo' },
      { id: '2', type: 'paragraph', text: 'Um parágrafo.' },
      { id: '3', type: 'quote', text: 'Uma citação.', cite: 'Autor' },
      { id: '4', type: 'list', items: ['primeiro', 'segundo'] },
    ];
    render(<ArticleBlocks blocks={blocks} />);
    expect(screen.getByText('Subtítulo')).toBeTruthy();
    expect(screen.getByText('Um parágrafo.')).toBeTruthy();
    expect(screen.getByText('primeiro')).toBeTruthy();
  });

  it('não rebenta com lista de blocos vazia ou nula', () => {
    const { container } = render(<ArticleBlocks blocks={[]} />);
    expect(container).toBeTruthy();
    const b = render(<ArticleBlocks blocks={null} />);
    expect(b.container).toBeTruthy();
  });

  it('ignora bloco de vídeo com domínio não permitido', () => {
    const { container } = render(
      <ArticleBlocks blocks={[{ id: 'v', type: 'video', url: 'https://evil.example.com/x' }]} />
    );
    expect(container.querySelector('iframe')).toBeNull();
  });

  it('não injeta HTML a partir do texto do bloco', () => {
    const { container } = render(
      <ArticleBlocks blocks={[{ id: 'p', type: 'paragraph', text: '<img src=x onerror=alert(1)>' }]} />
    );
    // O texto tem de aparecer como TEXTO, nunca como elemento.
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('<img');
  });
});
