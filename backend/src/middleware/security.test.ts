import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

describe('requireApiKey middleware', () => {
  const previousKey = process.env.QUALIPILOT_WRITE_API_KEY;

  beforeEach(() => {
    vi.resetModules();
    delete process.env.QUALIPILOT_WRITE_API_KEY;
  });

  afterEach(() => {
    if (previousKey === undefined) delete process.env.QUALIPILOT_WRITE_API_KEY;
    else process.env.QUALIPILOT_WRITE_API_KEY = previousKey;
  });

  it('allows requests when no API key is configured', async () => {
    const { requireApiKey } = await import('./security');
    const app = express();
    app.post('/protected', requireApiKey, (_req, res) => res.json({ ok: true }));

    const res = await request(app).post('/protected');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('rejects requests with missing key when configured', async () => {
    process.env.QUALIPILOT_WRITE_API_KEY = 'secret';
    const { requireApiKey } = await import('./security');
    const app = express();
    app.post('/protected', requireApiKey, (_req, res) => res.json({ ok: true }));

    const res = await request(app).post('/protected');
    expect(res.status).toBe(401);
  });

  it('allows requests with the correct Bearer token', async () => {
    process.env.QUALIPILOT_WRITE_API_KEY = 'my-secret';
    const { requireApiKey } = await import('./security');
    const app = express();
    app.post('/protected', requireApiKey, (_req, res) => res.json({ ok: true }));

    const res = await request(app).post('/protected').set('Authorization', 'Bearer my-secret');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('rejects requests with wrong Bearer token', async () => {
    process.env.QUALIPILOT_WRITE_API_KEY = 'my-secret';
    const { requireApiKey } = await import('./security');
    const app = express();
    app.post('/protected', requireApiKey, (_req, res) => res.json({ ok: true }));

    const res = await request(app).post('/protected').set('Authorization', 'Bearer wrong-secret');
    expect(res.status).toBe(401);
  });
});
