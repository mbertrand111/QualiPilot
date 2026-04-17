import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import syncRouter from './sync';

vi.mock('../services/sync');
vi.mock('../services/autoRemediation');
vi.mock('../services/kpiHistory');

import { runSync } from '../services/sync';
import { runAutoRemediation } from '../services/autoRemediation';
import { captureKpiTeamBacklogSnapshotIfDue } from '../services/kpiHistory';

const app = express();
app.use(express.json());
app.use('/', syncRouter);

describe('POST /api/sync', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(runAutoRemediation).mockResolvedValue({
      trigger: 'sync',
      runAt: '2026-03-24T09:30:00.000Z',
      skipped: false,
      totalUpdated: 0,
      priority: { attempted: 0, updated: 0, failed: 0 },
      integration_build: { attempted: 0, updated: 0, failed: 0 },
    });
    vi.mocked(captureKpiTeamBacklogSnapshotIfDue).mockReturnValue({
      captured: false,
      reason: 'not_friday',
      sprintName: null,
      snapshotDate: '2026-03-24',
      snapshotId: null,
      liveAreaBugs: 0,
    });
  });

  it('retourne le nombre de bugs synchronisés', async () => {
    vi.mocked(runSync).mockResolvedValueOnce({
      synced: 42,
      lastSyncAt: '2026-03-24T09:30:00.000Z',
    });

    const res = await request(app).post('/sync');

    expect(res.status).toBe(200);
    expect(res.body.synced).toBe(42);
    expect(res.body.lastSyncAt).toBe('2026-03-24T09:30:00.000Z');
    expect(res.body).toHaveProperty('autoRemediation');
    expect(res.body).toHaveProperty('kpiHistoryCapture');
  });

  it("retourne 502 en cas d'erreur d'auth ADO", async () => {
    const { AdoError } = await import('../services/azureDevOps');
    vi.mocked(runSync).mockRejectedValueOnce(
      new AdoError('ADO authentication failed — vérifier ADO_PAT dans .env', 401),
    );

    const res = await request(app).post('/sync');

    expect(res.status).toBe(502);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toContain('ADO authentication failed');
  });

  it('retourne 200 avec synced=0 si aucun bug dans ADO', async () => {
    vi.mocked(runSync).mockResolvedValueOnce({
      synced: 0,
      lastSyncAt: '2026-03-24T09:30:00.000Z',
    });

    const res = await request(app).post('/sync');

    expect(res.status).toBe(200);
    expect(res.body.synced).toBe(0);
  });
});
