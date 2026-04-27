import { test, expect, type Page } from '@playwright/test';
import { createE2ECleanupBag, e2eLabel } from './support/e2eCleanup';

const route = (path: string) => `/#${path}`;

const loginAsEditor = async (page: Page) => {
  await page.goto(route('/login'));
  await page.getByLabel(/e-?mail/i).fill(process.env.E2E_EDITOR_EMAIL!);
  await page.getByLabel(/senha/i).fill(process.env.E2E_EDITOR_PASSWORD!);
  await page.getByRole('button', { name: /entrar|login/i }).click();
  await expect(page.getByRole('button', { name: /sair da conta/i })).toBeVisible({ timeout: 8000 });
  await page.goto(route('/dashboard'));
  await expect(page).toHaveURL(/dashboard/, { timeout: 8000 });
};

const openPreCadastros = async (page: Page) => {
  await page.goto(route('/dashboard'));
  await page.getByText(/pré-cadastros/i).click();
  await expect(page.getByText(/pré-registos/i)).toBeVisible({ timeout: 5000 });
};

const findSubmissionCard = (page: Page, email: string) =>
  page.getByText(email).locator('xpath=ancestor::div[contains(@class,"p-5")][1]');

test.use({
  video: 'on',
  screenshot: 'on',
  trace: 'on',
});

test.describe('pré-cadastro lifecycle', () => {
  test.skip(!process.env.E2E_EDITOR_EMAIL, 'requires E2E_EDITOR_EMAIL env var');

  const cleanup = createE2ECleanupBag();

  test.afterEach(async () => {
    await cleanup.cleanup();
  });

  test('editor marca contatado, aprova, rejeita e remove pré-cadastros', async ({ page }) => {
    const approvedName = e2eLabel('PreCadastro Aprovar');
    const rejectedName = e2eLabel('PreCadastro Rejeitar');
    const approvedEmail = `precadastro-aprovar-${Date.now()}@example.com`;
    const rejectedEmail = `precadastro-rejeitar-${Date.now()}@example.com`;
    cleanup.trackPreCadastroEmail(approvedEmail);
    cleanup.trackPreCadastroEmail(rejectedEmail);

    await page.goto(route('/precadastro'));
    await page.getByRole('button', { name: /membro associado/i }).click();
    await page.getByLabel(/nome/i).fill(approvedName);
    await page.getByLabel(/e-?mail/i).fill(approvedEmail);
    await page.getByLabel(/mensagem|motivo/i).fill('Fluxo E2E de aprovação');
    await page.getByRole('button', { name: /enviar registo|enviar|submeter|cadastrar/i }).click();
    await expect(page.getByRole('heading', { name: /registo enviado/i })).toBeVisible({ timeout: 8000 });
    await page.reload();

    await page.goto(route('/precadastro'));
    await page.getByRole('button', { name: /parceiro \/ empresa/i }).click();
    await page.getByLabel(/nome/i).fill(rejectedName);
    await page.getByLabel(/e-?mail/i).fill(rejectedEmail);
    await page.getByLabel(/mensagem|motivo/i).fill('Fluxo E2E de rejeição');
    await page.getByRole('button', { name: /enviar registo|enviar|submeter|cadastrar/i }).click();
    await expect(page.getByRole('heading', { name: /registo enviado/i })).toBeVisible({ timeout: 8000 });

    await loginAsEditor(page);
    await openPreCadastros(page);

    const approvedCard = findSubmissionCard(page, approvedEmail);
    await expect(approvedCard).toBeVisible({ timeout: 10000 });
    await approvedCard.getByRole('button', { name: /marcar contatado/i }).click();
    await expect(approvedCard.getByText(/contatado/i)).toBeVisible({ timeout: 5000 });
    await approvedCard.getByRole('button', { name: /^aprovar$/i }).click();
    await expect(approvedCard.getByText(/aprovado/i)).toBeVisible({ timeout: 5000 });

    const rejectedCard = findSubmissionCard(page, rejectedEmail);
    await expect(rejectedCard).toBeVisible({ timeout: 10000 });
    await rejectedCard.getByRole('button', { name: /^rejeitar$/i }).click();
    await expect(rejectedCard.getByText(/rejeitado/i)).toBeVisible({ timeout: 5000 });
    await rejectedCard.getByRole('button', { name: /eliminar/i }).click();
    await expect(page.getByText(rejectedEmail)).toHaveCount(0, { timeout: 5000 });
  });
});
