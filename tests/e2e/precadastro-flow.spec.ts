// tests/e2e/precadastro-flow.spec.ts
// E2E — public submits pre-cadastro → editor processes it → partner benefits work

import { test, expect } from '@playwright/test';
import { createE2ECleanupBag, e2eLabel } from './support/e2eCleanup';

const route = (path: string) => `/#${path}`;

test.describe('pre-cadastro public submission', () => {
  const cleanup = createE2ECleanupBag();

  test.afterEach(async () => {
    await cleanup.cleanup();
  });

  test('público preenche formulário e recebe confirmação', async ({ page }) => {
    const submission = {
      name: e2eLabel('PreCadastro Publico'),
      email: `precadastro-e2e-${Date.now()}@example.com`,
      message: 'E2E test submission — automated',
    };
    cleanup.trackPreCadastroEmail(submission.email);

    await page.goto(route('/precadastro'));

    await page.getByRole('button', { name: /parceiro \/ empresa/i }).click();
    await page.getByLabel(/nome/i).fill(submission.name);
    await page.getByLabel(/e-?mail/i).fill(submission.email);
    await page.getByLabel(/mensagem|motivo/i).fill(submission.message);
    await page.getByRole('button', { name: /enviar registo|enviar|submeter|cadastrar/i }).click();

    await expect(page.getByRole('heading', { name: /registo enviado/i })).toBeVisible({ timeout: 8000 });
  });

  test('formulário rejeita e-mail inválido', async ({ page }) => {
    await page.goto(route('/precadastro'));

    await page.getByRole('button', { name: /membro associado/i }).click();
    await page.getByLabel(/nome/i).fill('Test User');
    const emailInput = page.getByLabel(/e-?mail/i);
    await emailInput.fill('not-an-email');
    await page.getByRole('button', { name: /enviar registo|enviar|submeter|cadastrar/i }).click();

    const typeMismatch = await emailInput.evaluate(el => (el as HTMLInputElement).validity.typeMismatch);
    expect(typeMismatch).toBe(true);
  });
});

test.describe('pre-cadastro editor flow', () => {
  test.skip(!process.env.E2E_EDITOR_EMAIL, 'requires E2E_EDITOR_EMAIL env var');
  const cleanup = createE2ECleanupBag();

  test.afterEach(async () => {
    await cleanup.cleanup();
  });

  test('editor processa pré-cadastro, converte em parceiro e cria benefício', async ({ page }) => {
    const submission = {
      name: e2eLabel('PreCadastro Editor'),
      email: `precadastro-e2e-${Date.now()}@example.com`,
      message: 'E2E test submission — automated',
    };
    const benefitTitle = e2eLabel('Beneficio');
    cleanup.trackPreCadastroEmail(submission.email);

    await page.goto(route('/precadastro'));
    await page.getByRole('button', { name: /parceiro \/ empresa/i }).click();
    await page.getByLabel(/nome/i).fill(submission.name);
    await page.getByLabel(/e-?mail/i).fill(submission.email);
    await page.getByLabel(/mensagem|motivo/i).fill(submission.message);
    await page.getByRole('button', { name: /enviar registo|enviar|submeter|cadastrar/i }).click();
    await expect(page.getByRole('heading', { name: /registo enviado/i })).toBeVisible({ timeout: 8000 });

    await page.goto(route('/login'));
    await page.getByLabel(/e-?mail/i).fill(process.env.E2E_EDITOR_EMAIL!);
    await page.getByLabel(/senha/i).fill(process.env.E2E_EDITOR_PASSWORD!);
    await page.getByRole('button', { name: /entrar|login/i }).click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 8000 });

    await page.goto(route('/dashboard'));
    await page.getByText(/pré-cadastros/i).click();
    await expect(page.getByText(/pré-registos/i)).toBeVisible({ timeout: 5000 });

    const submissionCard = page
      .getByText(submission.email)
      .locator('xpath=ancestor::div[contains(@class,"p-5")][1]');
    await expect(submissionCard).toBeVisible({ timeout: 10000 });

    await submissionCard.getByRole('button', { name: /marcar contatado/i }).click();
    await expect(submissionCard.getByText(/contatado/i)).toBeVisible({ timeout: 5000 });

    await submissionCard.getByRole('button', { name: /converter em parceiro|converter em membro/i }).click();
    await expect(page.getByText(/convertido em membro com sucesso/i)).toBeVisible({ timeout: 8000 });
    await expect(submissionCard.getByText(/convertido/i)).toBeVisible({ timeout: 5000 });
    await page.getByLabel(/fechar modal/i).click();

    await page.getByPlaceholder(/buscar/i).fill(submission.name);
    const memberResult = page.getByRole('button').filter({ hasText: submission.name }).first();
    await expect(memberResult).toBeVisible({ timeout: 5000 });
    await memberResult.click();

    await expect(page).toHaveURL(/membro\/.+\/editar/, { timeout: 8000 });
    await page.getByRole('button', { name: /benefícios/i }).click();
    await expect(page.getByText(/novo benefício/i)).toBeVisible({ timeout: 5000 });

    await page.getByPlaceholder(/ex: 10% de desconto/i).fill(benefitTitle);
    await page.getByRole('button', { name: /criar benefício/i }).click();

    await expect(page.getByText(/benefício criado/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(benefitTitle)).toBeVisible({ timeout: 5000 });
  });
});
