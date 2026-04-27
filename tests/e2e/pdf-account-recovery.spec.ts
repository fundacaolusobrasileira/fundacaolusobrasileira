import { test, expect } from '@playwright/test';

const route = (path: string) => `/#${path}`;

test.use({
  video: 'on',
  screenshot: 'on',
  trace: 'on',
});

test.describe('pdf: criação de conta e recuperação de senha', () => {
  test('fluxo de esqueci a senha envia recuperação sem submeter o login', async ({ page }) => {
    let recoverCalls = 0;

    await page.route('**/auth/v1/recover**', async (route) => {
      recoverCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });

    await page.goto(route('/login'));
    await page.getByRole('button', { name: /esqueci a senha/i }).click();
    await page.getByLabel(/e-mail para redefinição/i).fill('recuperacao@e2e.test');
    await page.getByRole('button', { name: /^enviar$/i }).click();

    await expect(page.getByText(/email enviado! verifique a sua caixa de entrada/i)).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/#\/login$/, { timeout: 5000 });
    await expect(page.getByRole('button', { name: /entrar no portal/i })).toBeVisible();
    expect(recoverCalls).toBe(1);
  });
});
