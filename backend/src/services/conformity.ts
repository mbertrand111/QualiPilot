import { getDb } from '../db';
import logger from '../logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BugRow {
  id: number;
  state: string | null;
  priority: number | null;
  area_path: string | null;
  found_in: string | null;
  integration_build: string | null;
  version_souhaitee: string | null;
  resolved_reason: string | null;
}

interface RuleRow {
  id: number;
  code: string;
  severity: 'error' | 'warning';
  active: number;
  rule_config: string;
}

interface VersionBuildConfig {
  special_build_values?: string[];
  onpremise_major_step?: number;
  live_version_sequence?: string[];
  exception_patch_regex?: string;
}

export interface ConformityCheckResult {
  checkedBugs: number;
  newViolations: number;
  resolvedViolations: number;
  runAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SPECIAL_VERSION_VALUES = new Set([
  '-', 'Non concerné', 'Outil Jbeg', 'Sonarqube', 'Isasite', 'Isacuve Web',
  'git', '12.', '13.8', '14.', 'Migration',
]);

const SPECIAL_BUILD_VALUES = new Set(['-', 'Non concerné', 'Isasite', 'Outil Jbeg', 'Isacuve Web']);

const FAH_VERSION_EXCEPTIONS = new Set([
  '-', 'Non concerné', 'Isasite', 'Outil Jbeg', 'git', 'Isacuve Web', 'Migration',
]);

const CLOSED_STATES = new Set(['Closed', 'Resolved']);
const ACTIVE_STATES = new Set(['New', 'Active']);

const TRIAGE_AREA_PREFIXES = [
  'Isagri_Dev_GC_GestionCommerciale\\Bugs à prioriser',
  'Isagri_Dev_GC_GestionCommerciale\\Bugs à corriger',
] as const;

const CORRIGER_PREFIX    = 'Isagri_Dev_GC_GestionCommerciale\\Bugs à corriger\\';
const VERSIONS_LIVE      = 'Isagri_Dev_GC_GestionCommerciale\\Bugs à corriger\\Versions LIVE';
const VERSIONS_HISTORIQUES = 'Isagri_Dev_GC_GestionCommerciale\\Bugs à corriger\\Versions historiques';

const DEFAULT_LIVE_SEQUENCE = [
  '24.10', '24.20', '24.30',
  '25.10', '25.20', '25.30',
  '26.10', '26.20', '26.30',
];
const DEFAULT_ONPREMISE_MAJOR_STEP = 50;
const DEFAULT_PATCH_EXCEPTION_RE = /^Version FAH_\d+\.\d+ Patch \d+ - Build \d+\.\d+\.\d+-\d+$/;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function t(v: string | null | undefined): string {
  return v?.trim() ?? '';
}

function isValidFahVersionFormat(v: string): boolean {
  const m = v.match(/^FAH_(\d{2})\.(\d+)$/);
  if (!m) return false;
  return parseInt(m[2], 10) % 10 === 0;
}

// ─── Rule Evaluators (exported for unit tests) ────────────────────────────────

/** PRIORITY_CHECK — violation if priority is not exactly 2 */
export function evalPriorityCheck(bug: BugRow): boolean {
  return bug.priority !== 2;
}

/** VERSION_SOUHAITEE_CHECK — violation if version_souhaitee invalid (New/Active bugs only) */
export function evalVersionSouhaiteeCheck(bug: BugRow): boolean {
  if (!ACTIVE_STATES.has(t(bug.state))) return false;
  const v = t(bug.version_souhaitee);
  if (!v) return true;
  if (SPECIAL_VERSION_VALUES.has(v)) return false;
  if (isValidFahVersionFormat(v)) return false;
  if (/^13\.87\.\d+$/.test(v)) return false;
  return true;
}

/** INTEGRATION_BUILD_REQUIRED — violation if Closed/Resolved bug has no integration_build */
export function evalIntegrationBuildRequired(bug: BugRow): boolean {
  if (!CLOSED_STATES.has(t(bug.state))) return false;
  return t(bug.integration_build) === '';
}

/** VERSION_BUILD_COHERENCE — violation if integration_build incoherent with version_souhaitee */
export function evalVersionBuildCoherence(bug: BugRow, rawConfig: string): boolean {
  if (!CLOSED_STATES.has(t(bug.state))) return false;

  const v = t(bug.version_souhaitee);
  const b = t(bug.integration_build);
  if (!v || !b) return false; // handled by other rules

  let cfg: VersionBuildConfig = {};
  try { cfg = JSON.parse(rawConfig) as VersionBuildConfig; } catch { /* ignore */ }

  const specialBuilds = cfg.special_build_values ?? [...SPECIAL_BUILD_VALUES];
  if (SPECIAL_VERSION_VALUES.has(v) || specialBuilds.includes(v)) return false;
  if (SPECIAL_BUILD_VALUES.has(b) || specialBuilds.includes(b)) return false;

  // Patch exception
  const patchRe = cfg.exception_patch_regex
    ? new RegExp(cfg.exception_patch_regex)
    : DEFAULT_PATCH_EXCEPTION_RE;
  if (patchRe.test(b)) return false;

  // ── Live version coherence ─────────────────────────────────────────────────
  const fahMatch = v.match(/^FAH_(\d{2})\.(\d+)$/);
  if (fahMatch) {
    const year  = parseInt(fahMatch[1], 10);
    const minor = parseInt(fahMatch[2], 10);
    const seq   = cfg.live_version_sequence ?? DEFAULT_LIVE_SEQUENCE;
    const vKey  = `${String(year).padStart(2, '0')}.${minor}`;
    const idx   = seq.indexOf(vKey);
    if (idx <= 0) return false; // first in sequence or unknown → skip

    const prevKey   = seq[idx - 1];
    const prevParts = prevKey.split('.');
    const prevYear  = parseInt(prevParts[0], 10);
    const prevMinor = parseInt(prevParts[1], 10);
    // builds are: prevYear.{prevMinor+1}.xxx
    const expectedPrefix = `${prevYear}.${prevMinor + 1}.`;
    return !b.startsWith(expectedPrefix);
  }

  // ── OnPremise version coherence ───────────────────────────────────────────
  const opMatch = v.match(/^13\.87\.(\d+)$/);
  if (opMatch) {
    const targetNum  = parseInt(opMatch[1], 10);
    const step       = cfg.onpremise_major_step ?? DEFAULT_ONPREMISE_MAJOR_STEP;
    const prevMajor  = Math.floor((targetNum - 1) / step) * step;
    const minBuild   = prevMajor + 1;
    const maxBuild   = targetNum - 1;
    const buildMatch = b.match(/^13\.87\.(\d+)/);
    if (!buildMatch) return true; // build doesn't match onpremise format
    const buildNum   = parseInt(buildMatch[1], 10);
    return buildNum < minBuild || buildNum > maxBuild;
  }

  return false; // unknown version format → skip
}

/** INTEGRATION_BUILD_NOT_EMPTIED — violation if New/Active bug has a build filled */
export function evalIntegrationBuildNotEmptied(bug: BugRow): boolean {
  if (!ACTIVE_STATES.has(t(bug.state))) return false;
  return t(bug.integration_build) !== '';
}

/** CLOSED_BUG_COHERENCE — non-corrected closed bug must have "-" in both version and build */
export function evalClosedBugCoherence(bug: BugRow): boolean {
  if (!CLOSED_STATES.has(t(bug.state))) return false;
  const reason = t(bug.resolved_reason);
  if (reason === 'Corrigé' || reason === 'Réalisé') return false;
  const v = t(bug.version_souhaitee);
  const b = t(bug.integration_build);
  return v !== '-' || b !== '-';
}

/** NON_CONCERNE_COHERENCE — "Non concerné" must appear in BOTH fields or NEITHER */
export function evalNonConcerneCoherence(bug: BugRow): boolean {
  const vNC = t(bug.version_souhaitee) === 'Non concerné';
  const bNC = t(bug.integration_build) === 'Non concerné';
  return vNC !== bNC; // XOR = one has it but not the other → violation
}

/** FAH_VERSION_REQUIRED — modern FAH found_in requires FAH in version_souhaitee */
export function evalFahVersionRequired(bug: BugRow): boolean {
  const foundIn = t(bug.found_in);
  if (!foundIn) return false;
  const m = foundIn.match(/^(\d{2})\./);
  if (!m || parseInt(m[1], 10) < 24) return false;
  const v = t(bug.version_souhaitee);
  if (FAH_VERSION_EXCEPTIONS.has(v)) return false;
  if (!v) return true;
  return !v.includes('FAH');
}

/** CLOSED_BUG_IN_TRIAGE_AREA — closed bug in triage area must have version_souhaitee = "-" */
export function evalClosedBugInTriageArea(bug: BugRow): boolean {
  if (t(bug.state) !== 'Closed') return false;
  const area = t(bug.area_path);
  const isTriage = TRIAGE_AREA_PREFIXES.some(p => area === p || area.startsWith(p + '\\'));
  if (!isTriage) return false;
  return t(bug.version_souhaitee) !== '-';
}

/** AREA_PATH_PRODUCT_COHERENCE — bug in Bugs à corriger must be in the right product subfolder */
export function evalAreaPathProductCoherence(bug: BugRow): boolean {
  const area = t(bug.area_path);
  if (!area.startsWith(CORRIGER_PREFIX)) return false; // only applies to subfolders
  const foundIn = t(bug.found_in);
  if (!foundIn) return false;

  const yearMatch = foundIn.match(/^(\d{2})\./);
  if (yearMatch && parseInt(yearMatch[1], 10) >= 25) {
    return !area.startsWith(VERSIONS_LIVE);
  }
  if (foundIn.startsWith('13.')) {
    return !area.startsWith(VERSIONS_HISTORIQUES);
  }
  return false;
}

// ─── Rule Dispatcher ──────────────────────────────────────────────────────────

function evaluateRule(code: string, bug: BugRow, rawConfig: string): boolean {
  switch (code) {
    case 'PRIORITY_CHECK':                return evalPriorityCheck(bug);
    case 'VERSION_SOUHAITEE_CHECK':       return evalVersionSouhaiteeCheck(bug);
    case 'INTEGRATION_BUILD_REQUIRED':    return evalIntegrationBuildRequired(bug);
    case 'VERSION_BUILD_COHERENCE':       return evalVersionBuildCoherence(bug, rawConfig);
    case 'INTEGRATION_BUILD_NOT_EMPTIED': return evalIntegrationBuildNotEmptied(bug);
    case 'CLOSED_BUG_COHERENCE':          return evalClosedBugCoherence(bug);
    case 'NON_CONCERNE_COHERENCE':        return evalNonConcerneCoherence(bug);
    case 'FAH_VERSION_REQUIRED':          return evalFahVersionRequired(bug);
    case 'CLOSED_BUG_IN_TRIAGE_AREA':    return evalClosedBugInTriageArea(bug);
    case 'AREA_PATH_PRODUCT_COHERENCE':  return evalAreaPathProductCoherence(bug);
    default: return false;
  }
}

// ─── Main Conformity Check ────────────────────────────────────────────────────

export function runConformityCheck(): ConformityCheckResult {
  const db = getDb();
  const runAt = new Date().toISOString();

  const bugs = db.prepare(`
    SELECT id, state, priority, area_path, found_in, integration_build,
           version_souhaitee, resolved_reason
    FROM bugs_cache
  `).all() as BugRow[];

  const rules = db.prepare(`
    SELECT id, code, severity, active, rule_config
    FROM conformity_rules WHERE active = 1
  `).all() as RuleRow[];

  if (rules.length === 0) {
    return { checkedBugs: 0, newViolations: 0, resolvedViolations: 0, runAt };
  }

  // Build set of current violations
  const currentViolations = new Map<string, { bug_id: number; rule_id: number }>();
  for (const bug of bugs) {
    for (const rule of rules) {
      if (evaluateRule(rule.code, bug, rule.rule_config)) {
        const key = `${bug.id}:${rule.id}`;
        currentViolations.set(key, { bug_id: bug.id, rule_id: rule.id });
      }
    }
  }

  // Load existing active violations
  const existingActive = db.prepare(`
    SELECT bug_id, rule_id FROM conformity_violations WHERE resolved_at IS NULL
  `).all() as { bug_id: number; rule_id: number }[];
  const existingKeys = new Set(existingActive.map(v => `${v.bug_id}:${v.rule_id}`));

  const upsert = db.prepare(`
    INSERT INTO conformity_violations (bug_id, rule_id, detected_at, resolved_at)
    VALUES (@bug_id, @rule_id, datetime('now'), NULL)
    ON CONFLICT(bug_id, rule_id) DO UPDATE SET
      detected_at = CASE WHEN resolved_at IS NOT NULL THEN datetime('now') ELSE detected_at END,
      resolved_at = NULL
  `);

  const resolve = db.prepare(`
    UPDATE conformity_violations SET resolved_at = datetime('now')
    WHERE bug_id = ? AND rule_id = ? AND resolved_at IS NULL
  `);

  let newViolations     = 0;
  let resolvedViolations = 0;

  db.transaction(() => {
    for (const [key, v] of currentViolations) {
      if (!existingKeys.has(key)) newViolations++;
      upsert.run(v);
    }
    for (const existing of existingActive) {
      const key = `${existing.bug_id}:${existing.rule_id}`;
      if (!currentViolations.has(key)) {
        resolve.run(existing.bug_id, existing.rule_id);
        resolvedViolations++;
      }
    }
  })();

  logger.info({ checkedBugs: bugs.length, newViolations, resolvedViolations }, 'Conformity check completed');
  return { checkedBugs: bugs.length, newViolations, resolvedViolations, runAt };
}
