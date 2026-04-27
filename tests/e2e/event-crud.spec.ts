// tests/e2e/event-crud.spec.ts
// E2E — Phase 3.1: editor creates event → adds gallery → publishes → visitor sees it
//
// Unit: covered in services/events.service.test.ts (normalizeEvent, EVENT_DB_COLUMNS)
// Integration: covered in services/events.service.test.ts (createEvent, updateEvent, deleteEvent)

import { test, expect } from '@playwright/test';
import { createE2ECleanupBag, e2eLabel, findEventIdByTitle } from './support/e2eCleanup';

const route = (path: string) => `/#${path}`;

test.describe('event CRUD (editor flow)', () => {
  test.skip(!process.env.E2E_EDITOR_EMAIL, 'requires E2E_EDITOR_EMAIL env var (staging editor account)');
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

  test('editor creates a draft event', async ({ page }) => {
    const title = e2eLabel('Draft Event');

    await page.goto(route('/dashboard'));
    await page.getByRole('button', { name: /^evento$/i }).click();

    await page.getByLabel(/título/i).fill(title);
    await page.getByLabel(/categoria/i).selectOption('Outros');
    await page.getByRole('button', { name: /salvar evento|salvar/i }).click();

    await expect(page.getByText(title).first()).toBeVisible({ timeout: 5000 });
    const eventId = await findEventIdByTitle(title);
    if (eventId) cleanup.trackEventId(eventId);
  });

  test('editor publishes event and visitor can see it on /eventos', async ({ page }) => {
    const title = e2eLabel('Published Event');

    await page.goto(route('/dashboard'));
    await page.getByRole('button', { name: /^evento$/i }).click();
    await page.getByLabel(/título/i).fill(title);
    await page.getByLabel(/categoria/i).selectOption('Outros');
    await page.getByLabel(/publicar evento/i).click();
    await page.getByRole('button', { name: /salvar evento|salvar/i }).click();

    await expect(page.getByText(title).first()).toBeVisible({ timeout: 5000 });
    const eventId = await findEventIdByTitle(title);
    if (eventId) cleanup.trackEventId(eventId);

    await page.goto(route('/eventos'));
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 5000 });
  });

  test('URL inválida em galeria mostra toast de erro', async ({ page }) => {
    const title = e2eLabel('URL Test');

    await page.goto(route('/dashboard'));
    await page.getByRole('button', { name: /^evento$/i }).click();
    await page.getByLabel(/título/i).fill(title);
    await page.getByLabel(/url da galeria/i).fill('javascript:alert(1)');
    await page.getByRole('button', { name: /adicionar url à galeria/i }).click();

    await expect(page.getByText(/inválid/i)).toBeVisible({ timeout: 3000 });
  });

  test('editor deletes event and it disappears from dashboard', async ({ page }) => {
    const title = e2eLabel('Delete Me');

    await page.goto(route('/dashboard'));
    await page.getByRole('button', { name: /^evento$/i }).click();
    await page.getByLabel(/título/i).fill(title);
    await page.getByLabel(/publicar evento/i).click();
    await page.getByRole('button', { name: /salvar evento|salvar/i }).click();

    await expect(page.getByText(title).first()).toBeVisible({ timeout: 5000 });

    await page.goto(route('/eventos'));
    await page.getByRole('link', { name: new RegExp(title, 'i') }).click();
    await page.getByRole('button', { name: /excluir/i }).click();
    await page.getByRole('button', { name: /excluir definitivamente/i }).click();

    await expect(page).toHaveURL(/eventos$/);
    await expect(page.getByText(title).first()).not.toBeVisible({ timeout: 5000 });
  });
});

test.describe('events public page (visitor)', () => {
  test('página /eventos carrega sem erro', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(route('/eventos'));
    await expect(page.getByRole('main')).toBeVisible();
    expect(errors.filter(e => !e.includes('ResizeObserver'))).toHaveLength(0);
  });
});
