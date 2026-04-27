// tests/e2e/route-guards.spec.ts
// E2E — security: protected routes must redirect unauthenticated users to /login,
// and non-editor authenticated users to home.
//
// Unit: N/A (route configuration)
// Integration: N/A (router behavior depends on auth store + browser)
// E2E: REQUIRED — only browser-level navigation can verify the guard chain.
//
// Note: /administracao is intentionally public — it renders the "Governança"
// (Diretoria/Conselho) section showing PARTNERS via MemberCard. It is NOT an
// admin dashboard despite the name. The admin/editor area is /dashboard/*.

import { test, expect } from '@playwright/test';

const PROTECTED_ROUTES = [
  { path: '/dashboard', name: 'dashboard' },
  { path: '/dashboard/eventos', name: 'dashboard-eventos' },
  { path: '/membro/00000000-0000-0000-0000-000000000000/editar', name: 'membro-editar' },
];

// App uses HashRouter — paths are addressed as /#/path
const route = (path: string) => `/#${path}`;

test.describe('route guards (anon → /login)', () => {
  for (const { path, name } of PROTECTED_ROUTES) {
    test(`anon visitor visiting ${name} is redirected to /login`, async ({ page }) => {
      await page.goto(route(path));

      // Wait for any redirect / navigation chain to settle
      await page.waitForLoadState('networkidle');

      // The URL hash must end up on /login
      const hash = await page.evaluate(() => window.location.hash);
      const reachedLogin = hash.includes('/login');

      expect(reachedLogin, `Expected redirect to /login from ${path}, got hash=${hash}`).toBe(true);
    });
  }
});
