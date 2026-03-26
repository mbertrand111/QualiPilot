import { Router } from 'express';
import { runSync } from '../services/sync';
import { AdoError } from '../services/azureDevOps';
import logger from '../logger';

const router = Router();

router.post('/sync', async (_req, res) => {
  try {
    const result = await runSync();
    res.json(result);
  } catch (err) {
    if (err instanceof AdoError) {
      logger.error({ err }, 'ADO sync failed');
      res.status(502).json({ error: err.message });
      return;
    }
    logger.error({ err }, 'Unexpected error during sync');
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error during sync' });
  }
});

export default router;
