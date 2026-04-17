import { test, expect, type Route } from '@playwright/test';

function json(route: Route, body: unknown): Promise<void> {
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/health') {
      await json(route, { status: 'ok', last_sync_at: '2026-04-17T08:00:00.000Z' });
      return;
    }
    if (url.pathname === '/api/stats/home') {
      await json(route, {
        open_bugs: { total: 12, live: 5, onpremise: 4, hors_version: 2, uncategorized: 1 },
        resolved_bugs: { total: 8 },
        anomalies: { total: 3 },
      });
      return;
    }
    if (url.pathname === '/api/bugs/meta/sprints') {
      await json(route, ['2025-2026 · PI1-SP1']);
      return;
    }
    if (url.pathname === '/api/bugs/meta/areas') {
      await json(route, ['Isagri_Dev_GC_GestionCommerciale\\COCO']);
      return;
    }
    if (url.pathname === '/api/conformity/violations') {
      await json(route, {
        total: 1,
        page: 1,
        limit: 50,
        violations: [{
          id: 10,
          bug_id: 12345,
          bug_title: 'Bug de test',
          bug_state: 'Active',
          bug_team: 'COCO',
          bug_priority: 3,
          bug_version_souhaitee: 'FAH_26.20',
          bug_integration_build: '26.11.001',
          bug_found_in: '26.10',
          bug_resolved_reason: null,
          bug_changed_date: '2026-04-16T12:00:00.000Z',
        }],
        rule_counts: [{ rule_code: 'PRIORITY_CHECK', count: 1 }],
      });
      return;
    }
    await route.fulfill({ status: 200, body: '{}' });
  });
});

test('home dashboard renders key indicators', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Total' })).toContainText('12');
  await expect(page.getByRole('button', { name: 'Anomalies actives' })).toContainText('3');
});

test('conformity page renders violation list', async ({ page }) => {
  await page.goto('/conformity');

  await expect(page.getByText('Anomalies de conformité')).toBeVisible();
  await expect(page.getByText('PRIORITY_CHECK')).toBeVisible();
  await expect(page.getByRole('link', { name: '#12345' })).toBeVisible();
});
