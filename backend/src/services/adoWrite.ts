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

export const WRITABLE_FIELDS: Record<string, FieldDef> = {
  priority: {
    ado_ref:      'Microsoft.VSTS.Common.Priority',
    cache_column: 'priority',
    validate:     (v) => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 4,
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
    throw new AdoError(`ADO write failed: ${res.status} ${res.statusText} — ${body}`, res.status);
  }
}

// ─── Write + cache + audit ────────────────────────────────────────────────────

export async function writeField(
  bugId: number,
  field: string,
  value: unknown,
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
    db.prepare(`
      INSERT INTO ado_write_audit (work_item_id, field, old_value, new_value, performed_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(bugId, field, oldValue, newValue);
  })();

  logger.info({ bugId, field, oldValue, newValue }, 'ADO field written');

  // Re-run conformité pour mettre à jour les violations
  try { runConformityCheck(); } catch { /* non bloquant */ }

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
      await writeField(bugId, field, value);
      updated++;
    } catch (e) {
      failed.push({ bug_id: bugId, error: e instanceof Error ? e.message : 'Erreur inconnue' });
      logger.warn({ bugId, field, error: e }, 'Bulk write partial failure');
    }
  }

  // Re-run conformité une seule fois à la fin (writeField le fait déjà pour chaque bug,
  // mais le dernier appel suffit pour tous)
  logger.info({ field, updated, failed: failed.length }, 'Bulk write completed');
  return { updated, failed };
}
