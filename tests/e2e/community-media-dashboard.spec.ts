import { test, expect } from '@playwright/test';
import { createE2ECleanupBag, e2eLabel } from './support/e2eCleanup';

const VALID_IMAGE_URL = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400';
const route = (path: string) => `/#${path}`;

test.use({
  video: 'on',
  screenshot: 'on',
  trace: 'on',
});

test.describe('curadoria de mídia no dashboard', () => {
  test.skip(!process.env.E2E_EDITOR_EMAIL, 'requires E2E_EDITOR_EMAIL env var');
  const cleanup = createE2ECleanupBag();

  test.afterEach(async () => {
    await cleanup.cleanup();
  });

  test('mídia aprovada aparece em publicadas no álbum', async ({ page }) => {
    const eventTitle = e2eLabel('Midia Dashboard');

    await page.goto(route('/login'));
    await page.getByLabel(/e-?mail/i).fill(process.env.E2E_EDITOR_EMAIL!);
    await page.getByLabel(/senha/i).fill(process.env.E2E_EDITOR_PASSWORD!);
    await page.getByRole('button', { name: /entrar|login/i }).click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 8000 });

    await page.goto(route('/eventos'));
    await page.getByRole('button', { name: /novo evento/i }).click();
    await page.getByLabel(/título/i).fill(eventTitle);
    await page.getByRole('button', { name: /salvar evento/i }).click();
    await expect(page.getByText(/evento criado|evento salvo/i)).toBeVisible({ timeout: 5000 });

    const firstEvent = page.locator('a[href*="#/eventos/"]').filter({ hasText: eventTitle }).first();
    const href = await firstEvent.getAttribute('href');
    const eventId = href?.split('/eventos/')[1] || '';
    expect(eventId).toBeTruthy();
    cleanup.trackEventId(eventId);

    await page.goto(route(`/eventos/${eventId}/colaborar`));
    await expect(page.getByText(/envio autenticado/i)).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /link url/i }).click();
    await page.getByLabel(/url.*mídia|link.*foto|url/i).fill(VALID_IMAGE_URL);
    await page.getByText(/concordo que esta midia pode ser utilizada/i).click();
    await page.getByRole('button', { name: /enviar|submeter/i }).click();
    await expect(page.getByRole('heading', { name: /memoria recebida/i })).toBeVisible({ timeout: 5000 });

    await page.goto(route(`/dashboard/eventos/${eventId}/midias`));
    await expect(page.getByRole('heading', { name: new RegExp(eventTitle, 'i') })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/pendentes/i)).toBeVisible();

    await page.getByRole('button', { name: /aprovar/i }).first().click();
    await expect(page.getByText(/mídia aprovada|midia aprovada/i)).toBeVisible({ timeout: 5000 });

    await expect(page.getByText(/o album ainda esta vazio/i)).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /publicadas no album/i })).toContainText(/\([1-9]\d*\)/);
    await expect(page.getByText(/^Comunidade$/).last()).toBeVisible({ timeout: 5000 });
  });
});
