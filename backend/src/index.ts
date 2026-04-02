import 'dotenv/config';
import express from 'express';
import router from './routes';
import logger from './logger';
import { runAutoRemediation } from './services/autoRemediation';
import { captureKpiTeamBacklogSnapshotIfDue } from './services/kpiHistory';
import { runSync } from './services/sync';

const app = express();
const PORT = process.env.PORT_BACKEND ?? 3001;

app.use(express.json());
app.use('/api', router);

const AUTO_REMEDIATION_INTERVAL_MS = 15 * 60 * 1000;
const AUTO_SYNC_INTERVAL_MS = 60 * 60 * 1000;
let syncRunning = false;

async function runScheduledSyncCycle(): Promise<void> {
  if (syncRunning) {
    logger.warn('Scheduled sync skipped: previous run still in progress');
    return;
  }

  syncRunning = true;
  try {
    const syncResult = await runSync();
    logger.info({ syncResult }, 'Scheduled sync completed');

    try {
      const auto = await runAutoRemediation('scheduler');
      logger.info({ auto }, 'Auto-remediation completed after scheduled sync');
    } catch (err) {
      logger.error({ err }, 'Auto-remediation failed after scheduled sync');
    }

    try {
      const kpi = captureKpiTeamBacklogSnapshotIfDue('scheduler');
      logger.info({ kpi }, 'KPI history capture completed after scheduled sync');
    } catch (err) {
      logger.error({ err }, 'KPI history capture failed after scheduled sync');
    }
  } catch (err) {
    logger.error({ err }, 'Scheduled sync failed');
  } finally {
    syncRunning = false;
  }
}

function scheduleBackgroundJobs(): void {
  // Startup run: keep auto-remediation quickly available after launch.
  setTimeout(() => {
    runAutoRemediation('scheduler').catch((err) => {
      logger.error({ err }, 'Auto-remediation startup run failed');
    });
    try {
      captureKpiTeamBacklogSnapshotIfDue('scheduler');
    } catch (err) {
      logger.error({ err }, 'KPI history startup capture failed');
    }
  }, 10_000);

  // Startup sync: initializes and updates "Derniere sync" even without manual click.
  setTimeout(() => {
    runScheduledSyncCycle().catch((err) => {
      logger.error({ err }, 'Scheduled sync startup run failed');
    });
  }, 20_000);

  // Run auto-remediation every 15 minutes while backend is active.
  const autoRemediationInterval = setInterval(() => {
    runAutoRemediation('scheduler').catch((err) => {
      logger.error({ err }, 'Auto-remediation scheduled run failed');
    });
    try {
      captureKpiTeamBacklogSnapshotIfDue('scheduler');
    } catch (err) {
      logger.error({ err }, 'KPI history scheduled capture failed');
    }
  }, AUTO_REMEDIATION_INTERVAL_MS);
  autoRemediationInterval.unref();

  // Run full sync every 60 minutes while backend is active.
  const syncInterval = setInterval(() => {
    runScheduledSyncCycle().catch((err) => {
      logger.error({ err }, 'Scheduled sync hourly run failed');
    });
  }, AUTO_SYNC_INTERVAL_MS);
  syncInterval.unref();
}

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  scheduleBackgroundJobs();
});

export default app;
