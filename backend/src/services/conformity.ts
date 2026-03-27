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

export interface ConformityCheckResult {
  checkedBugs: number;
  newViolations: number;
  resolvedViolations: number;
  runAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CLOSED_STATES = new Set(['Closed', 'Resolved']);
const ACTIVE_STATES = new Set(['New', 'Active']);

const ADO_PROJECT   = 'Isagri_Dev_GC_GestionCommerciale';
const TRIAGE_ROOTS  = [
  `${ADO_PROJECT}\\Bugs à prioriser`,
  `${ADO_PROJECT}\\Bugs à corriger`,
] as const;
const ROOT_CORRIGER       = `${ADO_PROJECT}\\Bugs à corriger`;
const CORRIGER_PREFIX     = `${ROOT_CORRIGER}\\`;
const VERSIONS_LIVE       = `${CORRIGER_PREFIX}Versions LIVE`;
const VERSIONS_HISTORIQUES = `${CORRIGER_PREFIX}Versions historiques`;
const VERSIONS_HORS       = `${CORRIGER_PREFIX}Hors versions`;

// Valid build prefixes for BUILD_CHECK (default list — overridable via rule_config)
const DEFAULT_VALID_BUILD_PREFIXES = [
  '12.80', '13.85.', '13.86.', '13.87.', '14.49.', '14.50.', '14.59.', '14.99',
  '15.00', '17.11', '17.20', '24.19', '24.20', '24.21', '24.30',
  '25.01', '25.10.001', '25.19.0', '25.20.001', '25.20.002', '25.21.0',
  '25.30.002', '25.30.005', '25.30.008', '25.31.0', '26.10.001', '26.11.0',
  'CO', 'Isacuve Web', 'Isasite', 'Outil Jbeg',
];

const FAH_VERSION_EXCEPTIONS = new Set(['-', 'Non concerné', 'Isasite', 'Outil Jbeg', 'Outil JBeg', 'git', 'Isacuve Web']);

const VERSION_SPECIAL_OK = new Set(['-', 'Non concerné', 'Outil Jbeg', 'Sonarqube', 'Isasite', 'Isacuve Web', 'git']);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function t(v: string | null | undefined): string {
  return v?.trim() ?? '';
}

function isValidFahVersionFormat(v: string): boolean {
  const m = v.match(/^FAH_(\d{2})\.(\d+)$/);
  if (!m) return false;
  return parseInt(m[2], 10) % 10 === 0;
}

function foundInYear(foundIn: string): number | null {
  const m = foundIn.match(/^(\d{2})\./);
  return m ? parseInt(m[1], 10) : null;
}

function isLiveBug(foundIn: string): boolean {
  const year = foundInYear(foundIn);
  return year !== null && year >= 14;
}

function isOnPremiseBug(foundIn: string): boolean {
  if (foundIn.startsWith('12.')) return true;
  if (foundIn.startsWith('13.') && !foundIn.startsWith('13.99')) return true;
  return false;
}

// ─── Rule Evaluators ──────────────────────────────────────────────────────────

/** PRIORITY_CHECK — violation si priority !== 2 */
export function evalPriorityCheck(bug: BugRow): boolean {
  return bug.priority !== 2;
}

/** INTEGRATION_BUILD_NOT_EMPTIED — violation si bug New/Active a un build renseigné */
export function evalIntegrationBuildNotEmptied(bug: BugRow): boolean {
  if (!ACTIVE_STATES.has(t(bug.state))) return false;
  return t(bug.integration_build) !== '';
}

/**
 * TRIAGE_AREA_CHECK — plusieurs sous-règles liées aux zones de triage :
 * 1. Bug Closed dans zone triage → version ET build doivent être exactement "-"
 * 2. Bug non-Closed à la racine de "Bugs à corriger" → doit être dans un sous-dossier
 * 3. Bug LIVE dans "Versions historiques" → incohérent
 * 4. Bug OnPremise dans "Versions LIVE" → incohérent
 * 5. Bug "Hors version" hors du dossier "Hors versions" → incohérent
 */
export function evalTriageAreaCheck(bug: BugRow): boolean {
  const area  = t(bug.area_path);
  const state = t(bug.state);
  const v     = t(bug.version_souhaitee);
  const b     = t(bug.integration_build);

  const isInTriage = TRIAGE_ROOTS.some(p => area === p || area.startsWith(p + '\\'));
  if (!isInTriage) return false;

  // 1. Bug Closed dans toute zone triage → version ET build doivent être "-"
  if (state === 'Closed') {
    if (v !== '-' || b !== '-') return true;
  }

  // 2. Bug non-Closed exactement à la racine "Bugs à corriger" → doit être sous-classé
  if (area === ROOT_CORRIGER && state !== 'Closed') return true;

  // 3-5. Cohérence produit/sous-dossier
  if (area.startsWith(CORRIGER_PREFIX)) {
    const foundIn = t(bug.found_in);
    if (isLiveBug(foundIn) && area.startsWith(VERSIONS_HISTORIQUES)) return true;
    if (isOnPremiseBug(foundIn) && area.startsWith(VERSIONS_LIVE)) return true;
    if (v === 'Non concerné' && !area.startsWith(VERSIONS_HORS)) return true;
  }

  return false;
}

/** FAH_VERSION_REQUIRED — bugs LIVE (found_in année ≥ 14) doivent avoir version contenant "FAH_" */
export function evalFahVersionRequired(bug: BugRow): boolean {
  const foundIn = t(bug.found_in);
  if (!foundIn) return false;
  const year = foundInYear(foundIn);
  if (year === null || year < 14) return false;

  const v = t(bug.version_souhaitee);
  if (FAH_VERSION_EXCEPTIONS.has(v)) return false;
  if (v.includes('Isasite') || v.includes('Outil Jbeg') || v.includes('Outil JBeg') || v.includes('git') || v.includes('Isacuve Web')) return false;
  if (!v) return true; // vide → violation
  return !v.includes('FAH');
}

/** CLOSED_BUG_COHERENCE — bug fermé non-corrigé → version ET build doivent être "-" */
export function evalClosedBugCoherence(bug: BugRow): boolean {
  if (!CLOSED_STATES.has(t(bug.state))) return false;
  const reason = t(bug.resolved_reason);
  if (reason === 'Corrigé' || reason === 'Réalisé') return false;
  return t(bug.version_souhaitee) !== '-' || t(bug.integration_build) !== '-';
}

/** VERSION_CHECK — format de version_souhaitee valide selon le type de bug */
export function evalVersionCheck(bug: BugRow): boolean {
  const v = t(bug.version_souhaitee);
  if (!v) return false; // vide = OK pour ce check
  if (VERSION_SPECIAL_OK.has(v)) return false;

  const foundIn = t(bug.found_in);
  if (!foundIn) return false; // sans found_in on ne peut pas déterminer le type → skip

  if (isLiveBug(foundIn)) {
    return !isValidFahVersionFormat(v);
  }
  if (isOnPremiseBug(foundIn)) {
    return !v.startsWith('12.') && !v.startsWith('13.8');
  }
  return false; // type inconnu → pas d'erreur
}

/** BUILD_CHECK — bugs Closed/Resolved doivent avoir un build valide */
export function evalBuildCheck(bug: BugRow, rawConfig: string): boolean {
  if (!CLOSED_STATES.has(t(bug.state))) return false;
  const b = t(bug.integration_build);
  if (!b) return true; // build vide → violation

  let extraPrefixes: string[] = [];
  try {
    const cfg = JSON.parse(rawConfig) as { valid_prefixes?: string[] };
    if (Array.isArray(cfg.valid_prefixes)) extraPrefixes = cfg.valid_prefixes;
  } catch { /* ignore */ }

  const allPrefixes = [...DEFAULT_VALID_BUILD_PREFIXES, ...extraPrefixes];
  return !allPrefixes.some(prefix => b.startsWith(prefix));
}

/**
 * VERSION_BUILD_COHERENCE — cohérence entre version souhaitée et build (règle partielle)
 * - "Non concerné" dans les deux → OK
 * - Format Patch : "FAH_XX.YY Patch N" → build doit être "XX.YY.ZZZ-N"
 */
export function evalVersionBuildCoherence(bug: BugRow): boolean {
  if (!CLOSED_STATES.has(t(bug.state))) return false;

  const v = t(bug.version_souhaitee);
  const b = t(bug.integration_build);
  if (!v || !b) return false; // géré par autres règles

  // Les deux "Non concerné" → OK
  if (v === 'Non concerné' && b === 'Non concerné') return false;

  // Format Patch : "FAH_XX.YY Patch N"
  const patchMatch = v.match(/^FAH_(\d{2})\.(\d+)\s+Patch\s+(\d+)$/i);
  if (patchMatch) {
    const year     = patchMatch[1];
    const minor    = patchMatch[2];
    const patchNum = patchMatch[3];
    return !(b.startsWith(`${year}.${minor}.`) && b.endsWith(`-${patchNum}`));
  }

  return false; // autres cas : règle à compléter, pas d'erreur pour l'instant
}

// ─── Rule Dispatcher ──────────────────────────────────────────────────────────

function evaluateRule(code: string, bug: BugRow, rawConfig: string): boolean {
  switch (code) {
    case 'PRIORITY_CHECK':               return evalPriorityCheck(bug);
    case 'INTEGRATION_BUILD_NOT_EMPTIED': return evalIntegrationBuildNotEmptied(bug);
    case 'TRIAGE_AREA_CHECK':            return evalTriageAreaCheck(bug);
    case 'FAH_VERSION_REQUIRED':         return evalFahVersionRequired(bug);
    case 'CLOSED_BUG_COHERENCE':         return evalClosedBugCoherence(bug);
    case 'VERSION_CHECK':                return evalVersionCheck(bug);
    case 'BUILD_CHECK':                  return evalBuildCheck(bug, rawConfig);
    case 'VERSION_BUILD_COHERENCE':      return evalVersionBuildCoherence(bug);
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

  const currentViolations = new Map<string, { bug_id: number; rule_id: number }>();
  for (const bug of bugs) {
    for (const rule of rules) {
      if (evaluateRule(rule.code, bug, rule.rule_config)) {
        currentViolations.set(`${bug.id}:${rule.id}`, { bug_id: bug.id, rule_id: rule.id });
      }
    }
  }

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

  let newViolations      = 0;
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
