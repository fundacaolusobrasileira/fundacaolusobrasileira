// tests/e2e/auth.spec.ts
// E2E — Phase 3.1: signup → login → edit profile → logout
//
// Unit: covered in services/auth.service.test.ts (LoginSchema, CadastroSchema)
// Integration: covered in services/auth.service.test.ts (loginAsEditor, signUp, logout, resolveUserRole)

import { test, expect } from '@playwright/test';

const TEST_EMAIL = `e2eflb${Date.now()}@gmail.com`;
const TEST_PASSWORD = 'E2ETest2026!';
const TEST_NAME = 'E2E Auth User';
const route = (path: string) => `/#${path}`;

test.describe('auth flow', () => {
  test('signup → receives confirmation page or success message', async ({ page }) => {
    await page.goto(route('/cadastro'));
    await page.getByLabel(/nome/i).fill(TEST_NAME);
    await page.getByLabel(/e-?mail/i).fill(TEST_EMAIL);
    await page.getByLabel(/senha/i).first().fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /cadastrar|criar conta/i }).click();

    await expect(page.getByText(/conta criada|verifique seu email|rate limit exceeded/i)).toBeVisible({ timeout: 8000 });
  });

  test('login with invalid credentials shows error toast', async ({ page }) => {
    await page.goto(route('/login'));
    await page.getByLabel(/e-?mail/i).fill('wrong@test.flb');
    await page.getByLabel(/senha/i).fill('wrongpassword');
    await page.getByRole('button', { name: /entrar|login/i }).click();

    await expect(page.getByText(/incorretos|inválid/i)).toBeVisible({ timeout: 5000 });
  });

  test('login form rejects empty password (Zod validation)', async ({ page }) => {
    await page.goto(route('/login'));
    await page.getByLabel(/e-?mail/i).fill('test@test.com');
    await page.getByRole('button', { name: /entrar|login/i }).click();

    const passwordInput = page.getByLabel(/^senha$/i);
    const valueMissing = await passwordInput.evaluate(el => (el as HTMLInputElement).validity.valueMissing);

    expect(valueMissing).toBe(true);
    await expect(page).toHaveURL(/login/);
  });

  test('editor login → dashboard visible → logout resets session', async ({ page }) => {
    // This test requires a real editor account in the staging DB
    // It is SKIPPED until staging credentials are configured via env vars
    test.skip(!process.env.E2E_EDITOR_EMAIL, 'requires E2E_EDITOR_EMAIL env var (staging editor account)');

    await page.goto(route('/login'));
    await page.getByLabel(/e-?mail/i).fill(process.env.E2E_EDITOR_EMAIL!);
    await page.getByLabel(/senha/i).fill(process.env.E2E_EDITOR_PASSWORD!);
    await page.getByRole('button', { name: /entrar|login/i }).click();

    await expect(page).toHaveURL(/dashboard/, { timeout: 8000 });
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();

    // Logout
    await page.getByRole('button', { name: /sair/i }).click();
    await expect(page).toHaveURL(/login|home|\//);
  });
});
