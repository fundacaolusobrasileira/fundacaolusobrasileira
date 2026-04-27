// tests/e2e/community-media.spec.ts
// E2E — Phase 3.1: visitor submits media → editor approves → appears in event gallery
//
// Unit: covered in services/community-media.service.test.ts (normalize)
// Integration: covered in services/community-media.service.test.ts + events.service.test.ts

import { test, expect } from '@playwright/test';

const VALID_IMAGE_URL = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400';
const route = (path: string) => `/#${path}`;

test.describe('community media submission (public form)', () => {
  test('visitante submete mídia e recebe confirmação', async ({ page }) => {
    await page.goto(route('/eventos'));
    await expect(page.getByRole('heading', { name: /agenda cultural/i })).toBeVisible();

    const firstEvent = page.locator('a[href*="#/eventos/"]').filter({ has: page.locator('h3') }).first();
    const hasEvent = await firstEvent.isVisible().catch(() => false);
    test.skip(!hasEvent, 'No published events available');

    await firstEvent.click();
    await page.getByRole('button', { name: /adicionar memoria/i }).first().click();

    await page.getByLabel(/nome/i).fill('E2E Visitor');
    await page.getByLabel(/^e-?mail$/i).fill('visitor@e2e.test');
    await page.getByLabel(/url.*mídia|link.*foto|url/i).fill(VALID_IMAGE_URL);
    await page.getByText(/concordo que esta midia pode ser utilizada/i).click();

    await page.getByRole('button', { name: /enviar|submeter/i }).click();

    await expect(page.getByRole('heading', { name: /memoria recebida/i })).toBeVisible({ timeout: 5000 });
  });

  test('URL inválida no formulário mostra erro sem submeter', async ({ page }) => {
    await page.goto(route('/eventos'));
    await expect(page.getByRole('heading', { name: /agenda cultural/i })).toBeVisible();

    const firstEvent = page.locator('a[href*="#/eventos/"]').filter({ has: page.locator('h3') }).first();
    test.skip(!await firstEvent.isVisible().catch(() => false), 'No published events available');

    await firstEvent.click();
    await page.getByRole('button', { name: /adicionar memoria/i }).first().click();
    await page.getByLabel(/nome/i).fill('E2E Visitor');
    await page.getByLabel(/^e-?mail$/i).fill('visitor@e2e.test');
    await page.getByLabel(/url.*mídia|link.*foto|url/i).fill('javascript:alert(1)');
    await page.getByText(/concordo que esta midia pode ser utilizada/i).click();
    await page.getByRole('button', { name: /enviar|submeter/i }).click();

    await expect(page.getByText(/inválid/i)).toBeVisible({ timeout: 3000 });
  });

  // BUG 5 FIX: schema now aligned with storage RLS — PDF, GIF, SVG, MOV, WEBM
  // are all accepted. Test rejection of a genuinely unsupported MIME instead.
  test('upload de tipo não suportado (zip) é rejeitado no formulário público', async ({ page }) => {
    await page.goto(route('/eventos'));
    await expect(page.getByRole('heading', { name: /agenda cultural/i })).toBeVisible();

    const firstEvent = page.locator('a[href*="#/eventos/"]').filter({ has: page.locator('h3') }).first();
    test.skip(!await firstEvent.isVisible().catch(() => false), 'No published events available');

    await firstEvent.click();
    await page.getByRole('button', { name: /adicionar memoria/i }).first().click();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'archive.zip',
      mimeType: 'application/zip',
      buffer: Buffer.from('fake-zip'),
    });

    await expect(page.getByText(/não suportado|documentos não são aceitos/i)).toBeVisible({ timeout: 5000 });
  });

  // BUG 5 FIX: file > 5MB must be rejected client-side (no storage call).
  test('upload de ficheiro > 5MB é rejeitado client-side (sem chamada ao storage)', async ({ page }) => {
    await page.goto(route('/eventos'));
    await expect(page.getByRole('heading', { name: /agenda cultural/i })).toBeVisible();

    const firstEvent = page.locator('a[href*="#/eventos/"]').filter({ has: page.locator('h3') }).first();
    test.skip(!await firstEvent.isVisible().catch(() => false), 'No published events available');

    await firstEvent.click();
    await page.getByRole('button', { name: /adicionar memoria/i }).first().click();

    // Intercept storage requests so we can assert NO upload was made
    const storageCalls: string[] = [];
    page.on('request', req => {
      if (req.url().includes('/storage/v1/object/')) storageCalls.push(req.url());
    });

    const fileInput = page.locator('input[type="file"]');
    // 6MB buffer — exceeds the 5MB schema limit
    const oversizedBuffer = Buffer.alloc(6 * 1024 * 1024, 'x');
    await fileInput.setInputFiles({
      name: 'huge.jpg',
      mimeType: 'image/jpeg',
      buffer: oversizedBuffer,
    });

    await expect(page.getByText(/5\s?MB|muito grande|tamanho/i)).toBeVisible({ timeout: 5000 });
    expect(storageCalls).toHaveLength(0);
  });
});

test.describe('community media approval (editor flow)', () => {
  test.skip(!process.env.E2E_EDITOR_EMAIL, 'requires E2E_EDITOR_EMAIL env var');

  test.beforeEach(async ({ page }) => {
    await page.goto(route('/login'));
    await page.getByLabel(/e-?mail/i).fill(process.env.E2E_EDITOR_EMAIL!);
    await page.getByLabel(/senha/i).fill(process.env.E2E_EDITOR_PASSWORD!);
    await page.getByRole('button', { name: /entrar|login/i }).click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 8000 });
  });

  test('editor vê submissões pendentes e pode aprovar', async ({ page }) => {
    await page.goto(route('/dashboard'));
    await page.getByRole('button', { name: /^mídia/i }).click();
    const eventButtons = page.locator('[role="list"] > button');
    const totalEvents = await eventButtons.count();

    let foundPending = false;
    for (let i = 0; i < totalEvents; i += 1) {
      await eventButtons.nth(i).click();
      await page.getByRole('button', { name: /pendentes/i }).click();
      const hasPending = await page.getByAltText(/mídia pendente/i).first().isVisible().catch(() => false);
      if (hasPending) {
        foundPending = true;
        break;
      }
    }

    test.skip(!foundPending, 'No pending submissions — submit one as a visitor first');

    await page.getByRole('button', { name: /aprovar/i }).first().click({ force: true });
    await expect(page.getByText(/aprovad|sucesso/i)).toBeVisible({ timeout: 5000 });
  });
});
