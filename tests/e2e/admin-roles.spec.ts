import { test, expect } from '@playwright/test';
import { createTempE2EUser, deleteTempE2EUser, type TempE2EUser } from './support/e2eUsers';

const route = (path: string) => `/#${path}`;
let tempEditorUser: TempE2EUser | null = null;

const login = async (page: import('@playwright/test').Page, email: string, password: string) => {
  await page.goto(route('/login'));
  await page.getByLabel(/e-?mail/i).fill(email);
  await page.getByLabel(/senha/i).fill(password);
  await page.getByRole('button', { name: /entrar|login/i }).click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 8000 });
};

test.beforeAll(async () => {
  tempEditorUser = await createTempE2EUser({
    name: 'Editor E2E Roles',
    role: 'editor',
  });
});

test.afterAll(async () => {
  if (tempEditorUser) {
    await deleteTempE2EUser(tempEditorUser.userId);
    tempEditorUser = null;
  }
});

test.describe('role boundaries', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, tempEditorUser!.email, tempEditorUser!.password);
  });

  test('editor vê dashboard como editor e não acessa gestão de utilizadores', async ({ page }) => {
    await page.goto(route('/dashboard'));

    await expect(page.getByText(/visão geral • editor/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /utilizadores/i })).toHaveCount(0);
  });

  test('editor consegue gerir pré-cadastros, mas não vê ação admin-only de criar conta', async ({ page }) => {
    await page.goto(route('/dashboard'));
    await page.getByText(/pré-cadastros/i).click();

    await expect(page.getByText(/pré-registos/i)).toBeVisible({ timeout: 5000 });
    const managerModal = page.getByRole('dialog').first();
    await expect(managerModal.getByRole('button', { name: /criar conta/i })).toHaveCount(0);
  });
});

test.describe('admin-only user management', () => {
  test.skip(!process.env.E2E_ADMIN_EMAIL, 'requires E2E_ADMIN_EMAIL env var');

  test.beforeEach(async ({ page }) => {
    await login(page, process.env.E2E_ADMIN_EMAIL!, process.env.E2E_ADMIN_PASSWORD!);
  });

  test('admin vê tudo que editor vê e também gestão de utilizadores', async ({ page }) => {
    await page.goto(route('/dashboard'));

    await expect(page.getByText(/visão geral • admin/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /^mídia/i })).toBeVisible();
    await expect(page.getByText(/pré-cadastros/i)).toBeVisible();
    await page.getByRole('button', { name: /utilizadores/i }).click();

    await expect(page.getByText(/gestão de utilizadores/i)).toBeVisible({ timeout: 5000 });
  });

  test('admin altera role de utilizador e faz rollback para editor', async ({ page }) => {
    await page.goto(route('/dashboard'));
    await page.getByRole('button', { name: /utilizadores/i }).click();
    await expect(page.getByText(/gestão de utilizadores/i)).toBeVisible({ timeout: 5000 });

    const userRow = page.getByRole('row').filter({ hasText: tempEditorUser!.email }).first();
    await expect(userRow).toBeVisible({ timeout: 10000 });

    const roleSelect = userRow.locator('select');
    await expect(roleSelect).toHaveValue('editor');

    await roleSelect.selectOption('membro');
    await expect(page.getByText(/permissão atualizada/i)).toBeVisible({ timeout: 5000 });
    await expect(roleSelect).toHaveValue('membro');

    await roleSelect.selectOption('editor');
    await expect(page.getByText(/permissão atualizada/i)).toBeVisible({ timeout: 5000 });
    await expect(roleSelect).toHaveValue('editor');
  });

  test('admin vincula e remove vínculo de utilizador com parceiro', async ({ page }) => {
    await page.goto(route('/dashboard'));
    await page.getByRole('button', { name: /utilizadores/i }).click();
    await expect(page.getByText(/gestão de utilizadores/i)).toBeVisible({ timeout: 5000 });

    const userRow = page.getByRole('row').filter({ hasText: tempEditorUser!.email }).first();
    await expect(userRow).toBeVisible({ timeout: 10000 });

    if (await userRow.getByText(/indisponível neste banco/i).count()) {
      await expect(page.getByText(/vínculo com membro indisponível neste banco/i)).toBeVisible();
      await expect(page.getByText(/profiles\.partner_id/i)).toBeVisible();
      return;
    }

    const removeLinkButton = userRow.getByTitle(/remover vínculo/i);
    if (await removeLinkButton.count()) {
      await removeLinkButton.click();
      await expect(page.getByText(/vínculo removido/i)).toBeVisible({ timeout: 5000 });
    }

    await userRow.getByRole('button', { name: /vincular/i }).click();
    const partnerOption = page.locator('ul li button').filter({ hasText: /\S/ }).first();
    const partnerName = (await partnerOption.textContent())?.trim() || '';
    await partnerOption.click();

    await expect(page.getByText(/membro vinculado/i)).toBeVisible({ timeout: 5000 });
    if (partnerName) {
      await expect(userRow.getByText(partnerName, { exact: false })).toBeVisible({ timeout: 5000 });
    }

    await userRow.getByTitle(/remover vínculo/i).click();
    await expect(page.getByText(/vínculo removido/i)).toBeVisible({ timeout: 5000 });
    await expect(userRow.getByRole('button', { name: /vincular/i })).toBeVisible({ timeout: 5000 });
  });
});
