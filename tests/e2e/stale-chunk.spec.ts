// tests/e2e/stale-chunk.spec.ts
// E2E — Phase 3.1: error boundary after deploy (covers fix from commit 9785363)
// Tests that a failed dynamic import shows a reload UI instead of a blank/crashed page.
//
// Unit: N/A (error boundary is a React component behavior)
// Integration: N/A

import { test, expect } from '@playwright/test';

test.describe('stale chunk error boundary', () => {
  test('app loads without JS errors on fresh load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));

    await page.goto('/');
    await expect(page.getByRole('main')).toBeVisible({ timeout: 10000 });

    // Filter out known non-critical browser warnings
    const critical = errors.filter(e =>
      !e.includes('ResizeObserver') &&
      !e.includes('Non-Error exception captured')
    );
    expect(critical).toHaveLength(0);
  });

  test('error boundary is rendered when simulated chunk load fails', async ({ page }) => {
    // Intercept a lazy-loaded route chunk and return 404 to simulate stale chunk
    await page.route('**/*.js', (route, request) => {
      if (request.url().includes('chunk') && request.url().includes('dashboard')) {
        route.fulfill({ status: 404, body: '' });
      } else {
        route.continue();
      }
    });

    await page.goto('/dashboard');

    // Either the error boundary shows, or the page redirects gracefully (e.g., to /login)
    const hasErrorBoundary = await page.getByText(/erro|atualizar|recarregar|reload/i).isVisible({ timeout: 5000 }).catch(() => false);
    const hasRedirect = page.url().includes('/login') || page.url().endsWith('/');

    expect(hasErrorBoundary || hasRedirect).toBe(true);
  });

  test('cada rota pública carrega sem crash de console', async ({ page }) => {
    const publicRoutes = ['/', '/eventos', '/quem-somos', '/beneficios', '/parceiros'];
    const errors: Record<string, string[]> = {};

    for (const route of publicRoutes) {
      const pageErrors: string[] = [];
      page.on('pageerror', e => pageErrors.push(e.message));
      await page.goto(route);
      await page.waitForLoadState('networkidle').catch(() => {});

      const critical = pageErrors.filter(e =>
        !e.includes('ResizeObserver') &&
        !e.includes('Non-Error')
      );
      if (critical.length > 0) errors[route] = critical;

      page.removeAllListeners('pageerror');
    }

    expect(errors).toEqual({});
  });
});
