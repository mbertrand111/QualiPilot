import { config } from '../config';
import logger from '../logger';

// ─── Custom field reference names (Isagri-Prod-Progiciels ADO) ───────────────
// Si le premier sync retourne null pour ces champs, vérifier les refs exactes
// dans le raw_json d'un bug et corriger ici.
export const CUSTOM_FIELD_REFS = {
  versionSouhaitee: 'Isagri.Feature.VersionSouhaiteeGC',  // champ custom GC
  resolvedReason:   'Isagri.ResolvedReason',               // custom Isagri, pas Microsoft.VSTS.Common.ResolvedReason
  raisonOrigine:    'Isagri.RaisonOrigine',
  sprintDone:       'Isagri.Feature.SprintDone',           // ex: "PI6-SP3"
  // team : dérivé du 2e segment de area_path
  // sprint courant : extrait de iteration_path
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdoBug {
  id: number;
  fields: Record<string, unknown>;
}

interface WiqlResponse {
  workItems: Array<{ id: number; url: string }>;
}

interface WorkItemsResponse {
  value: AdoBug[];
}

// ─── ADO Error ────────────────────────────────────────────────────────────────

export class AdoError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = 'AdoError';
  }
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

function getAuthHeader(): string {
  return `Basic ${Buffer.from(`:${config.ado.pat}`).toString('base64')}`;
}

async function adoFetch(url: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string> | undefined),
    },
  });

  if (res.status === 401 || res.status === 403) {
    throw new AdoError('ADO authentication failed — vérifier ADO_PAT dans .env', 401);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new AdoError(`ADO request failed: ${res.status} ${res.statusText} — ${body}`, res.status);
  }

  return res;
}

// ─── WIQL — fetch all bug IDs ─────────────────────────────────────────────────

async function fetchBugIds(): Promise<number[]> {
  const url = `${config.ado.baseUrl}/${config.ado.org}/${config.ado.project}/_apis/wit/wiql?api-version=7.1`;

  const res = await adoFetch(url, {
    method: 'POST',
    body: JSON.stringify({
      query: `SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType] = 'Bug' AND [System.AreaPath] UNDER '${config.ado.project}' AND ([System.ChangedDate] >= @today - 365 OR [System.State] IN ('New', 'Active')) ORDER BY [System.Id] ASC`,
    }),
  });

  const data = await res.json() as WiqlResponse;
  return (data.workItems ?? []).map(wi => wi.id);
}

// ─── Batch fetch work item details ───────────────────────────────────────────

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

// FIELDS_TO_FETCH gardé pour référence, mais fetchWorkItemsBatch utilise $expand=fields
// pour récupérer tous les champs (utile pour identifier les refs custom dans raw_json)
const _FIELDS_TO_FETCH = [
  'System.Id',
  'System.Title',
  'System.State',
  'System.AreaPath',
  'System.IterationPath',
  'System.AssignedTo',
  'System.CreatedDate',
  'System.ChangedDate',
  'Microsoft.VSTS.Common.Priority',
  'Microsoft.VSTS.Common.ResolvedDate',
  'Microsoft.VSTS.Build.FoundIn',
  'Microsoft.VSTS.Build.IntegrationBuild',
  CUSTOM_FIELD_REFS.versionSouhaitee,
  CUSTOM_FIELD_REFS.resolvedReason,
  CUSTOM_FIELD_REFS.raisonOrigine,
  CUSTOM_FIELD_REFS.sprintDone,
].join(',');
void _FIELDS_TO_FETCH; // non utilisé — $expand=fields récupère tout

async function fetchWorkItemsBatch(ids: number[]): Promise<AdoBug[]> {
  // Pas de filtre fields= : on récupère tous les champs pour pouvoir inspecter
  // les noms réels des champs custom ADO dans raw_json
  const url = `${config.ado.baseUrl}/${config.ado.org}/${config.ado.project}/_apis/wit/workitems?ids=${ids.join(',')}&$expand=fields&api-version=7.1`;
  const res = await adoFetch(url);
  const data = await res.json() as WorkItemsResponse;
  return data.value ?? [];
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchAllBugs(): Promise<AdoBug[]> {
  logger.info('Fetching bug IDs from ADO...');
  const ids = await fetchBugIds();
  logger.info({ count: ids.length }, 'Bug IDs fetched');

  if (ids.length === 0) return [];

  const results: AdoBug[] = [];
  for (const batch of chunk(ids, 200)) {
    const bugs = await fetchWorkItemsBatch(batch);
    results.push(...bugs);
    logger.info({ fetched: results.length, total: ids.length }, 'Fetching work items...');
  }

  logger.info({ count: results.length }, 'All bugs fetched from ADO');
  return results;
}
