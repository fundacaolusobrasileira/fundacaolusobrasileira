import { test, expect } from '@playwright/test';

const route = (path: string) => `/#${path}`;

test.use({
  video: 'on',
  screenshot: 'on',
  trace: 'on',
});

test.describe('member edit routing', () => {
  test.skip(!process.env.E2E_EDITOR_EMAIL, 'requires E2E_EDITOR_EMAIL env var');

  test('editor com membro inexistente volta para o dashboard, não para a página pública de administração', async ({ page }) => {
    await page.goto(route('/login'));
    await page.getByLabel(/e-?mail/i).fill(process.env.E2E_EDITOR_EMAIL!);
    await page.getByLabel(/senha/i).fill(process.env.E2E_EDITOR_PASSWORD!);
    await page.getByRole('button', { name: /entrar|login/i }).click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 8000 });

    await page.goto(route('/membro/id-que-nao-existe/editar'));
    await expect(page.getByText(/membro nao encontrado/i)).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /^voltar$/i }).click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 5000 });
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 5000 });
  });
});
