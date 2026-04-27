import { test, expect } from '@playwright/test';
import { createE2ECleanupBag, e2eLabel } from './support/e2eCleanup';

const route = (path: string) => `/#${path}`;

test.use({
  video: 'on',
  screenshot: 'on',
  trace: 'on',
});

test.describe('governança pública e destaque', () => {
  test.skip(!process.env.E2E_EDITOR_EMAIL, 'requires E2E_EDITOR_EMAIL env var');
  const cleanup = createE2ECleanupBag();

  test.afterEach(async () => {
    await cleanup.cleanup();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(route('/login'));
    await page.getByLabel(/e-?mail/i).fill(process.env.E2E_EDITOR_EMAIL!);
    await page.getByLabel(/senha/i).fill(process.env.E2E_EDITOR_PASSWORD!);
    await page.getByRole('button', { name: /entrar|login/i }).click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 8000 });
  });

  test('modal de convite não reaparece para utilizador já autenticado', async ({ page }) => {
    await page.goto(route('/'));
    await page.evaluate(() => localStorage.removeItem('flb_invite_seen'));
    await page.reload();

    await page.waitForTimeout(16000);

    await expect(page.getByText(/junte-se à comunidade/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /entrar|login/i })).toHaveCount(0);
  });

  test('membro de governança sem cargo definido aparece na página pública de administração', async ({ page }) => {
    const memberName = e2eLabel('Governanca');

    await page.goto(route('/dashboard'));
    await page.getByRole('button', { name: /^membro$/i }).click();

    await page.getByLabel(/nome completo/i).fill(memberName);
    await page.getByLabel(/tipo/i).selectOption('pessoa');
    await page.getByLabel(/categoria/i).selectOption('Governança');
    await page.getByLabel(/país/i).fill('Portugal');
    await page.getByRole('button', { name: /salvar membro/i }).click();

    await expect(page.getByText(/membro atualizado/i)).toBeVisible({ timeout: 5000 });

    await page.goto(route('/administracao'));
    await expect(page.getByText(/perfis sem cargo definido/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(memberName)).toBeVisible({ timeout: 5000 });

    await page.goto(route('/dashboard'));
    await page.getByRole('button', { name: /ver todos/i }).nth(1).click();
    await page.getByPlaceholder(/filtrar/i).fill(memberName);
    await page.getByRole('button', { name: new RegExp(`Excluir ${memberName}`, 'i') }).click();
    await page.getByRole('button', { name: /excluir definitivamente/i }).click();
    await expect(page.getByText(/membro removido/i)).toBeVisible({ timeout: 5000 });
  });

  test('perfil em destaque ganha prioridade e selo visível em parceiros públicos', async ({ page }) => {
    const partnerName = e2eLabel('Destaque');

    await page.goto(route('/dashboard'));
    await page.getByRole('button', { name: /^membro$/i }).click();

    await page.getByLabel(/nome completo/i).fill(partnerName);
    await page.getByLabel(/tipo/i).selectOption('empresa');
    await page.getByLabel(/categoria/i).selectOption('Outro Apoio');
    await page.getByLabel(/cargo \/ função/i).fill('Parceiro em Destaque');
    await page.getByLabel(/país/i).fill('Brasil');
    await page.getByRole('button', { name: /alternar destaque do membro/i }).click();
    await page.getByRole('button', { name: /salvar membro/i }).click();

    await expect(page.getByText(/membro atualizado/i)).toBeVisible({ timeout: 5000 });

    await page.goto(route('/parceiros'));
    await expect(page.getByText(/perfis em destaque/i)).toBeVisible({ timeout: 5000 });
    const featuredCard = page.locator('a').filter({ hasText: partnerName }).first();
    await expect(featuredCard).toContainText(/destaque/i);

    await page.goto(route('/dashboard'));
    await page.getByRole('button', { name: /ver todos/i }).nth(1).click();
    await page.getByPlaceholder(/filtrar/i).fill(partnerName);
    await page.getByRole('button', { name: new RegExp(`Excluir ${partnerName}`, 'i') }).click();
    await page.getByRole('button', { name: /excluir definitivamente/i }).click();
    await expect(page.getByText(/membro removido/i)).toBeVisible({ timeout: 5000 });
  });
});
