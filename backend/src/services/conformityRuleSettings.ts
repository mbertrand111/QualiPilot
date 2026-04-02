import type Database from 'better-sqlite3';

const RULE_ORDER = [
  'PRIORITY_CHECK',
  'INTEGRATION_BUILD_NOT_EMPTIED',
  'TRIAGE_AREA_CHECK',
  'BUGS_TRANSVERSE_AREA',
  'FAH_VERSION_REQUIRED',
  'CLOSED_BUG_COHERENCE',
  'VERSION_CHECK',
  'BUILD_CHECK',
  'VERSION_BUILD_COHERENCE',
];

const AUTO_RULE_CODES = new Set([
  'PRIORITY_CHECK',
  'INTEGRATION_BUILD_NOT_EMPTIED',
]);

const RULE_ORDER_MAP = new Map(RULE_ORDER.map((code, idx) => [code, idx]));

export interface ConformityRuleSetting {
  id: number;
  code: string;
  description: string;
  severity: 'error' | 'warning';
  active: boolean;
  auto: boolean;
}

export interface ConformityRuleSettingsResponse {
  rules: ConformityRuleSetting[];
  updatedAt: string;
}

export function getConformityRuleSettings(db: Database.Database): ConformityRuleSettingsResponse {
  const rows = db.prepare(`
    SELECT id, code, description, severity, active
    FROM conformity_rules
  `).all() as Array<{
    id: number;
    code: string;
    description: string;
    severity: 'error' | 'warning';
    active: number;
  }>;

  const rules = rows
    .map((row) => ({
      id: row.id,
      code: row.code,
      description: row.description,
      severity: row.severity,
      active: row.active === 1,
      auto: AUTO_RULE_CODES.has(row.code),
    }))
    .sort((a, b) => {
      const oa = RULE_ORDER_MAP.get(a.code) ?? Number.MAX_SAFE_INTEGER;
      const ob = RULE_ORDER_MAP.get(b.code) ?? Number.MAX_SAFE_INTEGER;
      if (oa !== ob) return oa - ob;
      return a.code.localeCompare(b.code);
    });

  return {
    rules,
    updatedAt: new Date().toISOString(),
  };
}

export function updateConformityRuleActive(
  db: Database.Database,
  code: string,
  active: boolean,
): ConformityRuleSettingsResponse {
  const trimmedCode = String(code ?? '').trim().toUpperCase();
  if (!trimmedCode) throw new Error('Code de regle manquant');

  const existing = db.prepare(`
    SELECT id
    FROM conformity_rules
    WHERE code = ?
    LIMIT 1
  `).get(trimmedCode) as { id: number } | undefined;
  if (!existing) throw new Error(`Regle inconnue: ${trimmedCode}`);

  db.prepare(`
    UPDATE conformity_rules
    SET active = ?
    WHERE code = ?
  `).run(active ? 1 : 0, trimmedCode);

  return getConformityRuleSettings(db);
}

