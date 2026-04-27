import { test, expect } from '@playwright/test';
import { installAdminCreateUserBypass } from './support/adminCreateUserBypass';
import { createE2ECleanupBag, e2eLabel, findPartnerIdByName } from './support/e2eCleanup';

const route = (path: string) => `/#${path}`;

const loginAsAdmin = async (page: import('@playwright/test').Page) => {
  await page.goto(route('/login'));
  await page.getByLabel(/e-?mail/i).fill(process.env.E2E_ADMIN_EMAIL!);
  await page.getByLabel(/senha/i).fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole('button', { name: /entrar|login/i }).click();
  await expect(page.getByRole('button', { name: /sair da conta/i })).toBeVisible({ timeout: 8000 });
  await page.goto(route('/dashboard'));
  if (!page.url().includes('/dashboard')) {
    await page.waitForTimeout(500);
    await page.goto(route('/dashboard'));
  }
  await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
};

test.use({
  video: 'on',
  screenshot: 'on',
  trace: 'on',
});

test.describe('pdf: pré-cadastro admin', () => {
  test.skip(!process.env.E2E_ADMIN_EMAIL, 'requires E2E_ADMIN_EMAIL env var');
  const cleanup = createE2ECleanupBag();

  test.afterEach(async () => {
    await cleanup.cleanup();
  });

  test('admin cria conta a partir do pré-registo e conecta a um perfil existente', async ({ page }) => {
    await installAdminCreateUserBypass(page, {
      onCreatedUserId: (userId) => cleanup.trackAuthUserId(userId),
    });

    const base = Date.now();
    const partnerName = e2eLabel('Conta Vinculada');
    const originalName = e2eLabel('Admin Pre');
    const email = `pdf-admin-${base}@example.com`;
    cleanup.trackPreCadastroEmail(email);

    await loginAsAdmin(page);
    await page.goto(route('/dashboard'));
    await page.getByRole('button', { name: /^membro$/i }).click();
    await page.getByLabel(/nome completo/i).fill(partnerName);
    await page.getByLabel(/tipo/i).selectOption('empresa');
    await page.getByLabel(/categoria/i).selectOption('Parceiro Silver');
    await page.getByLabel(/cargo \/ função/i).fill('Perfil para Vincular');
    await page.getByLabel(/país/i).fill('Portugal');
    await page.getByRole('button', { name: /salvar membro/i }).click();
    await expect(page.getByText(/membro atualizado/i)).toBeVisible({ timeout: 5000 });
    const partnerId = await findPartnerIdByName(partnerName);
    expect(partnerId).toBeTruthy();
    cleanup.trackPartnerId(partnerId);

    await page.goto(route('/precadastro'));
    await page.getByRole('button', { name: /membro associado/i }).click();
    await page.getByLabel(/nome/i).fill(originalName);
    await page.getByLabel(/e-?mail/i).fill(email);
    await page.getByLabel(/mensagem|motivo/i).fill('Mensagem original do PDF');
    await page.getByRole('button', { name: /enviar registo|enviar|submeter|cadastrar/i }).click();
    await expect(page.getByRole('heading', { name: /registo enviado/i })).toBeVisible({ timeout: 8000 });

    await page.goto(route('/dashboard'));
    await page.getByText(/pré-cadastros/i).click();
    await expect(page.getByText(/pré-registos/i)).toBeVisible({ timeout: 5000 });

    const submissionCard = page
      .getByText(email)
      .locator('xpath=ancestor::div[contains(@class,"p-5")][1]');
    await expect(submissionCard).toBeVisible({ timeout: 10000 });

    await submissionCard.getByRole('button', { name: /criar conta/i }).click();
    const accountHeading = page.getByText(/^Criar Conta$/).last();
    const accountDialog = accountHeading.locator('xpath=ancestor::*[@role="dialog"][1]');
    await expect(accountDialog.getByText(/converter pré-cadastro em utilizador/i)).toBeVisible({ timeout: 5000 });
    await accountDialog.getByRole('button', { name: /selecionar perfil/i }).click();
    await page.getByRole('button', { name: new RegExp(partnerName, 'i') }).click();
    await accountDialog.locator('button').filter({ hasText: /^Criar Conta$/ }).first().click();
    await expect(accountDialog).toHaveCount(0, { timeout: 10000 });
    await expect(submissionCard.getByText(/convertido/i)).toBeVisible({ timeout: 5000 });

    await page.getByLabel(/fechar modal/i).click();
    await page.getByRole('button', { name: /utilizadores/i }).click();
    await expect(page.getByText(/gestão de utilizadores/i)).toBeVisible({ timeout: 5000 });
    const userRow = page.getByRole('row').filter({ hasText: email }).first();
    await expect(userRow).toBeVisible({ timeout: 10000 });
    await expect(userRow.getByText(partnerName, { exact: false })).toBeVisible({ timeout: 5000 });
  });

  test('pré-registo convertido continua editável sem permitir alterar identidade ou estado manualmente', async ({ page }) => {
    await installAdminCreateUserBypass(page, {
      onCreatedUserId: (userId) => cleanup.trackAuthUserId(userId),
    });

    const base = Date.now();
    const partnerName = e2eLabel('Conta Edit Lock');
    const originalName = e2eLabel('Pre Lock');
    const email = `pdf-admin-lock-${base}@example.com`;
    cleanup.trackPreCadastroEmail(email);

    await loginAsAdmin(page);
    await page.goto(route('/dashboard'));
    await page.getByRole('button', { name: /^membro$/i }).click();
    await page.getByLabel(/nome completo/i).fill(partnerName);
    await page.getByLabel(/tipo/i).selectOption('empresa');
    await page.getByLabel(/categoria/i).selectOption('Parceiro Silver');
    await page.getByLabel(/cargo \/ função/i).fill('Perfil bloqueado');
    await page.getByLabel(/país/i).fill('Portugal');
    await page.getByRole('button', { name: /salvar membro/i }).click();
    await expect(page.getByText(/membro atualizado/i)).toBeVisible({ timeout: 5000 });
    const partnerId = await findPartnerIdByName(partnerName);
    expect(partnerId).toBeTruthy();
    cleanup.trackPartnerId(partnerId);

    await page.goto(route('/precadastro'));
    await page.getByRole('button', { name: /membro associado/i }).click();
    await page.getByLabel(/nome/i).fill(originalName);
    await page.getByLabel(/e-?mail/i).fill(email);
    await page.getByLabel(/mensagem|motivo/i).fill('Mensagem antes da conversão');
    await page.getByRole('button', { name: /enviar registo|enviar|submeter|cadastrar/i }).click();
    await expect(page.getByRole('heading', { name: /registo enviado/i })).toBeVisible({ timeout: 8000 });

    await page.goto(route('/dashboard'));
    await page.getByText(/pré-cadastros/i).click();
    await expect(page.getByText(/pré-registos/i)).toBeVisible({ timeout: 5000 });

    const submissionCard = page
      .getByText(email)
      .locator('xpath=ancestor::div[contains(@class,"p-5")][1]');
    await expect(submissionCard).toBeVisible({ timeout: 10000 });

    await submissionCard.getByRole('button', { name: /criar conta/i }).click();
    const accountHeading = page.getByText(/^Criar Conta$/).last();
    const accountDialog = accountHeading.locator('xpath=ancestor::*[@role="dialog"][1]');
    await accountDialog.getByRole('button', { name: /selecionar perfil/i }).click();
    await page.getByRole('button', { name: new RegExp(partnerName, 'i') }).click();
    await accountDialog.locator('button').filter({ hasText: /^Criar Conta$/ }).first().click();
    await expect(accountDialog).toHaveCount(0, { timeout: 10000 });
    await expect(submissionCard.getByText(/convertido/i)).toBeVisible({ timeout: 5000 });

    await submissionCard.getByRole('button', { name: /editar/i }).click();
    const editDialog = page.getByRole('dialog').filter({ has: page.getByText(/editar pré-registo/i) }).first();
    await expect(editDialog).toBeVisible({ timeout: 5000 });
    await expect(editDialog.getByLabel(/estado do pré-registo/i)).toHaveCount(0);
    await expect(editDialog.getByText(/altere o estado pelos botões de ação/i)).toBeVisible();
    await expect(editDialog.getByLabel(/nome do pré-registo/i)).toBeDisabled();
    await expect(editDialog.getByLabel(/e-mail do pré-registo/i)).toBeDisabled();
    await expect(editDialog.getByText(/já foi convertido/i)).toBeVisible();
    await editDialog.getByLabel(/mensagem do pré-registo/i).fill('Mensagem ajustada após conversão');
    await editDialog.getByRole('button', { name: /salvar alterações/i }).click();
    await expect(editDialog).toHaveCount(0, { timeout: 5000 });
    await expect(submissionCard.getByText(/convertido/i)).toBeVisible({ timeout: 5000 });
    await expect(submissionCard.getByText(/Mensagem ajustada após conversão/i)).toBeVisible({ timeout: 5000 });
  });

  test('admin consegue criar conta com permissão de admin a partir do pré-registo', async ({ page }) => {
    await installAdminCreateUserBypass(page, {
      onCreatedUserId: (userId) => cleanup.trackAuthUserId(userId),
    });

    const base = Date.now();
    const originalName = e2eLabel('Pre Admin Role');
    const email = `pdf-admin-role-${base}@example.com`;
    cleanup.trackPreCadastroEmail(email);

    await loginAsAdmin(page);
    await page.goto(route('/precadastro'));
    await page.getByRole('button', { name: /membro associado/i }).click();
    await page.getByLabel(/nome/i).fill(originalName);
    await page.getByLabel(/e-?mail/i).fill(email);
    await page.getByLabel(/mensagem|motivo/i).fill('Criar conta admin pelo dashboard');
    await page.getByRole('button', { name: /enviar registo|enviar|submeter|cadastrar/i }).click();
    await expect(page.getByRole('heading', { name: /registo enviado/i })).toBeVisible({ timeout: 8000 });

    await page.goto(route('/dashboard'));
    await page.getByText(/pré-cadastros/i).click();
    const submissionCard = page
      .getByText(email)
      .locator('xpath=ancestor::div[contains(@class,"p-5")][1]');
    await expect(submissionCard).toBeVisible({ timeout: 10000 });

    await submissionCard.getByRole('button', { name: /criar conta/i }).click();
    const accountHeading = page.getByText(/^Criar Conta$/).last();
    const accountDialog = accountHeading.locator('xpath=ancestor::*[@role="dialog"][1]');
    await accountDialog.getByRole('button', { name: /admin/i }).click();
    await accountDialog.locator('button').filter({ hasText: /^Criar Conta$/ }).first().click();
    await expect(accountDialog).toHaveCount(0, { timeout: 10000 });

    await page.getByLabel(/fechar modal/i).click();
    await page.getByRole('button', { name: /utilizadores/i }).click();
    const userRow = page.getByRole('row').filter({ hasText: email }).first();
    await expect(userRow).toBeVisible({ timeout: 10000 });
    await expect(userRow).toContainText(/admin/i, { timeout: 5000 });
  });
});
