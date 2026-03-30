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
  created_date: string | null;
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
const TRANSVERSE_AREA_TOKENS = new Set([
  'ETATS',
  'GC',
  'HORSPRODUCTION',
  'MAINTENANCES',
  'PERFORMANCE',
  'SECURITE',
  'TESTSAUTO',
]);

// Valid build prefixes for BUILD_CHECK (default list — overridable via rule_config)
const DEFAULT_VALID_BUILD_PREFIXES = [
  '12.80', '13.85.', '13.86.', '13.87.', '14.49.', '14.50.', '14.59.', '14.99',
  '15.00', '17.11', '17.20', '24.19', '24.20', '24.21', '24.30',
  '25.01', '25.10.001', '25.14.0', '25.15.001', '25.19.0', '25.20.001', '25.20.002', '25.21.0',
  '25.15.002', '25.30.002', '25.30.005', '25.30.007', '25.30.008', '25.31.0', '26.10.001', '26.11.0',
  'CO', 'Isacuve Web', 'Isasite', 'Outil Jbeg',
];

const FAH_VERSION_EXCEPTIONS = new Set(['-', 'Non concerné', 'Isasite', 'Outil Jbeg', 'Outil JBeg', 'git', 'Isacuve Web']);

const VERSION_SPECIAL_OK = new Set(['-', 'Non concerné', 'Outil Jbeg', 'Sonarqube', 'Isasite', 'Isacuve Web', 'git']);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function t(v: string | null | undefined): string {
  return v?.trim() ?? '';
}

function normalizeToken(v: string): string {
  return v
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function isValidFahVersionFormat(v: string): boolean {
  // Format standard : FAH_xx.yy — yy doit être multiple de 5
  const m = v.match(/^FAH_(\d{2})\.(\d+)(?:\s+Patch\s+\d+)?$/i);
  if (!m) return false;
  return parseInt(m[2], 10) % 5 === 0;
}

function isValidOnPremisePatchFormat(v: string): boolean {
  // Format Patch OnPremise : "13.87.xxx Patch N" — le numéro est obligatoire
  return /^\d+\.\d+\.\d+\s+Patch\s+\d+$/i.test(v);
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

function isRequalifiedToLive(foundIn: string): boolean {
  return /\/\s*live/i.test(foundIn);
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
 * 6. Bug OnPremise avec version souhaitée Live (FAH_xx.yy) sans requalification → incohérent
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
    if (isOnPremiseBug(foundIn) && !isRequalifiedToLive(foundIn) && area.startsWith(VERSIONS_LIVE)) return true;
    if (v === 'Non concerné' && !area.startsWith(VERSIONS_HORS)) return true;
  }

  return false;
}

/** BUGS_TRANSVERSE_AREA — bug non Closed present in transverse areas should be reassigned to a team */
export function evalNonClosedTransverseArea(bug: BugRow): boolean {
  if (t(bug.state) === 'Closed') return false;

  const area = t(bug.area_path);
  if (!area) return false;
  const areaNoProject = area.startsWith(ADO_PROJECT + '\\') ? area.slice(ADO_PROJECT.length + 1) : area;
  const segments = areaNoProject.split('\\');

  return segments.some((segment) => TRANSVERSE_AREA_TOKENS.has(normalizeToken(segment)));
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
  if (v.includes('Isasite')) return false;

  const foundIn = t(bug.found_in);
  if (!foundIn) return false; // sans found_in on ne peut pas déterminer le type → skip

  if (isLiveBug(foundIn) || isRequalifiedToLive(foundIn)) {
    return !isValidFahVersionFormat(v);
  }
  if (isOnPremiseBug(foundIn)) {
    // Un format FAH valide est accepté même sur un bug OnPremise
    // (la cohérence cross-produit est vérifiée par TRIAGE_AREA_CHECK)
    if (isValidFahVersionFormat(v)) return false;
    // Format Patch OnPremise valide : "13.87.xxx Patch N" — cohérence vérifiée par VERSION_BUILD_COHERENCE
    if (isValidOnPremisePatchFormat(v)) return false;
    // Autre usage de mots-clés patch/hotfix → format invalide
    if (/\b(patch|hotfix)\b/i.test(v)) return true;
    return !v.startsWith('12.') && !v.startsWith('13.8');
  }
  return false; // type inconnu → pas d'erreur
}

/** BUILD_CHECK — bugs Closed/Resolved doivent avoir un build valide */
export function evalBuildCheck(bug: BugRow, rawConfig: string): boolean {
  if (!CLOSED_STATES.has(t(bug.state))) return false;
  const raw = t(bug.integration_build);
  // "Build non renseigné*" (placeholder ADO) = équivalent à vide
  const b = raw.toLowerCase().startsWith('build non renseigné') ? '' : raw;
  if (!b) {
    // Build vide accepté pour les bugs créés avant le 01/01/2025
    if (bug.created_date && bug.created_date < '2025-01-01') return false;
    return true; // violation sinon
  }
  if (b === '-' || b === 'Non concerné') return false; // valeurs explicitement acceptées

  // Build ne doit jamais contenir de mots-clés informels (patch, hotfix…) — format invalide
  if (/\b(patch|hotfix|fix|rc|beta|alpha)\b/i.test(b)) return true;

  // Bugs anciens (avant 2025) : 13.85 et 13.86 acceptés (valeur exacte ou préfixe)
  if (bug.created_date && bug.created_date < '2025-01-01') {
    if (b.startsWith('13.85') || b.startsWith('13.86')) return false;
  }

  let extraPrefixes: string[] = [];
  try {
    const cfg = JSON.parse(rawConfig) as { valid_prefixes?: string[] };
    if (Array.isArray(cfg.valid_prefixes)) extraPrefixes = cfg.valid_prefixes;
  } catch { /* ignore */ }

  const allPrefixes = [...DEFAULT_VALID_BUILD_PREFIXES, ...extraPrefixes];
  return !allPrefixes.some(prefix => b.startsWith(prefix));
}

/**
 * VERSION_BUILD_COHERENCE — cohérence entre version souhaitée, build et found_in
 * - Found In OnPremise + version souhaitée Live (FAH_xx.yy) sans requalification → incohérent (tous états)
 * - "Non concerné" dans les deux → OK
 * - Format Patch : "FAH_XX.YY Patch N" → build doit être "XX.YY.ZZZ-N"
 */
export function evalVersionBuildCoherence(bug: BugRow): boolean {
  const foundIn = t(bug.found_in);
  const v       = t(bug.version_souhaitee);

  // Incohérence produit : found_in OnPremise + version souhaitée Live, sans requalification "/ live"
  // S'applique à tous les états (pas uniquement Closed)
  if (foundIn && v && isOnPremiseBug(foundIn) && !isRequalifiedToLive(foundIn) && isValidFahVersionFormat(v)) return true;

  // Les vérifications suivantes s'appliquent uniquement aux bugs fermés
  if (!CLOSED_STATES.has(t(bug.state))) return false;

  const b = t(bug.integration_build);
  if (!v || !b) return false; // géré par autres règles

  // Les deux "Non concerné" → OK
  if (v === 'Non concerné' && b === 'Non concerné') return false;

  // Format Patch FAH : "FAH_XX.YY Patch N" → build doit commencer par XX.YY. et finir par -N
  const patchMatch = v.match(/^FAH_(\d{2})\.(\d+)\s+Patch\s+(\d+)$/i);
  if (patchMatch) {
    const year     = patchMatch[1];
    const minor    = patchMatch[2];
    const patchNum = patchMatch[3];
    return !(b.startsWith(`${year}.${minor}.`) && b.endsWith(`-${patchNum}`));
  }

  // Format Patch OnPremise : "13.87.xxx Patch N" → build doit commencer par "13.87.xxx" et finir par "-N"
  const onpremisePatchMatch = v.match(/^(\d+\.\d+\.\d+)\s+Patch\s+(\d+)$/i);
  if (onpremisePatchMatch) {
    const base     = onpremisePatchMatch[1]; // ex: "13.87.150"
    const patchNum = onpremisePatchMatch[2]; // ex: "1"
    return !(b.startsWith(base) && b.endsWith(`-${patchNum}`));
  }

  // Réciproque : build a un indicateur patch (mot "Patch" ou suffixe "-N") mais la version n'en a pas
  // Ex: build "26.10.001-2" ou "26.10.001 Patch 2" avec version "FAH_26.10" → violation
  const buildHasPatch = /\bpatch\b/i.test(b) || /-\d+$/.test(b);
  if (buildHasPatch && !/\bpatch\b/i.test(v)) return true;

  return false;
}

// ─── Rule Dispatcher ──────────────────────────────────────────────────────────

function evaluateRule(code: string, bug: BugRow, rawConfig: string): boolean {
  switch (code) {
    case 'PRIORITY_CHECK':               return evalPriorityCheck(bug);
    case 'INTEGRATION_BUILD_NOT_EMPTIED': return evalIntegrationBuildNotEmptied(bug);
    case 'TRIAGE_AREA_CHECK':            return evalTriageAreaCheck(bug);
    case 'BUGS_TRANSVERSE_AREA':         return evalNonClosedTransverseArea(bug);
    case 'NON_CLOSED_TRANSVERSE_AREA':   return evalNonClosedTransverseArea(bug); // legacy code support
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
           version_souhaitee, resolved_reason, created_date
    FROM bugs_cache
  `).all() as BugRow[];

  const rules = db.prepare(`
    SELECT id, code, severity, active, rule_config
    FROM conformity_rules WHERE active = 1
  `).all() as RuleRow[];

  if (rules.length === 0) {
    return { checkedBugs: 0, newViolations: 0, resolvedViolations: 0, runAt };
  }

  const waivedRows = db.prepare(`
    SELECT bug_id, rule_id FROM conformity_waivers
  `).all() as { bug_id: number; rule_id: number }[];
  const waivedKeys = new Set(waivedRows.map((w) => `${w.bug_id}:${w.rule_id}`));

  const currentViolations = new Map<string, { bug_id: number; rule_id: number }>();
  for (const bug of bugs) {
    for (const rule of rules) {
      const key = `${bug.id}:${rule.id}`;
      if (waivedKeys.has(key)) continue;
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
