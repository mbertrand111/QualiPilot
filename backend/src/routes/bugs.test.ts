import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// ─── Mock getDb ────────────────────────────────────────────────────────────────

vi.mock('../db');
import { getDb } from '../db';

import bugsRouter from './bugs';

const app = express();
app.use(express.json());
app.use('/', bugsRouter);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDb(overrides: Record<string, unknown> = {}) {
  const stmtDefault = { get: vi.fn(), all: vi.fn(() => []), run: vi.fn() };
  const stmt = { ...stmtDefault, ...overrides };
  return { prepare: vi.fn(() => stmt) };
}

// ─── GET /bugs ─────────────────────────────────────────────────────────────────

describe('GET /bugs', () => {
  beforeEach(() => vi.resetAllMocks());

  it('retourne la liste des bugs avec pagination', async () => {
    const bugs = [
      { id: 1, title: 'Bug A', state: 'New', priority: 2, team: 'COCO', sprint: 'PI2-SP4',
        sprint_done: null, found_in: null, integration_build: null, version_souhaitee: null,
        resolved_reason: null, raison_origine: null, assigned_to: null,
        created_date: null, changed_date: '2026-01-01T00:00:00Z', area_path: null, last_synced_at: null },
    ];
    const countStmt = { get: vi.fn(() => ({ n: 1 })), all: vi.fn(), run: vi.fn() };
    const bugsStmt  = { get: vi.fn(), all: vi.fn(() => bugs), run: vi.fn() };
    const db = { prepare: vi.fn().mockReturnValueOnce(countStmt).mockReturnValueOnce(bugsStmt) };
    vi.mocked(getDb).mockReturnValue(db as ReturnType<typeof getDb>);

    const res = await request(app).get('/bugs');

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.bugs).toHaveLength(1);
    expect(res.body.bugs[0].id).toBe(1);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(50);
  });

  it('retourne une liste vide si aucun bug', async () => {
    const countStmt = { get: vi.fn(() => ({ n: 0 })), all: vi.fn(), run: vi.fn() };
    const bugsStmt  = { get: vi.fn(), all: vi.fn(() => []), run: vi.fn() };
    const db = { prepare: vi.fn().mockReturnValueOnce(countStmt).mockReturnValueOnce(bugsStmt) };
    vi.mocked(getDb).mockReturnValue(db as ReturnType<typeof getDb>);

    const res = await request(app).get('/bugs');

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
    expect(res.body.bugs).toEqual([]);
  });

  it('accepte les filtres multi-valeurs team, state, sprint', async () => {
    const countStmt = { get: vi.fn(() => ({ n: 0 })), all: vi.fn(), run: vi.fn() };
    const bugsStmt  = { get: vi.fn(), all: vi.fn(() => []), run: vi.fn() };
    const db = { prepare: vi.fn().mockReturnValueOnce(countStmt).mockReturnValueOnce(bugsStmt) };
    vi.mocked(getDb).mockReturnValue(db as ReturnType<typeof getDb>);

    const res = await request(app).get('/bugs?team=COCO,PIXELS&state=New,Active&sprint=PI2-SP4');

    expect(res.status).toBe(200);
    // Les SQL générées doivent contenir les placeholders (vérification indirecte via prepare)
    const calls = db.prepare.mock.calls as string[][];
    expect(calls[0][0]).toContain('team IN');
    expect(calls[0][0]).toContain('state IN');
    expect(calls[0][0]).toContain('sprint =');
  });

  it('accepte les filtres "contient" title, version, found_in, build', async () => {
    const countStmt = { get: vi.fn(() => ({ n: 0 })), all: vi.fn(), run: vi.fn() };
    const bugsStmt  = { get: vi.fn(), all: vi.fn(() => []), run: vi.fn() };
    const db = { prepare: vi.fn().mockReturnValueOnce(countStmt).mockReturnValueOnce(bugsStmt) };
    vi.mocked(getDb).mockReturnValue(db as ReturnType<typeof getDb>);

    const res = await request(app).get('/bugs?title=crash&version=26&found_in=24.10&build=FAH');

    expect(res.status).toBe(200);
    const calls = db.prepare.mock.calls as string[][];
    expect(calls[0][0]).toContain('title LIKE');
    expect(calls[0][0]).toContain('version_souhaitee LIKE');
    expect(calls[0][0]).toContain('found_in LIKE');
    expect(calls[0][0]).toContain('integration_build LIKE');
  });

  it('ignore les colonnes de tri non autorisées (injection SQL)', async () => {
    const countStmt = { get: vi.fn(() => ({ n: 0 })), all: vi.fn(), run: vi.fn() };
    const bugsStmt  = { get: vi.fn(), all: vi.fn(() => []), run: vi.fn() };
    const db = { prepare: vi.fn().mockReturnValueOnce(countStmt).mockReturnValueOnce(bugsStmt) };
    vi.mocked(getDb).mockReturnValue(db as ReturnType<typeof getDb>);

    const res = await request(app).get('/bugs?sort=; DROP TABLE bugs_cache; --');

    expect(res.status).toBe(200);
    // Doit fallback sur changed_date
    const calls = db.prepare.mock.calls as string[][];
    expect(calls[1][0]).toContain('ORDER BY changed_date');
  });

  it('respecte la pagination (page et limit)', async () => {
    const countStmt = { get: vi.fn(() => ({ n: 120 })), all: vi.fn(), run: vi.fn() };
    const bugsStmt  = { get: vi.fn(), all: vi.fn(() => []), run: vi.fn() };
    const db = { prepare: vi.fn().mockReturnValueOnce(countStmt).mockReturnValueOnce(bugsStmt) };
    vi.mocked(getDb).mockReturnValue(db as ReturnType<typeof getDb>);

    const res = await request(app).get('/bugs?page=3&limit=20');

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(3);
    expect(res.body.limit).toBe(20);
    expect(res.body.total).toBe(120);
  });
});

// ─── GET /bugs/meta/teams ──────────────────────────────────────────────────────

describe('GET /bugs/meta/teams', () => {
  beforeEach(() => vi.resetAllMocks());

  it('retourne la liste des équipes distinctes', async () => {
    const stmt = { get: vi.fn(), all: vi.fn(() => [{ team: 'COCO' }, { team: 'PIXELS' }]), run: vi.fn() };
    const db = { prepare: vi.fn(() => stmt) };
    vi.mocked(getDb).mockReturnValue(db as ReturnType<typeof getDb>);

    const res = await request(app).get('/bugs/meta/teams');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(['COCO', 'PIXELS']);
  });

  it('retourne un tableau vide si aucune équipe', async () => {
    const stmt = { get: vi.fn(), all: vi.fn(() => []), run: vi.fn() };
    const db = { prepare: vi.fn(() => stmt) };
    vi.mocked(getDb).mockReturnValue(db as ReturnType<typeof getDb>);

    const res = await request(app).get('/bugs/meta/teams');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ─── GET /bugs/meta/sprints ────────────────────────────────────────────────────

describe('GET /bugs/meta/sprints', () => {
  beforeEach(() => vi.resetAllMocks());

  it('retourne la liste des sprints distincts', async () => {
    const stmt = { get: vi.fn(), all: vi.fn(() => [{ sprint: 'PI2-SP4' }, { sprint: 'PI3-SP1' }]), run: vi.fn() };
    const db = { prepare: vi.fn(() => stmt) };
    vi.mocked(getDb).mockReturnValue(db as ReturnType<typeof getDb>);

    const res = await request(app).get('/bugs/meta/sprints');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(['PI2-SP4', 'PI3-SP1']);
  });
});

// ─── GET /bugs/:id/audit ───────────────────────────────────────────────────────

describe('GET /bugs/:id/audit', () => {
  beforeEach(() => vi.resetAllMocks());

  it('retourne les entrées d\'audit pour un bug', async () => {
    const entries = [
      { id: 1, field: 'priority', old_value: '3', new_value: '2', performed_at: '2026-03-24T10:00:00Z' },
      { id: 2, field: 'version_souhaitee', old_value: null, new_value: 'FAH_26.20', performed_at: '2026-03-23T09:00:00Z' },
    ];
    const stmt = { get: vi.fn(), all: vi.fn(() => entries), run: vi.fn() };
    const db = { prepare: vi.fn(() => stmt) };
    vi.mocked(getDb).mockReturnValue(db as ReturnType<typeof getDb>);

    const res = await request(app).get('/bugs/42/audit');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].field).toBe('priority');
    expect(res.body[1].field).toBe('version_souhaitee');
  });

  it('retourne un tableau vide si aucun audit', async () => {
    const stmt = { get: vi.fn(), all: vi.fn(() => []), run: vi.fn() };
    const db = { prepare: vi.fn(() => stmt) };
    vi.mocked(getDb).mockReturnValue(db as ReturnType<typeof getDb>);

    const res = await request(app).get('/bugs/42/audit');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('retourne 400 si l\'ID n\'est pas un entier', async () => {
    const db = makeDb();
    vi.mocked(getDb).mockReturnValue(db as ReturnType<typeof getDb>);

    const res = await request(app).get('/bugs/abc/audit');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

// ─── GET /bugs/:id ─────────────────────────────────────────────────────────────

describe('GET /bugs/:id', () => {
  beforeEach(() => vi.resetAllMocks());

  it('retourne le bug complet si trouvé', async () => {
    const bug = { id: 42, title: 'Bug critique', state: 'Active', priority: 2,
      team: 'COCO', area_path: 'Proj\\COCO', iteration_path: 'Proj\\2025-2026\\PI2\\PI2-SP4',
      sprint: 'PI2-SP4', sprint_done: null, found_in: '26.10', integration_build: null,
      version_souhaitee: 'FAH_26.20', resolved_reason: null, raison_origine: null,
      assigned_to: 'Jean Dupont', created_date: '2026-01-01T00:00:00Z',
      resolved_date: null, changed_date: '2026-03-01T00:00:00Z',
      filiere: null, raw_json: '{}', last_synced_at: '2026-03-24T09:00:00Z' };
    const stmt = { get: vi.fn(() => bug), all: vi.fn(), run: vi.fn() };
    const db = { prepare: vi.fn(() => stmt) };
    vi.mocked(getDb).mockReturnValue(db as ReturnType<typeof getDb>);

    const res = await request(app).get('/bugs/42');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(42);
    expect(res.body.title).toBe('Bug critique');
    expect(res.body.version_souhaitee).toBe('FAH_26.20');
  });

  it('retourne 404 si le bug est introuvable', async () => {
    const stmt = { get: vi.fn(() => undefined), all: vi.fn(), run: vi.fn() };
    const db = { prepare: vi.fn(() => stmt) };
    vi.mocked(getDb).mockReturnValue(db as ReturnType<typeof getDb>);

    const res = await request(app).get('/bugs/9999');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('retourne 400 si l\'ID n\'est pas un entier', async () => {
    const db = makeDb();
    vi.mocked(getDb).mockReturnValue(db as ReturnType<typeof getDb>);

    const res = await request(app).get('/bugs/not-a-number');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});
