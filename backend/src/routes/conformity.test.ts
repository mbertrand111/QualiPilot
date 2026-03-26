import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

vi.mock('../db');
vi.mock('../services/conformity');

import { getDb } from '../db';
import { runConformityCheck } from '../services/conformity';
import conformityRouter from './conformity';

const app = express();
app.use(express.json());
app.use('/', conformityRouter);

function makeStmt(overrides: { get?: unknown; all?: unknown[] } = {}) {
  return {
    get: vi.fn(() => overrides.get ?? null),
    all: vi.fn(() => overrides.all ?? []),
    run: vi.fn(),
  };
}

// ─── POST /conformity/run ─────────────────────────────────────────────────────

describe('POST /conformity/run', () => {
  beforeEach(() => vi.resetAllMocks());

  it('retourne le résultat de l\'évaluation', async () => {
    vi.mocked(runConformityCheck).mockReturnValueOnce({
      checkedBugs: 150, newViolations: 12, resolvedViolations: 3,
      runAt: '2026-03-24T18:00:00.000Z',
    });

    const res = await request(app).post('/conformity/run');

    expect(res.status).toBe(200);
    expect(res.body.checkedBugs).toBe(150);
    expect(res.body.newViolations).toBe(12);
    expect(res.body.resolvedViolations).toBe(3);
    expect(res.body.runAt).toBe('2026-03-24T18:00:00.000Z');
  });

  it('retourne 500 si le service échoue', async () => {
    vi.mocked(runConformityCheck).mockImplementationOnce(() => { throw new Error('DB crash'); });

    const res = await request(app).post('/conformity/run');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toContain('DB crash');
  });
});

// ─── GET /conformity/violations ───────────────────────────────────────────────

describe('GET /conformity/violations', () => {
  beforeEach(() => vi.resetAllMocks());

  it('retourne la liste paginée des violations actives', async () => {
    const violations = [{
      id: 1, bug_id: 42, detected_at: '2026-03-24T10:00:00Z',
      bug_title: 'Bug test', bug_state: 'Active', bug_team: 'COCO', bug_priority: 1,
      bug_sprint: 'PI2-SP4', bug_version_souhaitee: null, bug_integration_build: null,
      bug_found_in: null, bug_area_path: null,
      rule_code: 'PRIORITY_CHECK', rule_description: 'Priority doit être 2', severity: 'error',
    }];
    const countStmt = makeStmt({ get: { n: 1 } });
    const listStmt  = makeStmt({ all: violations });
    const db = { prepare: vi.fn().mockReturnValueOnce(countStmt).mockReturnValueOnce(listStmt) };
    vi.mocked(getDb).mockReturnValue(db as ReturnType<typeof getDb>);

    const res = await request(app).get('/conformity/violations');

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.violations).toHaveLength(1);
    expect(res.body.violations[0].rule_code).toBe('PRIORITY_CHECK');
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(50);
  });

  it('retourne liste vide s\'il n\'y a pas de violations', async () => {
    const countStmt = makeStmt({ get: { n: 0 } });
    const listStmt  = makeStmt({ all: [] });
    const db = { prepare: vi.fn().mockReturnValueOnce(countStmt).mockReturnValueOnce(listStmt) };
    vi.mocked(getDb).mockReturnValue(db as ReturnType<typeof getDb>);

    const res = await request(app).get('/conformity/violations');

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
    expect(res.body.violations).toEqual([]);
  });

  it('filtre par team et rule_code', async () => {
    const countStmt = makeStmt({ get: { n: 0 } });
    const listStmt  = makeStmt({ all: [] });
    const db = { prepare: vi.fn().mockReturnValueOnce(countStmt).mockReturnValueOnce(listStmt) };
    vi.mocked(getDb).mockReturnValue(db as ReturnType<typeof getDb>);

    await request(app).get('/conformity/violations?team=COCO&rule_code=PRIORITY_CHECK');

    const calls = db.prepare.mock.calls as string[][];
    expect(calls[0][0]).toContain('b.team = ?');
    expect(calls[0][0]).toContain('r.code = ?');
  });

  it('filtre par bug_id', async () => {
    const countStmt = makeStmt({ get: { n: 0 } });
    const listStmt  = makeStmt({ all: [] });
    const db = { prepare: vi.fn().mockReturnValueOnce(countStmt).mockReturnValueOnce(listStmt) };
    vi.mocked(getDb).mockReturnValue(db as ReturnType<typeof getDb>);

    await request(app).get('/conformity/violations?bug_id=42');

    const calls = db.prepare.mock.calls as string[][];
    expect(calls[0][0]).toContain('v.bug_id = ?');
  });

  it('filtre par severity', async () => {
    const countStmt = makeStmt({ get: { n: 0 } });
    const listStmt  = makeStmt({ all: [] });
    const db = { prepare: vi.fn().mockReturnValueOnce(countStmt).mockReturnValueOnce(listStmt) };
    vi.mocked(getDb).mockReturnValue(db as ReturnType<typeof getDb>);

    await request(app).get('/conformity/violations?severity=error');

    const calls = db.prepare.mock.calls as string[][];
    expect(calls[0][0]).toContain('r.severity = ?');
  });
});

// ─── GET /conformity/summary ──────────────────────────────────────────────────

describe('GET /conformity/summary', () => {
  beforeEach(() => vi.resetAllMocks());

  it('retourne les totaux par règle et équipe', async () => {
    const totalStmt   = makeStmt({ get: { n: 15 } });
    const byRuleStmt  = makeStmt({ all: [{ rule_code: 'PRIORITY_CHECK', rule_description: 'Priority doit être 2', severity: 'error', count: 10 }] });
    const byTeamStmt  = makeStmt({ all: [{ team: 'COCO', count: 5 }] });
    const lastRunStmt = makeStmt({ get: { lastRunAt: '2026-03-24T10:00:00Z' } });
    const db = {
      prepare: vi.fn()
        .mockReturnValueOnce(totalStmt)
        .mockReturnValueOnce(byRuleStmt)
        .mockReturnValueOnce(byTeamStmt)
        .mockReturnValueOnce(lastRunStmt),
    };
    vi.mocked(getDb).mockReturnValue(db as ReturnType<typeof getDb>);

    const res = await request(app).get('/conformity/summary');

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(15);
    expect(res.body.by_rule).toHaveLength(1);
    expect(res.body.by_rule[0].rule_code).toBe('PRIORITY_CHECK');
    expect(res.body.by_team).toHaveLength(1);
    expect(res.body.lastRunAt).toBe('2026-03-24T10:00:00Z');
  });

  it('retourne total=0 et lastRunAt=null si aucune violation', async () => {
    const totalStmt   = makeStmt({ get: { n: 0 } });
    const byRuleStmt  = makeStmt({ all: [] });
    const byTeamStmt  = makeStmt({ all: [] });
    const lastRunStmt = makeStmt({ get: { lastRunAt: null } });
    const db = {
      prepare: vi.fn()
        .mockReturnValueOnce(totalStmt)
        .mockReturnValueOnce(byRuleStmt)
        .mockReturnValueOnce(byTeamStmt)
        .mockReturnValueOnce(lastRunStmt),
    };
    vi.mocked(getDb).mockReturnValue(db as ReturnType<typeof getDb>);

    const res = await request(app).get('/conformity/summary');

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
    expect(res.body.lastRunAt).toBeNull();
  });
});
