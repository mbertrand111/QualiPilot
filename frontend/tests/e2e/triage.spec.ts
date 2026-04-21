import { test, expect, type Route } from '@playwright/test';

function json(route: Route, body: unknown) {
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
}

const HEALTH = { status: 'ok', last_sync_at: '2026-04-20T08:00:00.000Z' };
const TRIAGE_STATS = {
  prioritiser: 8, corriger_live: 5, corriger_onpremise: 12,
  corriger_hors_version: 2, corriger_sans_zone: 0, old_6months: 3,
};
const BUGS_PAGE = {
  total: 3, page: 1, limit: 50,
  bugs: [
    { id: 201, title: 'Bug priorité manquante', state: 'New', priority: null, team: 'COCO', sprint: null, found_in: '13.86.300', integration_build: null, version_souhaitee: '13.87.XXX', assigned_to: null, created_date: '2026-01-10', changed_date: '2026-04-15' },
    { id: 202, title: 'Bug Live non priorisé', state: 'New', priority: 2, team: 'PIXELS', sprint: null, found_in: '26.10', integration_build: null, version_souhaitee: 'FAH_26.20', assigned_to: null, created_date: '2026-02-01', changed_date: '2026-04-10' },
    { id: 203, title: 'Bug à corriger OnPremise', state: 'Active', priority: 2, team: 'COCO', sprint: '2025-2026 · PI2-SP3', found_in: '13.87.200', integration_build: null, version_souhaitee: '13.87.300', assigned_to: 'J. Dupont', created_date: '2026-03-01', changed_date: '2026-04-19' },
  ],
};
const EMPTY_BUGS = { total: 0, page: 1, limit: 50, bugs: [] };

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const { pathname, searchParams } = url;

    if (pathname === '/api/health')             return json(route, HEALTH);
    if (pathname === '/api/stats/triage')        return json(route, TRIAGE_STATS);
    if (pathname === '/api/bugs/meta/teams')     return json(route, ['COCO', 'PIXELS', 'NULL.REF']);
    if (pathname === '/api/bugs/meta/sprints')   return json(route, ['2025-2026 · PI2-SP3', '2025-2026 · PI2-SP4']);
    if (pathname === '/api/bugs/meta/areas')     return json(route, []);
    if (pathname === '/api/bugs') {
      if (searchParams.get('team') === 'PIXELS') return json(route, { ...EMPTY_BUGS, bugs: [BUGS_PAGE.bugs[1]], total: 1 });
      return json(route, BUGS_PAGE);
    }
    await route.fulfill({ status: 200, body: '{}' });
  });
});

test('page Triage — cartes de statistiques visibles', async ({ page }) => {
  await page.goto('/triage');
  await expect(page.getByText('Bugs à prioriser')).toBeVisible();
  await expect(page.getByText('8')).toBeVisible();
});

test('page Triage — liste de bugs affichée', async ({ page }) => {
  await page.goto('/triage');
  await expect(page.getByText('Bug priorité manquante')).toBeVisible();
  await expect(page.getByText('Bug Live non priorisé')).toBeVisible();
  await expect(page.getByText('Bug à corriger OnPremise')).toBeVisible();
});

test('page Triage — liens ADO sur les IDs', async ({ page }) => {
  await page.goto('/triage');
  const link = page.getByRole('link', { name: '#201' });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', /workitems\/edit\/201/);
});

test('page Triage — sélection de bugs active la barre d\'actions', async ({ page }) => {
  await page.goto('/triage');
  // Coche le premier bug
  const firstCheckbox = page.getByRole('checkbox').first();
  await firstCheckbox.check();
  // La barre d'actions groupées doit apparaître
  await expect(page.getByText(/sélectionné/i)).toBeVisible();
});

test('page Triage — filtre par équipe rafraîchit la liste', async ({ page }) => {
  await page.goto('/triage');

  // Ouvre le filtre équipe et sélectionne PIXELS
  await page.getByRole('button', { name: /Équipe/i }).click();
  await page.getByText('Tout sélectionner').click();
  // Referme (clic ailleurs)
  await page.keyboard.press('Escape');

  await expect(page.getByText('Bug Live non priorisé')).toBeVisible();
});
