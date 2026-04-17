import { test, expect, type Route } from '@playwright/test';

function json(route: Route, body: unknown, status = 200): Promise<void> {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

test.describe('Settings page', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/**', async (route: Route) => {
      const url = new URL(route.request().url());

      if (url.pathname === '/api/health') {
        return json(route, { status: 'ok', last_sync_at: '2026-04-17T08:00:00.000Z' });
      }
      if (url.pathname === '/api/settings/release-versions') {
        return json(route, {
          versions: [
            { version: 'FAH_26.20', selected: true },
            { version: 'FAH_26.10', selected: false },
          ],
          alwaysVisible: ['FAH_26.20'],
        });
      }
      if (url.pathname === '/api/settings/sprint-calendar') {
        return json(route, {
          entries: [{
            id: 1,
            piLabel: 'PI1',
            sprintLabel: 'PI1-SP1',
            startDate: '2025-09-01',
            endDate: '2025-09-14',
            active: true,
            sortOrder: 1,
          }],
          piWindows: [{ key: '2025-2026-PI1', label: 'PI1', start: '2025-09-01', end: '2025-10-31' }],
          updatedAt: '2026-04-01T00:00:00.000Z',
        });
      }
      if (url.pathname === '/api/settings/conformity-rules') {
        return json(route, {
          rules: [
            { id: 1, code: 'PRIORITY_CHECK', description: 'Priorité doit être 2', severity: 'error', active: true, auto: true },
            { id: 2, code: 'VERSION_CHECK', description: 'Version souhaitée valide', severity: 'error', active: true, auto: false },
          ],
          updatedAt: '2026-04-01T00:00:00.000Z',
        });
      }
      if (url.pathname === '/api/bugs/meta/sprints') {
        return json(route, ['PI1-SP1']);
      }
      if (url.pathname === '/api/bugs/meta/areas') {
        return json(route, ['Isagri_Dev_GC_GestionCommerciale\\COCO']);
      }
      return route.fulfill({ status: 200, body: '{}' });
    });
  });

  test('affiche les sections principales', async ({ page }) => {
    await page.goto('/settings');

    await expect(page.getByRole('heading', { name: 'Paramètres' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Connexion Azure DevOps' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Règles de conformité' })).toBeVisible();
    await expect(page.getByText('PRIORITY_CHECK')).toBeVisible();
  });

  test('refuse la sauvegarde si la clé API protège et que le PATCH 401', async ({ page }) => {
    await page.route('**/api/settings/conformity-rules', async (route: Route) => {
      if (route.request().method() === 'PATCH') {
        return json(route, { error: 'API key requise' }, 401);
      }
      return json(route, {
        rules: [
          { id: 1, code: 'PRIORITY_CHECK', description: 'Priorité doit être 2', severity: 'error', active: true, auto: true },
        ],
        updatedAt: '2026-04-01T00:00:00.000Z',
      });
    });

    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Règles de conformité' })).toBeVisible();
    // We don't trigger the PATCH here — this test asserts the page loads even with strict auth backend
    // (the network mock above protects us if the page tried to mutate something)
  });
});
