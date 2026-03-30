import { config } from '../config';
import { getDb } from '../db';
import { CUSTOM_FIELD_REFS, AdoError } from './azureDevOps';
import { runConformityCheck } from './conformity';
import logger from '../logger';

// ─── Whitelist des champs modifiables ────────────────────────────────────────
// Seuls ces champs peuvent être écrits via l'application.
// cache_column doit correspondre exactement à la colonne bugs_cache.

interface FieldDef {
  ado_ref: string;
  cache_column: string;
  validate: (v: unknown) => boolean;
}

// Normalisation des noms d'équipes (même logique que sync.ts)
const TEAM_NAME_NORMALIZE: Record<string, string> = {
  'GO_FAHST':      'GO FAHST',
  'MELI_MELO':     'MELI MELO',
  'MAGIC_SYSTEM':  'MAGIC SYSTEM',
  'JURASSIC_BACK': 'JURASSIC BACK',
  'NULL_REF':      'NULL.REF',
  'NULLREF':       'NULL.REF',
};

function normalizeTeamName(raw: string): string {
  const trimmed = raw.trim();
  const normalizedKey = trimmed
    .toUpperCase()
    .replace(/[.\s_]+/g, '_');
  return TEAM_NAME_NORMALIZE[normalizedKey] ?? trimmed;
}

// Zones ADO autorisées pour le déplacement de bugs
// Les valeurs utilisent les vrais chemins ADO (avec underscores pour certaines équipes).
export const ALLOWED_AREA_PATHS: Record<string, string> = {
  // Zones de triage
  'Bugs à prioriser':          'Isagri_Dev_GC_GestionCommerciale\\Bugs à prioriser',
  'À corriger — Live':         'Isagri_Dev_GC_GestionCommerciale\\Bugs à corriger\\Versions LIVE',
  'À corriger — OnPremise':    'Isagri_Dev_GC_GestionCommerciale\\Bugs à corriger\\Versions historiques',
  'À corriger — Hors version': 'Isagri_Dev_GC_GestionCommerciale\\Bugs à corriger\\Hors versions',
  // Équipes — clés = noms canoniques affichés, valeurs = vrais chemins ADO
  'COCO':          'Isagri_Dev_GC_GestionCommerciale\\COCO',
  'GO FAHST':      'Isagri_Dev_GC_GestionCommerciale\\GO_FAHST',
  'JURASSIC BACK': 'Isagri_Dev_GC_GestionCommerciale\\JURASSIC_BACK',
  'MAGIC SYSTEM':  'Isagri_Dev_GC_GestionCommerciale\\MAGIC_SYSTEM',
  'MELI MELO':     'Isagri_Dev_GC_GestionCommerciale\\MELI_MELO',
  'NULL.REF':      'Isagri_Dev_GC_GestionCommerciale\\NULL.REF',
  'PIXELS':        'Isagri_Dev_GC_GestionCommerciale\\PIXELS',
  'LACE':          'Isagri_Dev_GC_GestionCommerciale\\LACE',
};

const ALLOWED_AREA_PATH_VALUES = new Set(Object.values(ALLOWED_AREA_PATHS));

// Dérive le nom d'équipe canonique depuis l'area path (miroir de sync.ts)
function deriveTeamFromAreaPath(areaPath: string): string | null {
  const parts = areaPath.split('\\');
  if (parts.length < 2) return null;
  const level1 = parts[1];
  if (level1 === 'Bugs à corriger' && parts.length >= 3) {
    const sub = parts[2];
    if (sub === 'Versions LIVE')        return 'Bugs à corriger LIVE';
    if (sub === 'Versions historiques') return 'Bugs à corriger OnPremise';
    return `Bugs à corriger ${sub}`;
  }
  return normalizeTeamName(level1);
}

export const WRITABLE_FIELDS: Record<string, FieldDef> = {
  priority: {
    ado_ref:      'Microsoft.VSTS.Common.Priority',
    cache_column: 'priority',
    validate:     (v) => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 4,
  },
  found_in: {
    ado_ref:      'Microsoft.VSTS.Build.FoundIn',
    cache_column: 'found_in',
    validate:     (v) => typeof v === 'string' && (v as string).length <= 255,
  },
  integration_build: {
    ado_ref:      'Microsoft.VSTS.Build.IntegrationBuild',
    cache_column: 'integration_build',
    validate:     (v) => typeof v === 'string' && (v as string).length <= 255,
  },
  version_souhaitee: {
    ado_ref:      CUSTOM_FIELD_REFS.versionSouhaitee,
    cache_column: 'version_souhaitee',
    validate:     (v) => typeof v === 'string' && (v as string).length <= 255,
  },
  resolved_reason: {
    ado_ref:      CUSTOM_FIELD_REFS.resolvedReason,
    cache_column: 'resolved_reason',
    validate:     (v) => typeof v === 'string' && (v as string).length <= 255,
  },
  raison_origine: {
    ado_ref:      CUSTOM_FIELD_REFS.raisonOrigine,
    cache_column: 'raison_origine',
    validate:     (v) => typeof v === 'string' && (v as string).length <= 255,
  },
  area_path: {
    ado_ref:      'System.AreaPath',
    cache_column: 'area_path',
    validate:     (v) => typeof v === 'string' && (v as string).startsWith('Isagri_Dev_GC_GestionCommerciale\\') && (v as string).length <= 500,
  },
  assigned_to: {
    ado_ref:      'System.AssignedTo',
    cache_column: 'assigned_to',
    validate:     (v) => typeof v === 'string' && (v as string).length <= 255,
  },
  iteration_path: {
    ado_ref:      'System.IterationPath',
    cache_column: 'iteration_path',
    validate:     (v) => typeof v === 'string' && (v as string).startsWith('Isagri_Dev_GC_GestionCommerciale\\') && (v as string).length <= 500,
  },
  sprint_done: {
    ado_ref:      CUSTOM_FIELD_REFS.sprintDone,
    cache_column: 'sprint_done',
    validate:     (v) => typeof v === 'string' && (v as string).length <= 255,
  },
} as const;

export type WritableField = keyof typeof WRITABLE_FIELDS;

export interface WriteResult {
  bug_id: number;
  field: string;
  old_value: string | null;
  new_value: string | null;
}

export interface BulkWriteResult {
  updated: number;
  failed: { bug_id: number; error: string }[];
}

export interface WriteOptions {
  runConformity?: boolean;
}

// ─── HTTP helper (write) ──────────────────────────────────────────────────────

function getAuthHeader(): string {
  return `Basic ${Buffer.from(`:${config.ado.pat}`).toString('base64')}`;
}

async function adoPatch(workItemId: number, adoRef: string, value: unknown): Promise<void> {
  const url = `${config.ado.baseUrl}/${config.ado.org}/${config.ado.project}/_apis/wit/workitems/${workItemId}?api-version=7.1`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json-patch+json',
    },
    body: JSON.stringify([{ op: 'replace', path: `/fields/${adoRef}`, value }]),
  });

  if (res.status === 401 || res.status === 403) {
    throw new AdoError('ADO authentication failed — vérifier ADO_PAT dans .env', 401);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    // Extraire les erreurs de validation ADO (ex: champ requis non rempli)
    try {
      const json = JSON.parse(body) as {
        message?: string;
        customProperties?: {
          RuleValidationErrors?: Array<{ errorMessage?: string }>;
          ErrorMessage?: string;
        };
        FieldRuleValidationErrors?: Array<{ errorMessage?: string }>;
      };
      const stripTf = (s: string) => s.replace(/^TF\d+:\s*/i, '').trim();

      // Structure RuleValidationException (400 avec customProperties.RuleValidationErrors)
      const ruleErrs = json.customProperties?.RuleValidationErrors;
      if (Array.isArray(ruleErrs) && ruleErrs.length > 0) {
        const msgs = ruleErrs.map(e => stripTf(e.errorMessage ?? '')).filter(Boolean).join(' ; ');
        if (msgs) throw new AdoError(msgs, res.status);
      }

      // Structure alternative (FieldRuleValidationErrors à la racine)
      const fieldErrs = json.FieldRuleValidationErrors;
      if (Array.isArray(fieldErrs) && fieldErrs.length > 0) {
        const msgs = fieldErrs.map(e => stripTf(e.errorMessage ?? '')).filter(Boolean).join(' ; ');
        if (msgs) throw new AdoError(msgs, res.status);
      }

      // Repli : message de haut niveau
      if (json.message) throw new AdoError(stripTf(json.message), res.status);
    } catch (e) {
      if (e instanceof AdoError) throw e;
    }
    throw new AdoError(`ADO write failed: ${res.status} ${res.statusText}`, res.status);
  }
}

// ─── Write + cache + audit ────────────────────────────────────────────────────

export async function writeField(
  bugId: number,
  field: string,
  value: unknown,
  options: WriteOptions = {},
): Promise<WriteResult> {
  const db = getDb();
  const fieldDef = WRITABLE_FIELDS[field];

  // La validation est faite en amont dans la route, mais on double-vérifie
  if (!fieldDef) throw new Error(`Champ non autorisé : ${field}`);
  if (!fieldDef.validate(value)) throw new Error(`Valeur invalide pour le champ ${field}`);

  // Récupérer l'ancienne valeur depuis le cache
  const bug = db.prepare(`SELECT id, ${fieldDef.cache_column} FROM bugs_cache WHERE id = ?`).get(bugId) as
    | Record<string, unknown>
    | undefined;
  if (!bug) throw new Error(`Bug ${bugId} introuvable`);

  const oldValue = bug[fieldDef.cache_column] !== null && bug[fieldDef.cache_column] !== undefined
    ? String(bug[fieldDef.cache_column])
    : null;
  const newValue = value !== null && value !== undefined ? String(value) : null;

  // Write ADO (opération réseau — hors transaction)
  await adoPatch(bugId, fieldDef.ado_ref, value);

  // Update cache + audit (dans une transaction)
  db.transaction(() => {
    db.prepare(`UPDATE bugs_cache SET ${fieldDef.cache_column} = ? WHERE id = ?`).run(value, bugId);
    // Mise à jour de la colonne dérivée team quand area_path change
    if (field === 'area_path') {
      const team = deriveTeamFromAreaPath(value as string);
      db.prepare(`UPDATE bugs_cache SET team = ? WHERE id = ?`).run(team, bugId);
    }
    // Re-dérive sprint quand iteration_path change
    if (field === 'iteration_path') {
      const ip = value as string;
      const sprintMatch = ip.match(/PI\d+(?:-SP\d+)?$/);
      if (sprintMatch) {
        const s = sprintMatch[0];
        const exerciseMatch = ip.match(/(\d{4}-\d{4})/);
        const sprint = /archive/i.test(ip) ? `Archive · ${s}` : exerciseMatch ? `${exerciseMatch[1]} · ${s}` : s;
        db.prepare(`UPDATE bugs_cache SET sprint = ? WHERE id = ?`).run(sprint, bugId);
      }
    }
    db.prepare(`
      INSERT INTO ado_write_audit (work_item_id, field, old_value, new_value, performed_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(bugId, field, oldValue, newValue);
  })();

  logger.info({ bugId, field, oldValue, newValue }, 'ADO field written');

  // Re-run conformité pour mettre à jour les violations
  if (options.runConformity !== false) {
    try { runConformityCheck(); } catch { /* non bloquant */ }
  }

  return { bug_id: bugId, field, old_value: oldValue, new_value: newValue };
}

export async function bulkWriteField(
  bugIds: number[],
  field: string,
  value: unknown,
): Promise<BulkWriteResult> {
  const fieldDef = WRITABLE_FIELDS[field];
  if (!fieldDef) throw new Error(`Champ non autorisé : ${field}`);
  if (!fieldDef.validate(value)) throw new Error(`Valeur invalide pour le champ ${field}`);

  const failed: { bug_id: number; error: string }[] = [];
  let updated = 0;

  // Écriture séquentielle (évite de surcharger ADO)
  for (const bugId of bugIds) {
    try {
      await writeField(bugId, field, value, { runConformity: false });
      updated++;
    } catch (e) {
      failed.push({ bug_id: bugId, error: e instanceof Error ? e.message : 'Erreur inconnue' });
      logger.warn({ bugId, field, error: e }, 'Bulk write partial failure');
    }
  }

  // Re-run conformité une seule fois à la fin (writeField le fait déjà pour chaque bug,
  // mais le dernier appel suffit pour tous)
  try { runConformityCheck(); } catch { /* non bloquant */ }
  logger.info({ field, updated, failed: failed.length }, 'Bulk write completed');
  return { updated, failed };
}
