import { test, expect } from '@playwright/test';
import { createE2ECleanupBag, e2eLabel, findPartnerIdByName } from './support/e2eCleanup';

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

test.describe('pdf: editar membro', () => {
  test.skip(!process.env.E2E_EDITOR_EMAIL, 'requires E2E_EDITOR_EMAIL env var');
  const cleanup = createE2ECleanupBag();

  test.afterEach(async () => {
    await cleanup.cleanup();
  });

  test('editor cria membro, edita e vê alteração refletida no público', async ({ page }) => {
    const originalName = e2eLabel('Editar Membro');
    const updatedName = `${originalName} Atualizado`;
    const updatedBio = 'Biografia pública ajustada pelo fluxo E2E.';

    await loginAsEditor(page);
    await page.getByRole('button', { name: /^membro$/i }).click();
    await page.getByLabel(/nome completo/i).fill(originalName);
    await page.getByLabel(/tipo/i).selectOption('empresa');
    await page.getByLabel(/categoria/i).selectOption('Parceiro Silver');
    await page.getByLabel(/cargo \/ função/i).fill('Perfil Inicial');
    await page.getByLabel(/país/i).fill('Portugal');
    await page.getByRole('button', { name: /salvar membro/i }).click();

    await expect(page.getByText(/membro atualizado/i)).toBeVisible({ timeout: 5000 });
    const partnerId = await findPartnerIdByName(originalName);
    expect(partnerId).toBeTruthy();
    cleanup.trackPartnerId(partnerId);

    await page.getByRole('button', { name: /ver todos/i }).nth(1).click();
    await page.getByPlaceholder(/filtrar/i).fill(originalName);
    await page.getByRole('button', { name: new RegExp(`Editar ${originalName}`, 'i') }).click();

    await expect(page).toHaveURL(/\/membro\//, { timeout: 5000 });
    await expect(page.getByRole('heading', { name: /editar perfil/i })).toBeVisible({ timeout: 5000 });

    await page.locator("//label[contains(., 'Nome de Exibicao')]/following-sibling::input[1]").fill(updatedName);
    await page.locator("//label[contains(., 'Cargo / Funcao')]/following-sibling::input[1]").fill('Perfil Editado');
    await page.locator("//label[contains(., 'Bio (curta, para listagens)')]/following-sibling::textarea[1]").fill(updatedBio);
    await page.getByRole('button', { name: /alternar destaque do membro/i }).click();
    await page.getByRole('button', { name: /salvar alteracoes/i }).click();

    await expect(page.getByText(/membro atualizado/i)).toBeVisible({ timeout: 5000 });

    await page.goto(route('/parceiros'));
    await expect(page.getByText(/perfis em destaque/i)).toBeVisible({ timeout: 5000 });
    const updatedCard = page.getByLabel(`Parceiro: ${updatedName}`).first();
    await expect(updatedCard).toBeVisible({ timeout: 5000 });
    await expect(updatedCard).toContainText(updatedBio);
  });
});
