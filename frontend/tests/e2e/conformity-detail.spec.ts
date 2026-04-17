import { test, expect, type Route, type Request } from '@playwright/test';

interface BugFixture {
  id: number;
  title: string;
  state: string;
  priority: number;
  team: string;
  area_path: string;
  iteration_path: string | null;
  sprint: string;
  found_in: string;
  integration_build: string;
  version_souhaitee: string;
  resolved_reason: string | null;
  raison_origine: string | null;
  assigned_to: string | null;
  created_by: string | null;
  created_date: string | null;
  resolved_date: string | null;
  closed_date: string | null;
  sprint_done: string | null;
  changed_date: string | null;
  last_synced_at: string | null;
}

const BUG_ID = 12345;

const initialBug: BugFixture = {
  id: BUG_ID,
  title: 'Bug de test détail',
  state: 'Active',
  priority: 3,
  team: 'COCO',
  area_path: 'Isagri_Dev_GC_GestionCommerciale\\COCO',
  iteration_path: 'Isagri_Dev_GC_GestionCommerciale\\2025-2026\\PI1\\PI1-SP1',
  sprint: 'PI1-SP1',
  found_in: '26.10',
  integration_build: '',
  version_souhaitee: 'FAH_26.20',
  resolved_reason: null,
  raison_origine: null,
  assigned_to: 'mbertrand@isagri.fr',
  created_by: 'mbertrand@isagri.fr',
  created_date: '2026-01-10T10:00:00.000Z',
  resolved_date: null,
  closed_date: null,
  sprint_done: null,
  changed_date: '2026-04-16T12:00:00.000Z',
  last_synced_at: '2026-04-17T08:00:00.000Z',
};

function json(route: Route, body: unknown, status = 200): Promise<void> {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

test.describe('ConformityDetail — write flow', () => {
  test('charge un bug, applique une modification de priorité, audit visible', async ({ page }) => {
    let bug = { ...initialBug };
    const auditEntries: Array<{ id: number; field: string; old_value: string | null; new_value: string | null; performed_at: string }> = [];
    const writeRequests: Array<{ field: string; value: unknown }> = [];

    await page.route('**/api/**', async (route: Route) => {
      const req: Request = route.request();
      const url = new URL(req.url());
      const method = req.method();

      if (url.pathname === '/api/health') {
        return json(route, { status: 'ok', last_sync_at: '2026-04-17T08:00:00.000Z' });
      }
      if (url.pathname === `/api/bugs/${BUG_ID}` && method === 'GET') {
        return json(route, bug);
      }
      if (url.pathname === '/api/conformity/violations') {
        return json(route, {
          total: 1, page: 1, limit: 50,
          violations: [{
            id: 99, rule_code: 'PRIORITY_CHECK',
            rule_description: 'Priorité doit être 2',
            severity: 'error',
            detected_at: '2026-04-16T08:00:00.000Z',
          }],
        });
      }
      if (url.pathname === `/api/bugs/${BUG_ID}/audit` && method === 'GET') {
        return json(route, auditEntries);
      }
      if (url.pathname === '/api/bugs/meta/areas') {
        return json(route, ['Isagri_Dev_GC_GestionCommerciale\\COCO']);
      }
      if (url.pathname === '/api/bugs/meta/iterations') {
        return json(route, ['Isagri_Dev_GC_GestionCommerciale\\2025-2026\\PI1\\PI1-SP1']);
      }
      if (url.pathname === `/api/bugs/${BUG_ID}/fields` && method === 'PATCH') {
        const body = JSON.parse(req.postData() ?? '{}') as { field: string; value: unknown };
        writeRequests.push(body);
        const oldValue = String((bug as Record<string, unknown>)[body.field] ?? '');
        const newValue = String(body.value);
        bug = { ...bug, [body.field]: body.value } as BugFixture;
        auditEntries.unshift({
          id: auditEntries.length + 1,
          field: body.field,
          old_value: oldValue,
          new_value: newValue,
          performed_at: new Date().toISOString(),
        });
        return json(route, { ok: true, field: body.field, old_value: oldValue, new_value: newValue });
      }
      return route.fulfill({ status: 200, body: '{}' });
    });

    await page.goto(`/conformity/${BUG_ID}`);

    await expect(page.getByRole('heading', { name: `Bug #${BUG_ID}` })).toBeVisible();
    await expect(page.getByText('Bug de test détail')).toBeVisible();
    await expect(page.getByText('PRIORITY_CHECK')).toBeVisible();

    // Click on Priorité field to enter edit mode
    await page.getByText('Priorité', { exact: true }).first().click();

    // The select for priority becomes editable; switch to value "2"
    const select = page.locator('select').first();
    await select.selectOption('2');

    // Wait for the dirty-state to appear in action bar
    await expect(page.getByRole('button', { name: /Appliquer \(1\)/ })).toBeVisible();
    await page.getByRole('button', { name: /Appliquer \(1\)/ }).click();

    // Confirmation modal — confirm save
    const confirmBtn = page.getByRole('button', { name: /^Confirmer/ });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // After save, the audit entry should appear
    await expect(page.getByText('Aucune modification effectuée via QualiPilot.')).toHaveCount(0);
    await expect(page.getByText('priority', { exact: false }).first()).toBeVisible();

    expect(writeRequests).toEqual([{ field: 'priority', value: 2 }]);
  });

  test('affiche une erreur si le PATCH échoue', async ({ page }) => {
    await page.route('**/api/**', async (route: Route) => {
      const req = route.request();
      const url = new URL(req.url());
      const method = req.method();

      if (url.pathname === '/api/health') {
        return json(route, { status: 'ok', last_sync_at: null });
      }
      if (url.pathname === `/api/bugs/${BUG_ID}`) {
        return json(route, initialBug);
      }
      if (url.pathname === '/api/conformity/violations') {
        return json(route, { total: 0, page: 1, limit: 50, violations: [] });
      }
      if (url.pathname === `/api/bugs/${BUG_ID}/audit`) {
        return json(route, []);
      }
      if (url.pathname === '/api/bugs/meta/areas') {
        return json(route, []);
      }
      if (url.pathname === '/api/bugs/meta/iterations') {
        return json(route, []);
      }
      if (url.pathname === `/api/bugs/${BUG_ID}/fields` && method === 'PATCH') {
        return json(route, { error: 'ADO refused: priority must be 2' }, 502);
      }
      return route.fulfill({ status: 200, body: '{}' });
    });

    await page.goto(`/conformity/${BUG_ID}`);
    await expect(page.getByRole('heading', { name: `Bug #${BUG_ID}` })).toBeVisible();

    await page.getByText('Priorité', { exact: true }).first().click();
    await page.locator('select').first().selectOption('1');

    await page.getByRole('button', { name: /Appliquer \(1\)/ }).click();
    await page.getByRole('button', { name: /^Confirmer/ }).click();

    // Error banner should appear
    await expect(page.getByText(/Erreur/)).toBeVisible();
  });
});
