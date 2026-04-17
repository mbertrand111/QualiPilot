import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

vi.mock('../db');
vi.mock('../middleware/security', () => ({
  requireApiKey: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
vi.mock('../services/releaseVersionSettings', () => ({
  getReleaseVersionSettings: vi.fn(() => ({ selectedVersions: ['FAH_26.20'] })),
  updateReleaseVersionSettings: vi.fn((_, versions) => ({ selectedVersions: versions })),
}));
vi.mock('../services/sprintCalendar', () => ({
  getSprintCalendarSettings: vi.fn(() => []),
  updateSprintCalendarSettings: vi.fn(() => []),
}));
vi.mock('../services/conformityRuleSettings', () => ({
  getConformityRuleSettings: vi.fn(() => [{ code: 'PRIORITY_CHECK', active: true }]),
  updateConformityRuleActive: vi.fn((_db, code, active) => ({ code, active })),
}));
vi.mock('../services/conformity', () => ({
  runConformityCheck: vi.fn(),
}));

import { getReleaseVersionSettings, updateReleaseVersionSettings } from '../services/releaseVersionSettings';
import { getSprintCalendarSettings, updateSprintCalendarSettings } from '../services/sprintCalendar';
import { getConformityRuleSettings, updateConformityRuleActive } from '../services/conformityRuleSettings';
import { getDb } from '../db';
import settingsRouter from './settings';

const app = express();
app.use(express.json());
app.use('/', settingsRouter);

function makeDb() {
  return { prepare: vi.fn(() => ({ get: vi.fn(), all: vi.fn(() => []), run: vi.fn() })) };
}

// ─── GET /settings/release-versions ──────────────────────────────────────────

describe('GET /settings/release-versions', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('retourne les versions actives', async () => {
    vi.mocked(getDb).mockReturnValue(makeDb() as unknown as ReturnType<typeof getDb>);
    vi.mocked(getReleaseVersionSettings).mockReturnValueOnce({ selectedVersions: ['FAH_26.20'] } as never);

    const res = await request(app).get('/settings/release-versions');

    expect(res.status).toBe(200);
    expect(res.body.selectedVersions).toContain('FAH_26.20');
  });

  it('retourne 500 si le service échoue', async () => {
    vi.mocked(getDb).mockReturnValue(makeDb() as unknown as ReturnType<typeof getDb>);
    vi.mocked(getReleaseVersionSettings).mockImplementationOnce(() => { throw new Error('DB down'); });

    const res = await request(app).get('/settings/release-versions');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});

// ─── PATCH /settings/release-versions ────────────────────────────────────────

describe('PATCH /settings/release-versions', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('met à jour les versions et retourne le résultat', async () => {
    vi.mocked(getDb).mockReturnValue(makeDb() as unknown as ReturnType<typeof getDb>);
    vi.mocked(updateReleaseVersionSettings).mockReturnValueOnce({ selectedVersions: ['FAH_26.20', 'FAH_25.30'] } as never);

    const res = await request(app)
      .patch('/settings/release-versions')
      .send({ selectedVersions: ['FAH_26.20', 'FAH_25.30'] });

    expect(res.status).toBe(200);
    expect(res.body.selectedVersions).toHaveLength(2);
  });

  it('retourne 400 si selectedVersions est absent', async () => {
    const res = await request(app).patch('/settings/release-versions').send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

// ─── GET /settings/sprint-calendar ───────────────────────────────────────────

describe('GET /settings/sprint-calendar', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('retourne le calendrier des sprints', async () => {
    vi.mocked(getDb).mockReturnValue(makeDb() as unknown as ReturnType<typeof getDb>);
    vi.mocked(getSprintCalendarSettings).mockReturnValueOnce([
      { id: 1, sprintName: 'PI1-SP1', startDate: '2025-09-01', endDate: '2025-09-14', active: true },
    ] as never);

    const res = await request(app).get('/settings/sprint-calendar');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].sprintName).toBe('PI1-SP1');
  });
});

// ─── PATCH /settings/sprint-calendar ─────────────────────────────────────────

describe('PATCH /settings/sprint-calendar', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('met à jour le calendrier et retourne le résultat', async () => {
    vi.mocked(getDb).mockReturnValue(makeDb() as unknown as ReturnType<typeof getDb>);
    vi.mocked(updateSprintCalendarSettings).mockReturnValueOnce([{ id: 1 }] as never);

    const res = await request(app)
      .patch('/settings/sprint-calendar')
      .send({ entries: [{ id: 1, startDate: '2025-09-01', endDate: '2025-09-14', active: true }] });

    expect(res.status).toBe(200);
  });

  it('retourne 400 si entries est absent', async () => {
    const res = await request(app).patch('/settings/sprint-calendar').send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

// ─── GET /settings/conformity-rules ──────────────────────────────────────────

describe('GET /settings/conformity-rules', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('retourne les règles de conformité', async () => {
    vi.mocked(getDb).mockReturnValue(makeDb() as unknown as ReturnType<typeof getDb>);
    vi.mocked(getConformityRuleSettings).mockReturnValueOnce([
      { code: 'PRIORITY_CHECK', description: 'Priorité doit être 2', active: true, severity: 'error' },
    ] as never);

    const res = await request(app).get('/settings/conformity-rules');

    expect(res.status).toBe(200);
    expect(res.body[0].code).toBe('PRIORITY_CHECK');
  });
});

// ─── PATCH /settings/conformity-rules ────────────────────────────────────────

describe('PATCH /settings/conformity-rules', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('active une règle', async () => {
    vi.mocked(getDb).mockReturnValue(makeDb() as unknown as ReturnType<typeof getDb>);
    vi.mocked(updateConformityRuleActive).mockReturnValueOnce({ code: 'PRIORITY_CHECK', active: false } as never);

    const res = await request(app)
      .patch('/settings/conformity-rules')
      .send({ code: 'PRIORITY_CHECK', active: false });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe('PRIORITY_CHECK');
  });

  it('retourne 400 si code est absent', async () => {
    const res = await request(app)
      .patch('/settings/conformity-rules')
      .send({ active: true });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('retourne 400 si active n\'est pas un booléen', async () => {
    const res = await request(app)
      .patch('/settings/conformity-rules')
      .send({ code: 'PRIORITY_CHECK', active: 'yes' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});
