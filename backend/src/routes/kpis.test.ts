import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

vi.mock('../db');
vi.mock('../services/kpis', () => ({
  defectDebtByPi: vi.fn(() => []),
  backlogEvolution: vi.fn(() => []),
  closedByPi: vi.fn(() => []),
  piFollowup: vi.fn(() => []),
  pointBacklog: vi.fn(() => ({})),
  teamBacklogs: vi.fn(() => []),
  terrainReturnsByExercise: vi.fn(() => []),
  retentionKpis: vi.fn(() => ({})),
}));

import {
  defectDebtByPi, backlogEvolution, closedByPi, piFollowup,
  pointBacklog, teamBacklogs, terrainReturnsByExercise, retentionKpis,
} from '../services/kpis';
import { getDb } from '../db';
import kpisRouter from './kpis';

const app = express();
app.use(express.json());
app.use('/', kpisRouter);

function makeDb() {
  return { prepare: vi.fn(() => ({ get: vi.fn(), all: vi.fn(() => []), run: vi.fn() })) };
}

describe('GET /kpis/defect-debt', () => {
  it('retourne le résultat du service', async () => {
    vi.mocked(getDb).mockReturnValue(makeDb() as unknown as ReturnType<typeof getDb>);
    vi.mocked(defectDebtByPi).mockReturnValueOnce([{ pi: 'PI1', live: 10, onpremise: 5 }] as never);

    const res = await request(app).get('/kpis/defect-debt');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].pi).toBe('PI1');
  });

  it('retourne 500 si le service échoue', async () => {
    vi.mocked(getDb).mockReturnValue(makeDb() as unknown as ReturnType<typeof getDb>);
    vi.mocked(defectDebtByPi).mockImplementationOnce(() => { throw new Error('DB down'); });

    const res = await request(app).get('/kpis/defect-debt');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});

describe('GET /kpis/backlog-evolution', () => {
  it('accepte les paramètres months et granularity', async () => {
    vi.mocked(getDb).mockReturnValue(makeDb() as unknown as ReturnType<typeof getDb>);
    vi.mocked(backlogEvolution).mockReturnValueOnce([]);

    const res = await request(app).get('/kpis/backlog-evolution?months=6&granularity=month');

    expect(res.status).toBe(200);
    expect(vi.mocked(backlogEvolution)).toHaveBeenCalledWith(expect.anything(), 6, 'month');
  });

  it('utilise les valeurs par défaut si params absents', async () => {
    vi.mocked(getDb).mockReturnValue(makeDb() as unknown as ReturnType<typeof getDb>);
    vi.mocked(backlogEvolution).mockReturnValueOnce([]);

    await request(app).get('/kpis/backlog-evolution');

    expect(vi.mocked(backlogEvolution)).toHaveBeenCalledWith(expect.anything(), 12, 'week');
  });
});

describe('GET /kpis/closed-by-pi', () => {
  it('retourne le résultat du service', async () => {
    vi.mocked(getDb).mockReturnValue(makeDb() as unknown as ReturnType<typeof getDb>);
    vi.mocked(closedByPi).mockReturnValueOnce([{ pi: 'PI2', closed: 8 }] as never);

    const res = await request(app).get('/kpis/closed-by-pi');

    expect(res.status).toBe(200);
    expect(res.body[0].pi).toBe('PI2');
  });
});

describe('GET /kpis/pi-followup', () => {
  it('retourne le résultat du service', async () => {
    vi.mocked(getDb).mockReturnValue(makeDb() as unknown as ReturnType<typeof getDb>);
    vi.mocked(piFollowup).mockReturnValueOnce([] as never);

    const res = await request(app).get('/kpis/pi-followup');

    expect(res.status).toBe(200);
  });
});

describe('GET /kpis/point-backlog', () => {
  it('retourne le résultat du service', async () => {
    vi.mocked(getDb).mockReturnValue(makeDb() as unknown as ReturnType<typeof getDb>);
    vi.mocked(pointBacklog).mockReturnValueOnce({ total: 42 } as never);

    const res = await request(app).get('/kpis/point-backlog');

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(42);
  });
});

describe('GET /kpis/team-backlogs', () => {
  it('retourne le résultat du service', async () => {
    vi.mocked(getDb).mockReturnValue(makeDb() as unknown as ReturnType<typeof getDb>);
    vi.mocked(teamBacklogs).mockReturnValueOnce([{ team: 'COCO', count: 5 }] as never);

    const res = await request(app).get('/kpis/team-backlogs');

    expect(res.status).toBe(200);
    expect(res.body[0].team).toBe('COCO');
  });
});

describe('GET /kpis/terrain-returns', () => {
  it('retourne le résultat du service', async () => {
    vi.mocked(getDb).mockReturnValue(makeDb() as unknown as ReturnType<typeof getDb>);
    vi.mocked(terrainReturnsByExercise).mockReturnValueOnce([] as never);

    const res = await request(app).get('/kpis/terrain-returns');

    expect(res.status).toBe(200);
  });
});

describe('GET /kpis/retention', () => {
  it('retourne le résultat du service', async () => {
    vi.mocked(getDb).mockReturnValue(makeDb() as unknown as ReturnType<typeof getDb>);
    vi.mocked(retentionKpis).mockReturnValueOnce({ rate: 0.8 } as never);

    const res = await request(app).get('/kpis/retention');

    expect(res.status).toBe(200);
    expect(res.body.rate).toBe(0.8);
  });
});
