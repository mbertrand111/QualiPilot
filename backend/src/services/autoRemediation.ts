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

const RULE_BY_FIELD: Record<'priority' | 'integration_build', string> = {
  priority: 'PRIORITY_CHECK',
  integration_build: 'INTEGRATION_BUILD_NOT_EMPTIED',
};

function getAutoRuleFlags(db: ReturnType<typeof getDb>): { priority: boolean; integration_build: boolean } {
  const rows = db.prepare(`
    SELECT code, active
    FROM conformity_rules
    WHERE code IN (?, ?)
  `).all(RULE_BY_FIELD.priority, RULE_BY_FIELD.integration_build) as Array<{ code: string; active: number }>;

  const flags = {
    priority: true,
    integration_build: true,
  };

  for (const row of rows) {
    if (row.code === RULE_BY_FIELD.priority) {
      flags.priority = row.active === 1;
    } else if (row.code === RULE_BY_FIELD.integration_build) {
      flags.integration_build = row.active === 1;
    }
  }
  return flags;
}

function logAutoFix(
  workItemId: number,
  ruleCode: string,
  field: string,
  oldValue: string | null,
  newValue: string | null,
  trigger: AutoRemediationTrigger,
  runId: number,
): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO auto_fix_audit (work_item_id, rule_code, field, old_value, new_value, run_id, trigger_source, performed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(workItemId, ruleCode, field, oldValue, newValue, runId, trigger);
}

export async function runAutoRemediation(trigger: AutoRemediationTrigger): Promise<AutoRemediationRunResult> {
  const runAt = new Date().toISOString();
  const db = getDb();

  const runInsert = db.prepare(`
    INSERT INTO auto_remediation_runs (
      trigger_source, run_at, skipped,
      priority_attempted, priority_updated, priority_failed,
      integration_attempted, integration_updated, integration_failed,
      total_updated
    ) VALUES (?, ?, 0, 0, 0, 0, 0, 0, 0, 0)
  `);
  const runId = Number(runInsert.run(trigger, runAt).lastInsertRowid);

  const persistRun = db.prepare(`
    UPDATE auto_remediation_runs
    SET skipped = ?,
        priority_attempted = ?,
        priority_updated = ?,
        priority_failed = ?,
        integration_attempted = ?,
        integration_updated = ?,
        integration_failed = ?,
        total_updated = ?
    WHERE id = ?
  `);

  if (running) {
    const skippedResult: AutoRemediationRunResult = {
      trigger,
      runAt,
      skipped: true,
      priority: { attempted: 0, updated: 0, failed: 0 },
      integration_build: { attempted: 0, updated: 0, failed: 0 },
      totalUpdated: 0,
    };
    persistRun.run(
      1,
      skippedResult.priority.attempted,
      skippedResult.priority.updated,
      skippedResult.priority.failed,
      skippedResult.integration_build.attempted,
      skippedResult.integration_build.updated,
      skippedResult.integration_build.failed,
      skippedResult.totalUpdated,
      runId,
    );
    return skippedResult;
  }

  running = true;

  const result: AutoRemediationRunResult = {
    trigger,
    runAt,
    skipped: false,
    priority: { attempted: 0, updated: 0, failed: 0 },
    integration_build: { attempted: 0, updated: 0, failed: 0 },
    totalUpdated: 0,
  };

  try {
    const enabled = getAutoRuleFlags(db);

    if (enabled.priority) {
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
          logAutoFix(
            row.id,
            RULE_BY_FIELD.priority,
            'priority',
            write.old_value,
            write.new_value,
            trigger,
            runId,
          );
        } catch (e) {
          result.priority.failed += 1;
          logger.warn({ err: e, bugId: row.id, field: 'priority', trigger }, 'Auto-remediation write failed');
        }
      }
    }

    if (enabled.integration_build) {
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
          logAutoFix(
            row.id,
            RULE_BY_FIELD.integration_build,
            'integration_build',
            write.old_value,
            write.new_value,
            trigger,
            runId,
          );
        } catch (e) {
          result.integration_build.failed += 1;
          logger.warn({ err: e, bugId: row.id, field: 'integration_build', trigger }, 'Auto-remediation write failed');
        }
      }
    }

    result.totalUpdated = result.priority.updated + result.integration_build.updated;

    try { runConformityCheck(); } catch { /* non bloquant */ }

    logger.info({ result }, 'Auto-remediation completed');
    return result;
  } finally {
    persistRun.run(
      result.skipped ? 1 : 0,
      result.priority.attempted,
      result.priority.updated,
      result.priority.failed,
      result.integration_build.attempted,
      result.integration_build.updated,
      result.integration_build.failed,
      result.totalUpdated,
      runId,
    );
    running = false;
  }
}
