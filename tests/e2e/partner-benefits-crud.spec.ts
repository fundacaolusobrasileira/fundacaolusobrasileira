import { test, expect } from '@playwright/test';
import { createE2ECleanupBag, e2eLabel } from './support/e2eCleanup';

const route = (path: string) => `/#${path}`;

test.describe('partner and benefits CRUD (editor flow)', () => {
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

  test('editor cria parceiro, gere benefício e remove o parceiro', async ({ page }) => {
    const partnerName = e2eLabel('Partner');
    const benefitTitle = e2eLabel('Benefit');
    const updatedBenefitTitle = `${benefitTitle} Updated`;

    await page.goto(route('/dashboard'));
    await page.getByRole('button', { name: /^membro$/i }).click();

    await page.getByLabel(/nome completo/i).fill(partnerName);
    await page.getByLabel(/tipo/i).selectOption('empresa');
    await page.getByLabel(/categoria/i).selectOption('Parceiro Silver');
    await page.getByLabel(/cargo \/ função/i).fill('Empresa Parceira');
    await page.getByLabel(/país/i).fill('Portugal');
    await page.getByLabel(/website/i).fill('https://example.com/parceiro-e2e');
    await page.getByRole('button', { name: /salvar membro/i }).click();

    await expect(page.getByText(/membro atualizado/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 5000 });

    await page.getByRole('button', { name: /ver todos/i }).nth(1).click();
    await page.getByPlaceholder(/filtrar/i).fill(partnerName);
    await page.getByRole('button', { name: new RegExp(`Editar ${partnerName}`, 'i') }).click();

    await expect(page).toHaveURL(/\/membro\//, { timeout: 5000 });
    await expect(page.getByRole('heading', { name: /editar perfil/i })).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: /benefícios/i }).click();
    const newBenefitSection = page.locator('div').filter({ hasText: /novo benefício/i }).last();
    await newBenefitSection.getByPlaceholder(/ex: 10% de desconto/i).fill(benefitTitle);
    await newBenefitSection.getByPlaceholder(/breve descrição/i).fill('Benefício de teste automatizado');
    await newBenefitSection.getByPlaceholder('https://...').fill('https://example.com/benefit');
    await newBenefitSection.getByRole('button', { name: /criar benefício/i }).click();

    await expect(page.getByText(/benefício criado/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(benefitTitle)).toBeVisible({ timeout: 5000 });

    await page.goto(route('/beneficios'));
    await expect(page.getByText(partnerName)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(benefitTitle)).toBeVisible({ timeout: 5000 });

    await page.goto(route('/dashboard'));
    await page.getByRole('button', { name: /ver todos/i }).nth(1).click();
    await page.getByPlaceholder(/filtrar/i).fill(partnerName);
    await page.getByRole('button', { name: new RegExp(`Editar ${partnerName}`, 'i') }).click();
    await page.getByRole('button', { name: /benefícios/i }).click();

    const benefitCard = page.locator('div').filter({ hasText: benefitTitle }).first();
    await benefitCard.getByRole('button', { name: /editar/i }).click();
    const editingBenefitCard = page.locator('div').filter({ has: page.locator(`input[value="${benefitTitle}"]`) }).first();
    await editingBenefitCard.locator(`input[value="${benefitTitle}"]`).fill(updatedBenefitTitle);
    await page.getByRole('button', { name: /guardar/i }).click();

    await expect(page.getByText(/benefício guardado/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(updatedBenefitTitle)).toBeVisible({ timeout: 5000 });

    await page.goto(route('/beneficios'));
    await expect(page.getByText(updatedBenefitTitle)).toBeVisible({ timeout: 5000 });

    await page.goto(route('/dashboard'));
    await page.getByRole('button', { name: /ver todos/i }).nth(1).click();
    await page.getByPlaceholder(/filtrar/i).fill(partnerName);
    await page.getByRole('button', { name: new RegExp(`Editar ${partnerName}`, 'i') }).click();
    await page.getByRole('button', { name: /benefícios/i }).click();

    const updatedBenefitCard = page.locator('div').filter({ hasText: updatedBenefitTitle }).first();
    await updatedBenefitCard.getByTitle(/remover/i).click();
    await expect(page.getByText(/benefício removido/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(updatedBenefitTitle)).toHaveCount(0);

    await page.goto(route('/beneficios'));
    await expect(page.getByText(updatedBenefitTitle)).toHaveCount(0);

    await page.goto(route('/dashboard'));
    await page.getByRole('button', { name: /ver todos/i }).nth(1).click();
    await page.getByPlaceholder(/filtrar/i).fill(partnerName);
    await page.getByRole('button', { name: new RegExp(`Excluir ${partnerName}`, 'i') }).click();
    await page.getByRole('button', { name: /excluir definitivamente/i }).click();

    await expect(page.getByText(/membro removido/i)).toBeVisible({ timeout: 5000 });

    await page.getByPlaceholder(/filtrar/i).fill(partnerName);
    await expect(page.getByText(/nenhum item encontrado/i)).toBeVisible({ timeout: 5000 });
  });
});
