import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

vi.mock('../db');
vi.mock('../middleware/security', () => ({
  requireApiKey: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
vi.mock('../services/kpiHistory', () => ({
  listKpiTeamBacklogHistory: vi.fn(() => []),
}));

import { getDb } from '../db';
import { listKpiTeamBacklogHistory } from '../services/kpiHistory';
import statsRouter from './stats';

const app = express();
app.use(express.json());
app.use('/', statsRouter);

function makeDb(prepareImpl?: () => unknown) {
  const defaultStmt = { get: vi.fn(() => ({ n: 0 })), all: vi.fn(() => []), run: vi.fn() };
  return { prepare: vi.fn(prepareImpl ?? (() => defaultStmt)) };
}

// ─── GET /stats/home ──────────────────────────────────────────────────────────

describe('GET /stats/home', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('retourne la structure open_bugs / resolved_bugs / anomalies', async () => {
    const bugTypesStmt = { get: vi.fn(), all: vi.fn(() => [
      { bug_type: 'live', count: 10 },
      { bug_type: 'onpremise', count: 5 },
    ]), run: vi.fn() };
    const anomaliesStmt = { get: vi.fn(() => ({ n: 3 })), all: vi.fn(), run: vi.fn() };
    const resolvedStmt  = { get: vi.fn(() => ({ n: 7 })), all: vi.fn(), run: vi.fn() };
    const db = { prepare: vi.fn()
      .mockReturnValueOnce(bugTypesStmt)
      .mockReturnValueOnce(anomaliesStmt)
      .mockReturnValueOnce(resolvedStmt) };
    vi.mocked(getDb).mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    const res = await request(app).get('/stats/home');

    expect(res.status).toBe(200);
    expect(res.body.open_bugs.live).toBe(10);
    expect(res.body.open_bugs.onpremise).toBe(5);
    expect(res.body.open_bugs.total).toBe(15);
    expect(res.body.anomalies.total).toBe(3);
    expect(res.body.resolved_bugs.total).toBe(7);
  });
});

// ─── GET /stats/auto-fixes ────────────────────────────────────────────────────

describe('GET /stats/auto-fixes', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('retourne la liste des corrections automatiques', async () => {
    const lastRunStmt  = { get: vi.fn(() => null), all: vi.fn(() => []), run: vi.fn() };
    const rowsStmt     = { get: vi.fn(),            all: vi.fn(() => []), run: vi.fn() };
    const pendingStmt  = { get: vi.fn(() => ({ n: 0 })), all: vi.fn(), run: vi.fn() };
    const db = { prepare: vi.fn()
      .mockReturnValueOnce(lastRunStmt)
      .mockReturnValueOnce(rowsStmt)
      .mockReturnValueOnce(pendingStmt) };
    vi.mocked(getDb).mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    const res = await request(app).get('/stats/auto-fixes');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('pending');
  });
});

// ─── POST /stats/auto-fixes/ack ───────────────────────────────────────────────

describe('POST /stats/auto-fixes/ack', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('valide des corrections par IDs et retourne le nombre validé', async () => {
    const stmt = { get: vi.fn(), all: vi.fn(), run: vi.fn(() => ({ changes: 2 })) };
    const db = { prepare: vi.fn(() => stmt) };
    vi.mocked(getDb).mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    const res = await request(app).post('/stats/auto-fixes/ack').send({ ids: [1, 2] });

    expect(res.status).toBe(200);
    expect(res.body.acknowledged).toBe(2);
  });

  it('valide toutes les corrections si ids est absent', async () => {
    const stmt = { get: vi.fn(), all: vi.fn(), run: vi.fn(() => ({ changes: 5 })) };
    const db = { prepare: vi.fn(() => stmt) };
    vi.mocked(getDb).mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    const res = await request(app).post('/stats/auto-fixes/ack').send({});

    expect(res.status).toBe(200);
    expect(res.body.acknowledged).toBe(5);
  });
});

// ─── GET /stats/kpi-history ───────────────────────────────────────────────────

describe('GET /stats/kpi-history', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('retourne l\'historique KPI', async () => {
    vi.mocked(listKpiTeamBacklogHistory).mockReturnValueOnce([
      { snapshotDate: '2026-03-21', liveAreaBugs: 42, sprintName: 'PI2-SP4' },
    ] as never);

    const res = await request(app).get('/stats/kpi-history');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].liveAreaBugs).toBe(42);
  });

  it('retourne 500 si le service échoue', async () => {
    vi.mocked(listKpiTeamBacklogHistory).mockImplementationOnce(() => { throw new Error('DB err'); });

    const res = await request(app).get('/stats/kpi-history');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});

// ─── GET /stats/manual-fixes/summary ─────────────────────────────────────────

describe('GET /stats/manual-fixes/summary', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('retourne le résumé par équipe trié par count desc', async () => {
    const summaryStmt = { get: vi.fn(), all: vi.fn(() => [
      { team: 'COCO',   count: 5 },
      { team: 'PIXELS', count: 2 },
    ]), run: vi.fn() };
    const db = { prepare: vi.fn(() => summaryStmt) };
    vi.mocked(getDb).mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    const res = await request(app).get('/stats/manual-fixes/summary?from=2026-03-01&to=2026-03-31');

    expect(res.status).toBe(200);
    expect(res.body.rows).toHaveLength(2);
    expect(res.body.rows[0]).toEqual({ team: 'COCO', count: 5 });
    expect(res.body.from).toBe('2026-03-01');
    expect(res.body.to).toBe('2026-03-31');
  });

  it('passe from et to+1j (borne exclusive) à la requête SQL', async () => {
    const summaryStmt = { get: vi.fn(), all: vi.fn(() => []), run: vi.fn() };
    const db = { prepare: vi.fn(() => summaryStmt) };
    vi.mocked(getDb).mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    await request(app).get('/stats/manual-fixes/summary?from=2026-03-01&to=2026-03-31');

    // .all(from, toExclusive) — vérifie que toExclusive = 2026-04-01
    const callArgs = summaryStmt.all.mock.calls[0];
    expect(callArgs[0]).toBe('2026-03-01');
    expect(callArgs[1]).toBe('2026-04-01');
  });

  it('retourne 400 si from est absent', async () => {
    const res = await request(app).get('/stats/manual-fixes/summary?to=2026-03-31');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('retourne 400 si from a un format invalide', async () => {
    const res = await request(app).get('/stats/manual-fixes/summary?from=01/03/2026&to=2026-03-31');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('retourne une liste vide si aucune modif', async () => {
    const summaryStmt = { get: vi.fn(), all: vi.fn(() => []), run: vi.fn() };
    const db = { prepare: vi.fn(() => summaryStmt) };
    vi.mocked(getDb).mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    const res = await request(app).get('/stats/manual-fixes/summary?from=2026-03-01&to=2026-03-31');

    expect(res.status).toBe(200);
    expect(res.body.rows).toEqual([]);
  });

  it('retourne 500 si erreur SQL', async () => {
    const db = { prepare: vi.fn(() => { throw new Error('DB crash'); }) };
    vi.mocked(getDb).mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    const res = await request(app).get('/stats/manual-fixes/summary?from=2026-03-01&to=2026-03-31');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});

// ─── GET /stats/manual-fixes/detail ──────────────────────────────────────────

describe('GET /stats/manual-fixes/detail', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('retourne la liste des bugs pour une équipe avec champs et violations splittés', async () => {
    const detailStmt = { get: vi.fn(), all: vi.fn(() => [
      {
        id: 42, title: 'Bug critique', state: 'Active',
        last_modified_at: '2026-03-24T10:00:00Z',
        fields_modified: 'priority,version_souhaitee',
        violations_at_time: 'PRIORITY_CHECK,VERSION_CHECK',
      },
      {
        id: 43, title: null, state: 'Resolved',
        last_modified_at: '2026-03-20T09:00:00Z',
        fields_modified: 'integration_build',
        violations_at_time: null,
      },
    ]), run: vi.fn() };
    const db = { prepare: vi.fn(() => detailStmt) };
    vi.mocked(getDb).mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    const res = await request(app).get('/stats/manual-fixes/detail?from=2026-03-01&to=2026-03-31&team=COCO');

    expect(res.status).toBe(200);
    expect(res.body.team).toBe('COCO');
    expect(res.body.bugs).toHaveLength(2);
    expect(res.body.bugs[0].id).toBe(42);
    expect(res.body.bugs[0].fields_modified).toEqual(['priority', 'version_souhaitee']);
    expect(res.body.bugs[0].violations_at_time).toEqual(['PRIORITY_CHECK', 'VERSION_CHECK']);
    expect(res.body.bugs[1].fields_modified).toEqual(['integration_build']);
    expect(res.body.bugs[1].violations_at_time).toEqual([]);
  });

  it('retourne 400 si team est absent', async () => {
    const res = await request(app).get('/stats/manual-fixes/detail?from=2026-03-01&to=2026-03-31');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('retourne 400 si from/to invalides', async () => {
    const res = await request(app).get('/stats/manual-fixes/detail?from=invalid&to=2026-03-31&team=COCO');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('passe team comme 3e param à la requête SQL', async () => {
    const detailStmt = { get: vi.fn(), all: vi.fn(() => []), run: vi.fn() };
    const db = { prepare: vi.fn(() => detailStmt) };
    vi.mocked(getDb).mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    await request(app).get('/stats/manual-fixes/detail?from=2026-03-01&to=2026-03-31&team=PIXELS');

    const callArgs = detailStmt.all.mock.calls[0];
    expect(callArgs[2]).toBe('PIXELS');
  });
});
