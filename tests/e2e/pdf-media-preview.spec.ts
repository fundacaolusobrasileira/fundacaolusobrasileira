import { test, expect } from '@playwright/test';
import { createE2ECleanupBag, e2eLabel } from './support/e2eCleanup';

const route = (path: string) => `/#${path}`;
const imageUrl = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400';

test.use({
  video: 'on',
  screenshot: 'on',
  trace: 'on',
});

test.describe('pdf: mídia, prévia e localização pública', () => {
  test.skip(!process.env.E2E_EDITOR_EMAIL, 'requires E2E_EDITOR_EMAIL env var');
  const cleanup = createE2ECleanupBag();

  test.afterEach(async () => {
    await cleanup.cleanup();
  });

  test('adicionar URL na gestão de mídia abre modal com prévia e publica no evento', async ({ page }) => {
    const eventTitle = e2eLabel('URL Preview');

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

    const eventLink = page.locator('a[href*="#/eventos/"]').filter({ hasText: eventTitle }).first();
    const href = await eventLink.getAttribute('href');
    const eventId = href?.split('/eventos/')[1] || '';
    expect(eventId).toBeTruthy();
    cleanup.trackEventId(eventId);

    await page.goto(route('/dashboard'));
    await page.getByRole('button', { name: /^mídia/i }).click();
    const eventSelector = page.getByRole('button', { name: new RegExp(eventTitle, 'i') }).first();
    await eventSelector.click();
    await page.getByRole('button', { name: /adicionar url/i }).click();
    const urlDialog = page.getByRole('dialog');
    await expect(urlDialog.getByRole('heading', { name: /adicionar mídia por url/i })).toBeVisible({ timeout: 5000 });
    await urlDialog.getByLabel(/url da mídia para adicionar/i).fill(imageUrl);
    await expect(urlDialog.getByText(/prévia/i)).toBeVisible({ timeout: 5000 });
    await urlDialog.locator('button').filter({ hasText: /adicionar url/i }).last().click();

    await expect(page.getByText(/nenhuma mídia nesta categoria/i)).toHaveCount(0);

    await page.goto(route(`/eventos/${eventId}`));
    await expect(page.getByText(/acervo oficial/i)).toBeVisible({ timeout: 5000 });
    await expect(page.locator('img[src*="photo-1506905925346-21bda4d32df4"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('mídia aprovada aparece na galeria da comunidade da página pública do evento', async ({ page }) => {
    const eventTitle = e2eLabel('Community Preview');

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

    const eventLink = page.locator('a[href*="#/eventos/"]').filter({ hasText: eventTitle }).first();
    const href = await eventLink.getAttribute('href');
    const eventId = href?.split('/eventos/')[1] || '';
    expect(eventId).toBeTruthy();
    cleanup.trackEventId(eventId);

    await page.goto(route(`/eventos/${eventId}/colaborar`));
    await expect(page.getByText(/envio autenticado/i)).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /link url/i }).click();
    await page.getByLabel(/url da mídia/i).fill(imageUrl);
    await page.getByText(/concordo que esta midia pode ser utilizada/i).click();
    await page.getByRole('button', { name: /enviar|submeter/i }).click();
    await expect(page.getByRole('heading', { name: /memoria recebida/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/apos aprovacao, ele aparecera na galeria da comunidade deste evento/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /ver pagina do evento/i })).toBeVisible({ timeout: 5000 });

    await page.goto(route(`/dashboard/eventos/${eventId}/midias`));
    await expect(page.getByText(/curadoria:/i)).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /aprovar/i }).first().click();
    await expect(page.getByText(/mídia aprovada|midia aprovada/i)).toBeVisible({ timeout: 5000 });

    await page.goto(route(`/eventos/${eventId}`));
    await expect(page.getByRole('heading', { name: /galeria da comunidade/i })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('img[src*="photo-1506905925346-21bda4d32df4"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('utilizador autenticado não vê nome/email nem convite extra e vê loading durante upload', async ({ page }) => {
    const eventTitle = e2eLabel('Logged Upload');

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

    const eventLink = page.locator('a[href*="#/eventos/"]').filter({ hasText: eventTitle }).first();
    const href = await eventLink.getAttribute('href');
    const eventId = href?.split('/eventos/')[1] || '';
    expect(eventId).toBeTruthy();
    cleanup.trackEventId(eventId);

    await page.route('**/storage/v1/object/media/community/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ Key: 'community/e2e-upload.jpg' }),
      });
    });

    await page.goto(route(`/eventos/${eventId}/colaborar`));
    await expect(page.getByText(/envio autenticado/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByLabel(/nome/i)).toHaveCount(0);
    await expect(page.getByLabel(/^e-?mail$/i)).toHaveCount(0);
    await expect(page.getByText(/receber novidades/i)).toHaveCount(0);
    await expect(page.getByText(/solicitar convite para se tornar membro/i)).toHaveCount(0);

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: 'upload.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('small-jpg-content'),
    });

    await expect(page.getByText(/a carregar imagem ou vídeo para revisão/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/a carregar imagem ou vídeo para revisão/i)).toHaveCount(0, { timeout: 6000 });
  });

  test('gestão de mídia mostra fallback quando a prévia por URL está quebrada', async ({ page }) => {
    const eventTitle = e2eLabel('Broken Preview');

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

    const eventLink = page.locator('a[href*="#/eventos/"]').filter({ hasText: eventTitle }).first();
    const href = await eventLink.getAttribute('href');
    const eventId = href?.split('/eventos/')[1] || '';
    expect(eventId).toBeTruthy();
    cleanup.trackEventId(eventId);

    await page.goto(route('/dashboard'));
    await page.getByRole('button', { name: /^mídia/i }).click();
    await page.getByRole('button', { name: new RegExp(eventTitle, 'i') }).first().click();
    await page.getByRole('button', { name: /adicionar url/i }).click();
    const urlDialog = page.getByRole('dialog');
    await urlDialog.getByLabel(/url da mídia para adicionar/i).fill('https://example.com/nao-existe.jpg');
    await expect(urlDialog.getByText(/prévia indisponível/i)).toBeVisible({ timeout: 8000 });
    await expect(urlDialog.getByText(/link parece quebrado|imagem foi corrompida/i)).toBeVisible({ timeout: 5000 });
    await urlDialog.getByRole('button', { name: /adicionar url/i }).last().click();
    await expect(page.getByText(/prévia indisponível/i).first()).toBeVisible({ timeout: 5000 });
  });
});
