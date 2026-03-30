import { getDb } from '../db';
import logger from '../logger';
import { writeField } from './adoWrite';
import { runConformityCheck } from './conformity';

export type AutoRemediationTrigger = 'sync' | 'scheduler';

export interface AutoRemediationRunResult {
  trigger: AutoRemediationTrigger;
  runAt: string;
  skipped: boolean;
  priority: { attempted: number; updated: number; failed: number };
  integration_build: { attempted: number; updated: number; failed: number };
  totalUpdated: number;
}

let running = false;

function logAutoFix(
  workItemId: number,
  field: string,
  oldValue: string | null,
  newValue: string | null,
  trigger: AutoRemediationTrigger,
): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO auto_fix_audit (work_item_id, field, old_value, new_value, trigger_source, performed_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).run(workItemId, field, oldValue, newValue, trigger);
}

export async function runAutoRemediation(trigger: AutoRemediationTrigger): Promise<AutoRemediationRunResult> {
  const runAt = new Date().toISOString();
  if (running) {
    return {
      trigger,
      runAt,
      skipped: true,
      priority: { attempted: 0, updated: 0, failed: 0 },
      integration_build: { attempted: 0, updated: 0, failed: 0 },
      totalUpdated: 0,
    };
  }

  running = true;
  const db = getDb();

  const result: AutoRemediationRunResult = {
    trigger,
    runAt,
    skipped: false,
    priority: { attempted: 0, updated: 0, failed: 0 },
    integration_build: { attempted: 0, updated: 0, failed: 0 },
    totalUpdated: 0,
  };

  try {
    const priorityCandidates = db.prepare(`
      SELECT id
      FROM bugs_cache
      WHERE priority IS NULL OR priority <> 2
      ORDER BY id ASC
    `).all() as { id: number }[];

    result.priority.attempted = priorityCandidates.length;
    for (const row of priorityCandidates) {
      try {
        const write = await writeField(row.id, 'priority', 2, { runConformity: false });
        result.priority.updated += 1;
        logAutoFix(row.id, 'priority', write.old_value, write.new_value, trigger);
      } catch (e) {
        result.priority.failed += 1;
        logger.warn({ err: e, bugId: row.id, field: 'priority', trigger }, 'Auto-remediation write failed');
      }
    }

    const buildCandidates = db.prepare(`
      SELECT id
      FROM bugs_cache
      WHERE state IN ('New', 'Active')
        AND integration_build IS NOT NULL
        AND TRIM(integration_build) <> ''
      ORDER BY id ASC
    `).all() as { id: number }[];

    result.integration_build.attempted = buildCandidates.length;
    for (const row of buildCandidates) {
      try {
        const write = await writeField(row.id, 'integration_build', '', { runConformity: false });
        result.integration_build.updated += 1;
        logAutoFix(row.id, 'integration_build', write.old_value, write.new_value, trigger);
      } catch (e) {
        result.integration_build.failed += 1;
        logger.warn({ err: e, bugId: row.id, field: 'integration_build', trigger }, 'Auto-remediation write failed');
      }
    }

    result.totalUpdated = result.priority.updated + result.integration_build.updated;

    try { runConformityCheck(); } catch { /* non bloquant */ }

    logger.info({ result }, 'Auto-remediation completed');
    return result;
  } finally {
    running = false;
  }
}

