import { test, expect, type Route } from '@playwright/test';

function json(route: Route, body: unknown) {
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
}

const HEALTH     = { status: 'ok', last_sync_at: '2026-04-20T08:00:00.000Z' };
const AUTO_FIXES = {
  lastRun: { id: 1, trigger_source: 'sync', run_at: '2026-04-20T07:00:00.000Z', skipped: false, total_updated: 3 },
  rows: [
    { id: 1, work_item_id: 100, rule_code: 'PRIORITY_CHECK', rule_description: 'Priorité', field: 'priority', old_value: '3', new_value: '2', trigger_source: 'sync', performed_at: '2026-04-20T07:00:00.000Z' },
  ],
  pendingCount: 1,
};
const KPI_HISTORY = {
  snapshots: [
    { id: 1, snapshot_date: '2026-04-13', team: 'COCO', sprint: 'PI2-SP3', open_bugs: 12, violations_count: 2 },
  ],
};
const MANUAL_SUMMARY = [
  { team: 'COCO',   count: 5 },
  { team: 'PIXELS', count: 2 },
];
const MANUAL_DETAIL = [
  {
    id: 42,
    title: 'Bug corrigé manuellement',
    state: 'Closed',
    last_modified_at: '2026-04-18T10:00:00.000Z',
    fields_modified: 'priority,version_souhaitee',
    violations_at_time: 'PRIORITY_CHECK,VERSION_SOUHAITEE_CHECK',
  },
];

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const { pathname, searchParams } = url;

    if (pathname === '/api/health')                     return json(route, HEALTH);
    if (pathname === '/api/stats/auto-fixes')            return json(route, AUTO_FIXES);
    if (pathname === '/api/stats/kpi-history')           return json(route, KPI_HISTORY);
    if (pathname === '/api/stats/manual-fixes/summary')  return json(route, MANUAL_SUMMARY);
    if (pathname === '/api/stats/manual-fixes/detail' && searchParams.get('team') === 'COCO')
      return json(route, MANUAL_DETAIL);
    if (pathname === '/api/bugs/meta/sprints')           return json(route, []);

    await route.fulfill({ status: 200, body: '{}' });
  });
});

test('page Historique — sections principales visibles', async ({ page }) => {
  await page.goto('/history');
  await expect(page.getByRole('heading', { name: /historique/i })).toBeVisible();
  await expect(page.getByText('Corrections automatiques')).toBeVisible();
  await expect(page.getByText('Bugs modifiés manuellement')).toBeVisible();
});

test('section corrections auto — données affichées', async ({ page }) => {
  await page.goto('/history');
  await expect(page.getByText('PRIORITY_CHECK')).toBeVisible();
  await expect(page.getByText('#100')).toBeVisible();
});

test('section corrections manuelles — tableau équipes', async ({ page }) => {
  await page.goto('/history');
  await expect(page.getByText('COCO')).toBeVisible();
  await expect(page.getByText('PIXELS')).toBeVisible();
});

test('section corrections manuelles — drill-down modale', async ({ page }) => {
  await page.goto('/history');

  // Clic sur le chiffre de COCO pour ouvrir la modale
  const cocoRow = page.getByRole('row', { name: /COCO/ });
  await cocoRow.getByRole('button').click();

  await expect(page.getByText('Bug corrigé manuellement')).toBeVisible();
  await expect(page.getByText('PRIORITY_CHECK')).toBeVisible();
});

test('section corrections manuelles — lien ADO dans la modale', async ({ page }) => {
  await page.goto('/history');

  const cocoRow = page.getByRole('row', { name: /COCO/ });
  await cocoRow.getByRole('button').click();

  const adoLink = page.getByRole('link', { name: '#42' });
  await expect(adoLink).toBeVisible();
  await expect(adoLink).toHaveAttribute('href', /workitems\/edit\/42/);
});
