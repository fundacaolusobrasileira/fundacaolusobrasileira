import { test, expect } from '@playwright/test';
import { createE2ECleanupBag, e2eLabel } from './support/e2eCleanup';

const route = (path: string) => `/#${path}`;

const loginAsEditor = async (page: import('@playwright/test').Page) => {
  await page.goto(route('/login'));
  await page.getByLabel(/e-?mail/i).fill(process.env.E2E_EDITOR_EMAIL!);
  await page.getByLabel(/senha/i).fill(process.env.E2E_EDITOR_PASSWORD!);
  await page.getByRole('button', { name: /entrar|login/i }).click();
  await expect(page.getByRole('button', { name: /sair da conta/i })).toBeVisible({ timeout: 8000 });
  await page.goto(route('/dashboard'));
  await expect(page).toHaveURL(/dashboard/, { timeout: 8000 });
};

test.use({
  video: 'on',
  screenshot: 'on',
  trace: 'on',
});

test.describe('dashboard data separation', () => {
  test.skip(!process.env.E2E_EDITOR_EMAIL, 'requires E2E_EDITOR_EMAIL env var');
  const cleanup = createE2ECleanupBag();

  test.afterEach(async () => {
    await cleanup.cleanup();
  });

  test('newsletter não infla contador nem modal de pré-cadastros', async ({ page }) => {
    const preName = e2eLabel('PreCadastro Real');
    const preEmail = `pre-real-${Date.now()}@example.com`;
    const newsletterEmail = `newsletter-${Date.now()}@example.com`;
    cleanup.trackPreCadastroEmail(preEmail);
    cleanup.trackPreCadastroEmail(newsletterEmail);

    await page.goto(route('/'));
    await page.getByPlaceholder('seu@email.com').fill(newsletterEmail);
    await page.locator('footer').getByRole('button').click();
    await expect(page.getByText(/inscrito com sucesso/i)).toBeVisible({ timeout: 5000 });

    await page.goto(route('/precadastro'));
    await page.getByRole('button', { name: /membro associado/i }).click();
    await page.getByLabel(/nome/i).fill(preName);
    await page.getByLabel(/e-?mail/i).fill(preEmail);
    await page.getByLabel(/mensagem|motivo/i).fill('Pré-cadastro real para separar da newsletter');
    await page.getByRole('button', { name: /enviar registo|enviar|submeter|cadastrar/i }).click();
    await expect(page.getByRole('heading', { name: /registo enviado/i })).toBeVisible({ timeout: 8000 });

    await loginAsEditor(page);

    await expect(page.getByText(/^Pré-Cadastros$/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/subscritores newsletter/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(newsletterEmail)).toBeVisible({ timeout: 5000 });

    await page.getByText(/pré-cadastros/i).click();
    const managerModal = page.getByRole('dialog').first();
    await expect(managerModal.getByText(preEmail)).toBeVisible({ timeout: 10000 });
    await expect(managerModal.getByText(newsletterEmail)).toHaveCount(0);
  });

  test('newsletter pode ser pausada e retomada no dashboard', async ({ page }) => {
    const newsletterEmail = `newsletter-pause-${Date.now()}@example.com`;
    cleanup.trackPreCadastroEmail(newsletterEmail);

    await page.goto(route('/'));
    await page.getByPlaceholder('seu@email.com').fill(newsletterEmail);
    await page.locator('footer').getByRole('button').click();
    await expect(page.getByText(/inscrito com sucesso/i)).toBeVisible({ timeout: 5000 });

    await loginAsEditor(page);
    const rowFor = () => page.getByText(newsletterEmail).locator('xpath=ancestor::div[contains(@class,"group")][1]');
    await expect(rowFor()).toBeVisible({ timeout: 10000 });

    await rowFor().getByTitle(/pausar envio/i).click();
    await expect(rowFor().getByTitle(/retomar envio/i)).toBeVisible({ timeout: 5000 });
    await expect(rowFor().getByText(/pausado/i)).toBeVisible({ timeout: 5000 });

    await rowFor().getByTitle(/retomar envio/i).click();
    await expect(rowFor().getByTitle(/pausar envio/i)).toBeVisible({ timeout: 5000 });
    await expect(rowFor().getByText(/pausado/i)).toHaveCount(0);
  });

});
