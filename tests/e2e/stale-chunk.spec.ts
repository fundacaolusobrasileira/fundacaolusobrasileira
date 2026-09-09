// tests/e2e/stale-chunk.spec.ts
// E2E — ChunkErrorBoundary (router.tsx) apos um deploy que invalidou assets antigos.
//
// A app usa HashRouter (App.tsx:125) — TODAS as rotas vivem depois de '#'.
// Usar page.goto('/dashboard') carregaria a home e nunca tocaria no boundary.
//
// Alvo escolhido: /#/quem-somos — rota lazy PUBLICA (router.tsx:77), logo o teste
// nao depende de sessao autenticada nem de .env.e2e para chegar ao boundary.
//
// Nomes de chunk: o Vite emite 'assets/QuemSomosPage-<hash>.js'. Filtrar por
// url.includes('chunk') nunca casa nada — por isso casamos pelo nome do modulo.
//
// Unit: N/A (comportamento de error boundary + carregamento de modulo real)

import { test, expect, type Page } from '@playwright/test';

/** Nome do modulo lazy que vamos derrubar (router.tsx:77). */
const TARGET_MODULE = 'QuemSomosPage';
const TARGET_ROUTE = '/#/quem-somos';

const isTargetChunk = (url: string) =>
  /\.js(\?.*)?$/.test(url) && url.includes(TARGET_MODULE);

/**
 * ChunkErrorBoundary.componentDidCatch faz UM reload automatico por sessao
 * (router.tsx:29-34) e so mostra a UI de recuperacao se 'chunk_reload' ja estiver
 * gasto. Pre-marcamos a flag para que a UI apareca de forma deterministica, sem
 * depender de um ciclo de reload. addInitScript re-aplica em cada navegacao.
 */
const spendChunkReloadBudget = (page: Page) =>
  page.addInitScript(() => {
    try { sessionStorage.setItem('chunk_reload', '1'); } catch { /* ignore */ }
  });

test.describe('stale chunk error boundary', () => {
  test('app carrega sem erros de JS num load limpo', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));

    await page.goto('/');
    await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });

    const critical = errors.filter(e =>
      !e.includes('ResizeObserver') &&
      !e.includes('Non-Error exception captured')
    );
    expect(critical).toHaveLength(0);
  });

  test('o chunk lazy alvo e realmente pedido em /#/quem-somos', async ({ page }) => {
    // Guarda-rail: se o Vite mudar o esquema de nomes, este teste falha e avisa
    // que os outros testes deixaram de estar a interceptar seja o que for.
    const jsRequests: string[] = [];
    page.on('request', r => {
      if (r.resourceType() === 'script' || /\.js(\?.*)?$/.test(r.url())) {
        jsRequests.push(r.url());
      }
    });

    await page.goto(TARGET_ROUTE);
    await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });

    expect(
      jsRequests.some(isTargetChunk),
      `Nenhum pedido casou "${TARGET_MODULE}". Pedidos JS: ${jsRequests.join(', ')}`
    ).toBe(true);
  });

  test('boundary mostra UI de recuperacao quando o chunk falha', async ({ page }) => {
    await spendChunkReloadBudget(page);

    // Simula asset removido por um deploy novo: o import dinamico rejeita com
    // "Failed to fetch dynamically imported module" -> isChunkLoadError (router.tsx:7).
    await page.route('**/*.js', route => {
      if (isTargetChunk(route.request().url())) return route.abort('failed');
      return route.continue();
    });

    await page.goto(TARGET_ROUTE);

    await expect(
      page.getByRole('heading', { name: 'Atualizacao disponivel' })
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole('button', { name: 'Recarregar pagina' })
    ).toBeVisible();
  });

  test('o botao "Recarregar pagina" recupera a app depois do deploy assentar', async ({ page }) => {
    await spendChunkReloadBudget(page);

    await page.route('**/*.js', route => {
      if (isTargetChunk(route.request().url())) return route.abort('failed');
      return route.continue();
    });

    await page.goto(TARGET_ROUTE);
    const reloadBtn = page.getByRole('button', { name: 'Recarregar pagina' });
    await expect(reloadBtn).toBeVisible({ timeout: 15_000 });

    // O "deploy" estabiliza: o asset volta a estar disponivel.
    await page.unroute('**/*.js');
    await reloadBtn.click();

    await expect(page.getByRole('main')).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole('heading', { name: 'Atualizacao disponivel' })
    ).toBeHidden();
  });

  test('cada rota publica carrega sem crash de console', async ({ page }) => {
    // URLs de hash — com HashRouter, '/eventos' serviria sempre a home.
    const publicRoutes = ['/#/', '/#/eventos', '/#/quem-somos', '/#/beneficios', '/#/parceiros'];
    const errors: Record<string, string[]> = {};

    for (const route of publicRoutes) {
      const pageErrors: string[] = [];
      const onError = (e: Error) => pageErrors.push(e.message);
      page.on('pageerror', onError);

      await page.goto(route);
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
      await page.waitForLoadState('networkidle').catch(() => {});

      const critical = pageErrors.filter(e =>
        !e.includes('ResizeObserver') &&
        !e.includes('Non-Error')
      );
      if (critical.length > 0) errors[route] = critical;

      page.off('pageerror', onError);
    }

    expect(errors).toEqual({});
  });
});
