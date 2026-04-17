import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

vi.mock('../db');

// Mock partiel : on garde WRITABLE_FIELDS réel (utilisé dans la route pour la validation)
// et on mock uniquement les fonctions d'écriture
vi.mock('../services/adoWrite', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/adoWrite')>();
  return { ...actual, writeField: vi.fn(), bulkWriteField: vi.fn() };
});

import { writeField, bulkWriteField } from '../services/adoWrite';
import writeRouter from './write';

const app = express();
app.use(express.json());
app.use('/', writeRouter);

// ─── PATCH /bugs/:id/fields ───────────────────────────────────────────────────

describe('PATCH /bugs/:id/fields', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('met à jour un champ et retourne le résultat', async () => {
    vi.mocked(writeField).mockResolvedValueOnce({
      bug_id: 42, field: 'priority', old_value: '3', new_value: '2',
    });

    const res = await request(app)
      .patch('/bugs/42/fields')
      .send({ field: 'priority', value: 2 });

    expect(res.status).toBe(200);
    expect(res.body.bug_id).toBe(42);
    expect(res.body.field).toBe('priority');
    expect(res.body.old_value).toBe('3');
    expect(res.body.new_value).toBe('2');
  });

  it('retourne 400 si field est absent', async () => {
    const res = await request(app).patch('/bugs/42/fields').send({ value: 2 });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('retourne 400 si field est non autorisé', async () => {
    const res = await request(app).patch('/bugs/42/fields').send({ field: 'state', value: 'Active' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('non autorisé');
  });

  it('retourne 400 si value invalide (priority hors 1-4)', async () => {
    const res = await request(app).patch('/bugs/42/fields').send({ field: 'priority', value: 99 });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('retourne 400 si ID non numérique', async () => {
    const res = await request(app).patch('/bugs/abc/fields').send({ field: 'priority', value: 2 });
    expect(res.status).toBe(400);
  });

  it('retourne 404 si le bug est introuvable', async () => {
    vi.mocked(writeField).mockRejectedValueOnce(new Error('Bug 9999 introuvable'));
    const res = await request(app).patch('/bugs/9999/fields').send({ field: 'priority', value: 2 });
    expect(res.status).toBe(404);
  });

  it('retourne 502 en cas d\'erreur ADO', async () => {
    const { AdoError } = await import('../services/azureDevOps');
    vi.mocked(writeField).mockRejectedValueOnce(new AdoError('ADO write failed: 403 Forbidden', 403));
    const res = await request(app).patch('/bugs/42/fields').send({ field: 'priority', value: 2 });
    expect(res.status).toBe(502);
    expect(res.body.error).toContain('ADO write failed');
  });

  it('accepte version_souhaitee comme champ modifiable', async () => {
    vi.mocked(writeField).mockResolvedValueOnce({
      bug_id: 42, field: 'version_souhaitee', old_value: null, new_value: 'FAH_26.20',
    });
    const res = await request(app).patch('/bugs/42/fields').send({ field: 'version_souhaitee', value: 'FAH_26.20' });
    expect(res.status).toBe(200);
  });

  it('accepte integration_build comme champ modifiable', async () => {
    vi.mocked(writeField).mockResolvedValueOnce({
      bug_id: 42, field: 'integration_build', old_value: null, new_value: '-',
    });
    const res = await request(app).patch('/bugs/42/fields').send({ field: 'integration_build', value: '-' });
    expect(res.status).toBe(200);
  });
});

// ─── POST /bugs/bulk-fields ───────────────────────────────────────────────────

describe('POST /bugs/bulk-fields', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('met à jour plusieurs bugs et retourne le résumé', async () => {
    vi.mocked(bulkWriteField).mockResolvedValueOnce({ updated: 3, failed: [] });

    const res = await request(app)
      .post('/bugs/bulk-fields')
      .send({ ids: [1, 2, 3], field: 'priority', value: 2 });

    expect(res.status).toBe(200);
    expect(res.body.updated).toBe(3);
    expect(res.body.failed).toEqual([]);
  });

  it('retourne les bugs en échec sans bloquer les autres', async () => {
    vi.mocked(bulkWriteField).mockResolvedValueOnce({
      updated: 2,
      failed: [{ bug_id: 3, error: 'Bug 3 introuvable' }],
    });

    const res = await request(app)
      .post('/bugs/bulk-fields')
      .send({ ids: [1, 2, 3], field: 'priority', value: 2 });

    expect(res.status).toBe(200);
    expect(res.body.updated).toBe(2);
    expect(res.body.failed).toHaveLength(1);
  });

  it('retourne 400 si ids est vide', async () => {
    const res = await request(app).post('/bugs/bulk-fields').send({ ids: [], field: 'priority', value: 2 });
    expect(res.status).toBe(400);
  });

  it('retourne 400 si plus de 200 ids', async () => {
    const ids = Array.from({ length: 201 }, (_, i) => i + 1);
    const res = await request(app).post('/bugs/bulk-fields').send({ ids, field: 'priority', value: 2 });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('200');
  });

  it('retourne 400 si field non autorisé', async () => {
    const res = await request(app).post('/bugs/bulk-fields').send({ ids: [1, 2], field: 'state', value: 'Closed' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('non autorisé');
  });

  it('accepte bulk version_souhaitee', async () => {
    vi.mocked(bulkWriteField).mockResolvedValueOnce({ updated: 2, failed: [] });
    const res = await request(app)
      .post('/bugs/bulk-fields')
      .send({ ids: [1, 2], field: 'version_souhaitee', value: 'FAH_26.20' });
    expect(res.status).toBe(200);
    expect(res.body.updated).toBe(2);
  });

  it('accepte bulk integration_build', async () => {
    vi.mocked(bulkWriteField).mockResolvedValueOnce({ updated: 2, failed: [] });
    const res = await request(app)
      .post('/bugs/bulk-fields')
      .send({ ids: [1, 2], field: 'integration_build', value: '-' });
    expect(res.status).toBe(200);
  });
});

