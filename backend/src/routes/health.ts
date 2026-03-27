import { Router } from 'express';
import { getDb } from '../db';

const router = Router();

router.get('/health', (_req, res) => {
  try {
    const db = getDb();
    const row = db.prepare(`SELECT MAX(last_synced_at) AS last_sync_at FROM bugs_cache`).get() as { last_sync_at: string | null };
    res.json({ status: 'ok', last_sync_at: row?.last_sync_at ?? null });
  } catch {
    res.json({ status: 'ok', last_sync_at: null });
  }
});

export default router;
