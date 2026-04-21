import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../db', () => ({ getDb: vi.fn() }));
vi.mock('./adoWrite', () => ({ writeField: vi.fn() }));
vi.mock('./conformity', () => ({ runConformityCheck: vi.fn() }));
vi.mock('../logger', () => ({ default: { info: vi.fn(), warn: vi.fn() } }));

import { runAutoRemediation } from './autoRemediation';
import { getDb } from '../db';
import { writeField } from './adoWrite';

// ─── DB mock factory ──────────────────────────────────────────────────────────

function makeDb({
  ruleRows = [{ code: 'PRIORITY_CHECK', active: 1 }, { code: 'INTEGRATION_BUILD_NOT_EMPTIED', active: 1 }],
  priorityBugs = [] as { id: number }[],
  buildBugs    = [] as { id: number }[],
} = {}) {
  const stub = (rows: unknown[] = []) => ({ all: vi.fn().mockReturnValue(rows), run: vi.fn().mockReturnValue({ lastInsertRowid: 42 }) });

  const prepare = vi.fn().mockImplementation((sql: string) => {
    if (sql.includes('INSERT INTO auto_remediation_runs')) return stub([], );
    if (sql.includes('UPDATE auto_remediation_runs'))     return stub();
    if (sql.includes('SELECT code, active'))              return stub(ruleRows);
    if (sql.includes('priority IS NULL'))                 return stub(priorityBugs);
    if (sql.includes('integration_build IS NOT NULL'))    return stub(buildBugs);
    // auto_fix_audit INSERT
    return stub();
  });
  return { prepare };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('runAutoRemediation — règles désactivées', () => {
  it('ne corrige rien si les deux règles sont désactivées', async () => {
    const db = makeDb({ ruleRows: [{ code: 'PRIORITY_CHECK', active: 0 }, { code: 'INTEGRATION_BUILD_NOT_EMPTIED', active: 0 }] });
    vi.mocked(getDb).mockReturnValue(db as never);

    const result = await runAutoRemediation('sync');

    expect(result.skipped).toBe(false);
    expect(result.priority.attempted).toBe(0);
    expect(result.integration_build.attempted).toBe(0);
    expect(vi.mocked(writeField)).not.toHaveBeenCalled();
  });
});

describe('runAutoRemediation — correction priorité', () => {
  it('appelle writeField pour chaque bug avec mauvaise priorité', async () => {
    const db = makeDb({ priorityBugs: [{ id: 10 }, { id: 20 }], buildBugs: [] });
    vi.mocked(getDb).mockReturnValue(db as never);
    vi.mocked(writeField).mockResolvedValue({ old_value: '3', new_value: '2' } as never);

    const result = await runAutoRemediation('sync');

    expect(result.priority.attempted).toBe(2);
    expect(result.priority.updated).toBe(2);
    expect(result.priority.failed).toBe(0);
    expect(result.totalUpdated).toBe(2);
    expect(vi.mocked(writeField)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(writeField)).toHaveBeenCalledWith(10, 'priority', 2, { runConformity: false });
  });

  it('comptabilise les échecs writeField', async () => {
    const db = makeDb({ priorityBugs: [{ id: 10 }, { id: 20 }], buildBugs: [] });
    vi.mocked(getDb).mockReturnValue(db as never);
    vi.mocked(writeField).mockRejectedValue(new Error('ADO timeout'));

    const result = await runAutoRemediation('scheduler');

    expect(result.priority.attempted).toBe(2);
    expect(result.priority.updated).toBe(0);
    expect(result.priority.failed).toBe(2);
    expect(result.totalUpdated).toBe(0);
  });
});

describe('runAutoRemediation — nettoyage build', () => {
  it('vide le build pour les bugs New/Active qui en ont un', async () => {
    const db = makeDb({ priorityBugs: [], buildBugs: [{ id: 5 }] });
    vi.mocked(getDb).mockReturnValue(db as never);
    vi.mocked(writeField).mockResolvedValue({ old_value: '13.87.200', new_value: '' } as never);

    const result = await runAutoRemediation('sync');

    expect(result.integration_build.attempted).toBe(1);
    expect(result.integration_build.updated).toBe(1);
    expect(vi.mocked(writeField)).toHaveBeenCalledWith(5, 'integration_build', '', { runConformity: false });
  });
});

describe('runAutoRemediation — résultat global', () => {
  it('totalUpdated = priority.updated + integration_build.updated', async () => {
    const db = makeDb({ priorityBugs: [{ id: 1 }], buildBugs: [{ id: 2 }, { id: 3 }] });
    vi.mocked(getDb).mockReturnValue(db as never);
    vi.mocked(writeField).mockResolvedValue({ old_value: 'x', new_value: 'y' } as never);

    const result = await runAutoRemediation('sync');

    expect(result.totalUpdated).toBe(3);
    expect(result.skipped).toBe(false);
    expect(result.trigger).toBe('sync');
  });
});
