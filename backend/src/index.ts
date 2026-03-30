import 'dotenv/config';
import express from 'express';
import router from './routes';
import logger from './logger';
import { runAutoRemediation } from './services/autoRemediation';

const app = express();
const PORT = process.env.PORT_BACKEND ?? 3001;

app.use(express.json());
app.use('/api', router);

const AUTO_REMEDIATION_INTERVAL_MS = 15 * 60 * 1000;

function scheduleAutoRemediation(): void {
  // Run once shortly after startup
  setTimeout(() => {
    runAutoRemediation('scheduler').catch((err) => {
      logger.error({ err }, 'Auto-remediation startup run failed');
    });
  }, 10_000);

  // Run every 15 minutes while backend is active
  const interval = setInterval(() => {
    runAutoRemediation('scheduler').catch((err) => {
      logger.error({ err }, 'Auto-remediation scheduled run failed');
    });
  }, AUTO_REMEDIATION_INTERVAL_MS);
  interval.unref();
}

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  scheduleAutoRemediation();
});

export default app;
