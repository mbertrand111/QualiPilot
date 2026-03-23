import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import healthRouter from './health';

const app = express();
app.use(express.json());
app.use('/', healthRouter);

describe('GET /health', () => {
  it('returns { status: "ok" }', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
