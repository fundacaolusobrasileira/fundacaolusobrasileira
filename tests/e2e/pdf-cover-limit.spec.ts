import { test, expect } from '@playwright/test';

const route = (path: string) => `/#${path}`;

test.use({
  video: 'on',
  screenshot: 'on',
  trace: 'on',
});

test.describe('pdf: limite de imagem da capa', () => {
  test.skip(!process.env.E2E_EDITOR_EMAIL, 'requires E2E_EDITOR_EMAIL env var');

  test('editor vê o limite da capa e arquivo acima de 5MB é rejeitado', async ({ page }) => {
    await page.goto(route('/login'));
    await page.getByLabel(/e-?mail/i).fill(process.env.E2E_EDITOR_EMAIL!);
    await page.getByLabel(/senha/i).fill(process.env.E2E_EDITOR_PASSWORD!);
    await page.getByRole('button', { name: /entrar|login/i }).click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 8000 });

    await page.goto(route('/eventos'));
    await page.getByRole('button', { name: /novo evento/i }).click();
    await expect(page.getByRole('heading', { name: /novo evento/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/jpeg, png ou webp até 5mb\./i).first()).toBeVisible({ timeout: 5000 });

    await page.getByLabel(/upload imagem de capa do evento/i).setInputFiles({
      name: 'capa-grande.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.alloc(5 * 1024 * 1024 + 1, 1),
    });

    await expect(page.getByText(/arquivo muito grande.*5mb/i)).toBeVisible({ timeout: 5000 });
  });
});
