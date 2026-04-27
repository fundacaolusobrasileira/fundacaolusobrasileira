// tests/e2e/smoke.spec.ts
// Phase 3.2 — smoke test: every public page loads without console errors.
//
// Unit: N/A
// Integration: N/A

import { test, expect } from '@playwright/test';

const PUBLIC_PAGES = [
  { path: '/',              name: 'home' },
  { path: '/eventos',       name: 'eventos' },
  { path: '/quem-somos',    name: 'quem-somos' },
  { path: '/beneficios',    name: 'beneficios' },
  { path: '/parceiros',     name: 'parceiros' },
  { path: '/login',         name: 'login' },
  { path: '/cadastro',      name: 'cadastro' },
];

for (const { path, name } of PUBLIC_PAGES) {
  test(`smoke: ${name} carrega sem erros de console`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));

    const response = await page.goto(path);
    await page.waitForLoadState('domcontentloaded');

    // Page responded with 2xx
    expect(response?.ok() ?? true).toBe(true);

    // Main content area renders
    await expect(page.getByRole('main')).toBeVisible({ timeout: 8000 });

    const critical = errors.filter(e =>
      !e.includes('ResizeObserver') &&
      !e.includes('Non-Error exception')
    );
    expect(critical).toHaveLength(0);
  });
}
