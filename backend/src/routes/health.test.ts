import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import healthRouter from './health';

const app = express();
app.use(express.json());
app.use('/', healthRouter);

describe('GET /health', () => {
  it('returns { status: "ok" } and exposes last_sync_at', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('last_sync_at');
  });
});
