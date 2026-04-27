import { test, expect } from '@playwright/test';

const route = (path: string) => `/#${path}`;

test.use({
  video: 'on',
  screenshot: 'on',
  trace: 'on',
});

test.describe('pdf: ajustes visuais principais', () => {
  test('benefícios exibem cards em sequência por parceiro', async ({ page }) => {
    await page.goto(route('/beneficios'));
    await expect(page.getByRole('heading', { name: /benefícios/i })).toBeVisible({ timeout: 8000 });
    const cards = page.locator('div.rounded-2xl.border').filter({ hasText: /saber mais/i });
    await expect(cards.first()).toBeVisible({ timeout: 8000 });
    if (await cards.count() > 1) {
      const firstBox = await cards.nth(0).boundingBox();
      const secondBox = await cards.nth(1).boundingBox();
      expect(firstBox).toBeTruthy();
      expect(secondBox).toBeTruthy();
      if (firstBox && secondBox) {
        expect(Math.abs(firstBox.y - secondBox.y)).toBeLessThan(80);
      }
    }
  });

  test('bloco do presidente na home carrega com conteúdo dinâmico do presidente atual', async ({ page }) => {
    await page.goto(route('/'));
    await expect(page.getByText(/presidência/i)).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/construindo pontes/i)).toBeVisible({ timeout: 8000 });
    await expect(page.locator('section').filter({ has: page.getByText(/presidência/i) }).locator('img').first()).toBeVisible({ timeout: 8000 });
  });

  test('bloco do presidente em quem somos carrega com conteúdo dinâmico do presidente atual', async ({ page }) => {
    await page.goto(route('/quem-somos'));
    await expect(page.getByText(/^Presidência$/)).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/construindo pontes/i)).toBeVisible({ timeout: 8000 });
    await expect(page.locator('section').filter({ has: page.getByText(/^Presidência$/) }).locator('img').first()).toBeVisible({ timeout: 8000 });
  });
});
