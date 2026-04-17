import { Router } from 'express';
import { runSync } from '../services/sync';
import { runAutoRemediation } from '../services/autoRemediation';
import { AdoError } from '../services/azureDevOps';
import { captureKpiTeamBacklogSnapshotIfDue } from '../services/kpiHistory';
import logger from '../logger';
import { requireApiKey } from '../middleware/security';

const router = Router();

router.post('/sync', requireApiKey, async (_req, res) => {
  try {
    const syncResult = await runSync();
    let autoRemediation: unknown = null;
    let kpiHistoryCapture: unknown = null;
    try {
      autoRemediation = await runAutoRemediation('sync');
    } catch (err) {
      logger.error({ err }, 'Auto-remediation failed after sync');
      autoRemediation = { error: err instanceof Error ? err.message : 'Erreur auto-remediation' };
    }
    try {
      kpiHistoryCapture = captureKpiTeamBacklogSnapshotIfDue('sync');
    } catch (err) {
      logger.error({ err }, 'KPI history capture failed after sync');
      kpiHistoryCapture = { error: err instanceof Error ? err.message : 'Erreur capture KPI' };
    }
    res.json({ ...syncResult, autoRemediation, kpiHistoryCapture });
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
