import { Router } from 'express';
import { runSync } from '../services/sync';
import { runAutoRemediation } from '../services/autoRemediation';
import { AdoError } from '../services/azureDevOps';
import logger from '../logger';

const router = Router();

router.post('/sync', async (_req, res) => {
  try {
    const syncResult = await runSync();
    let autoRemediation: unknown = null;
    try {
      autoRemediation = await runAutoRemediation('sync');
    } catch (err) {
      logger.error({ err }, 'Auto-remediation failed after sync');
      autoRemediation = { error: err instanceof Error ? err.message : 'Erreur auto-remediation' };
    }
    res.json({ ...syncResult, autoRemediation });
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
