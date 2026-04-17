import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { MultiSelect } from '../components/MultiSelect';
import { ConfirmModal } from '../components/ConfirmModal';
import { Select } from '../components/Select';
import { SyncButton } from '../components/SyncButton';
import { useSyncAndEvaluate } from '../hooks/useSyncAndEvaluate';

// ─── Types ────────────────────────────────────────────────────────────────────

type SortDir = 'asc' | 'desc';
type WritableField = 'priority' | 'found_in' | 'version_souhaitee' | 'integration_build' | 'area_path';

interface Violation {
  id: number;
  bug_id: number;
  bug_title: string | null;
  bug_state: string | null;
  bug_team: string | null;
  bug_priority: number | null;
  bug_version_souhaitee: string | null;
  bug_integration_build: string | null;
  bug_found_in: string | null;
  bug_resolved_reason: string | null;
  bug_changed_date: string | null;
}

interface ViolationsResponse {
  total: number;
  page: number;
  limit: number;
  violations: Violation[];
  rule_counts: { rule_code: string; count: number }[];
}

interface EditRowState {
  editValues: Record<string, string>;
  origValues: Record<string, string>;
}

interface DirtyField {
  bugId: number;
  key: string;
  label: string;
  oldVal: string;
  newVal: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LIMIT = 50;

const REAL_TEAMS = ['COCO', 'GO FAHST', 'JURASSIC BACK', 'MAGIC SYSTEM', 'MELI MELO', 'NULL.REF', 'PIXELS', 'LACE'];

// Anciennes équipes à masquer (bugs en cache potentiellement encore présents)
const OBSOLETE_TEAMS = new Set(['PIRATS', 'CORTEX']);

const ZONE_OPTIONS = [
  'Bugs à prioriser',
  'Bugs à corriger LIVE',
  'Bugs à corriger OnPremise',
  'Bugs à corriger Hors versions',
  'Bugs à corriger',
  'Etats',
  'GC',
  'Hors-production',
  'Maintenances',
  'Performance',
  'Sécurité',
];
const ZONE_LABELS: Record<string, string> = {
  'Bugs à prioriser':              'Bugs à prioriser',
  'Bugs à corriger LIVE':          'À corriger - Live',
  'Bugs à corriger OnPremise':     'À corriger - OnPremise',
  'Bugs à corriger Hors versions': 'À corriger - Hors version',
  'Bugs à corriger':               'À corriger (sans zone)',
  Etats:                           'Etats',
  GC:                              'GC',
  'Hors-production':               'Hors-production',
  Maintenances:                    'Maintenances',
  Performance:                     'Performance',
  Sécurité:                        'Sécurité',
};

const BUG_TYPE_LABELS: Record<string, string> = {
  live:          'Live',
  onpremise:     'OnPremise',
  hors_version:  'Hors version',
  uncategorized: 'Non catégorisés',
};

const ALL_RULES = [
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

const FIELD_LABELS: Record<WritableField, string> = {
  priority:          'Priorité',
  found_in:          'Trouvé dans',
  version_souhaitee: 'Version souhaitée',
  integration_build: 'Build',
  area_path:         'Zone',
};

const EDIT_FIELD_LABELS: Record<string, string> = {
  priority:          'Priorité',
  found_in:          'Trouvé dans',
  integration_build: 'Build',
  version_souhaitee: 'Version souhaitée',
};

const ADO_PROJECT = 'Isagri_Dev_GC_GestionCommerciale';

// Mapping label affiché → suffix dans l'area path ADO (quand ils diffèrent)
const TEAM_AREA_SUFFIX: Record<string, string> = {
  'GO FAHST':     'GO_FAHST',
  'MAGIC SYSTEM': 'MAGIC_SYSTEM',
  'MELI MELO':    'MELI_MELO',
  'NULL.REF':     'NULLREF',
};

function teamAreaPath(label: string): string {
  return `${ADO_PROJECT}\\${TEAM_AREA_SUFFIX[label] ?? label}`;
}

const TEAM_AREA_SUFFIXES = new Set(
  REAL_TEAMS.map(t => TEAM_AREA_SUFFIX[t] ?? t)
);

function areaPathLabel(path: string): string {
  const suffix = path.startsWith(ADO_PROJECT + '\\') ? path.slice(ADO_PROJECT.length + 1) : path;
  if (suffix === 'Bugs à corriger\\Versions LIVE')        return 'À corriger — Live';
  if (suffix === 'Bugs à corriger\\Versions historiques') return 'À corriger — OnPremise';
  if (suffix === 'Bugs à corriger\\Hors versions')        return 'À corriger — Hors version';
  return suffix;
}

function isTeamAreaPath(path: string): boolean {
  const suffix = path.startsWith(ADO_PROJECT + '\\') ? path.slice(ADO_PROJECT.length + 1) : path;
  return TEAM_AREA_SUFFIXES.has(suffix);
}

function isObsoleteTeamAreaPath(path: string): boolean {
  const suffix = path.startsWith(ADO_PROJECT + '\\') ? path.slice(ADO_PROJECT.length + 1) : path;
  return OBSOLETE_TEAMS.has(suffix);
}

function humanizeAdoError(raw: string): string {
  return raw
    .replace(/Rule Error for field ([^.]+)\.\s*Error code:\s*Required,\s*InvalidEmpty\.?/gi,
      (_, field) => `Le champ "${field}" est requis et ne peut pas être vide.`)
    .replace(/Rule Error for field ([^.]+)\.\s*Error code:\s*([^.]+)\.?/gi,
      (_, field, code) => `Erreur sur le champ "${field}" (${code.trim()}).`);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return (
    <svg className="w-3 h-3 text-gray-300 ml-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4M16 15l-4 4-4-4" />
    </svg>
  );
  return dir === 'asc'
    ? <svg className="w-3 h-3 text-[#1E40AF] ml-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>
    : <svg className="w-3 h-3 text-[#1E40AF] ml-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>;
}

const STATE_STYLES: Record<string, string> = {
  'New':      'bg-blue-50 text-blue-700 border border-blue-200',
  'Active':   'bg-amber-50 text-amber-700 border border-amber-200',
  'Resolved': 'bg-violet-50 text-violet-700 border border-violet-200',
  'Closed':   'bg-gray-100 text-gray-500 border border-gray-200',
};

function StateBadge({ state }: { state: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${STATE_STYLES[state] ?? 'bg-gray-100 text-gray-600'}`}>
      {state}
    </span>
  );
}

interface ThProps {
  col: string;
  label: string;
  sort: string;
  dir: SortDir;
  onSort: (col: string) => void;
  className?: string;
}

function Th({ col, label, sort, dir, onSort, className = '' }: ThProps) {
  const active = sort === col;
  return (
    <th
      onClick={() => onSort(col)}
      className={`text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide cursor-pointer select-none whitespace-nowrap ${active ? 'text-[#1E40AF]' : 'text-gray-400 hover:text-gray-600'} ${className}`}
    >
      <span className="flex items-center">
        {label}
        <SortIcon active={active} dir={dir} />
      </span>
    </th>
  );
}

function PencilIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
    </svg>
  );
}

function dateShort(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// ─── Editable Cell ────────────────────────────────────────────────────────────

interface EditableCellProps {
  field: string;
  currentValue: string | number | null;
  isRowEditing: boolean;
  editValue: string;
  isFocusField: boolean;
  onStartEdit: () => void;
  onChangeValue: (value: string) => void;
}

function EditableCell({ field, currentValue, isRowEditing, editValue, isFocusField, onStartEdit, onChangeValue }: EditableCellProps) {
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    if (isRowEditing && isFocusField) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isRowEditing, isFocusField]);

  const isEmpty = currentValue === null || currentValue === undefined || currentValue === '';
  const displayVal = isEmpty ? '' : String(currentValue);

  if (!isRowEditing) {
    return (
      <div
        className="group/cell flex items-center gap-1.5 cursor-pointer rounded-lg px-2 py-1 -mx-2 hover:bg-blue-50 transition-colors min-w-[80px]"
        onClick={e => { e.stopPropagation(); onStartEdit(); }}
        title="Cliquer pour modifier"
      >
        <span className={`text-xs font-mono ${isEmpty ? 'text-gray-200 italic' : 'text-gray-700'}`}>
          {isEmpty ? 'vide' : displayVal}
        </span>
        <span className="text-gray-300 opacity-0 group-hover/cell:opacity-100 transition-opacity">
          <PencilIcon />
        </span>
      </div>
    );
  }

  return (
    <div onClick={e => e.stopPropagation()}>
      {field === 'priority' ? (
        <Select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={editValue}
          onChange={e => onChangeValue(e.target.value)}
          onClick={e => e.stopPropagation()}
          tone="editing"
          uiSize="sm"
          className="w-16"
        >
          <option value="">-</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
        </Select>
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={editValue}
          onChange={e => onChangeValue(e.target.value)}
          onClick={e => e.stopPropagation()}
          className="text-xs border border-amber-400 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-300/50 bg-amber-50 w-32"
          placeholder="vide"
        />
      )}
    </div>
  );
}

// ─── Inline Save Confirm Modal ────────────────────────────────────────────────

interface SaveConfirmModalProps {
  dirtyFields: DirtyField[];
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function SaveConfirmModal({ dirtyFields, loading, onConfirm, onCancel }: SaveConfirmModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onCancel(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const bugIds = [...new Set(dirtyFields.map(f => f.bugId))];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div role="button" aria-label="Annuler" tabIndex={0} className="absolute inset-0 bg-black/40" onClick={onCancel} onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg mx-4 p-6 max-h-[80vh] flex flex-col">
        <div className="flex items-start gap-3 mb-5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
            </svg>
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-[#0e1a38]">Confirmer les modifications</h3>
            <p className="text-sm text-gray-400 mt-0.5">
              {bugIds.length} bug{bugIds.length > 1 ? 's' : ''} — {dirtyFields.length} champ{dirtyFields.length > 1 ? 's' : ''} modifié{dirtyFields.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 mb-5">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-gray-100">
                <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">Bug</th>
                <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">Champ</th>
                <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">Avant</th>
                <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2">Après</th>
              </tr>
            </thead>
            <tbody>
              {dirtyFields.map((f, i) => (
                <tr key={`${f.bugId}-${f.key}`} className="border-b border-gray-50">
                  <td className="py-2 pr-4 font-mono text-[12px] text-[#1E40AF] font-semibold whitespace-nowrap">
                    {i === 0 || dirtyFields[i - 1].bugId !== f.bugId ? `#${f.bugId}` : ''}
                  </td>
                  <td className="py-2 pr-4 text-gray-500 font-medium whitespace-nowrap">{f.label}</td>
                  <td className="py-2 pr-4 font-mono text-[12px] text-gray-400 line-through">
                    {f.oldVal || <span className="no-underline not-italic text-gray-300">vide</span>}
                  </td>
                  <td className="py-2 font-mono text-[12px] text-[#0e1a38] font-semibold">
                    {f.newVal || <span className="not-italic font-normal text-gray-300">vide</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-400 mb-4 shrink-0">Ces modifications seront appliquées directement dans Azure DevOps.</p>

        <div className="flex gap-3 justify-end shrink-0">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#1E40AF] hover:bg-[#0F3E8A] disabled:opacity-50 disabled:cursor-wait"
          >
            {loading ? 'Enregistrement…' : 'Enregistrer dans ADO'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Conformity() {
  const navigate = useNavigate();
  const [violations, setViolations] = useState<Violation[]>([]);
  const [ruleCounts, setRuleCounts] = useState<{ rule_code: string; count: number }[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  const [sprints, setSprints]     = useState<string[]>([]);
  const [areaPaths, setAreaPaths] = useState<string[]>([]);

  // Filtres
  const [filterTeams,    setFilterTeams]    = useState<string[]>([]);
  const [filterZones,    setFilterZones]    = useState<string[]>([]);
  const [filterSprints,  setFilterSprints]  = useState<string[]>([]);
  const [filterBugTypes, setFilterBugTypes] = useState<string[]>([]);
  const [filterRules,    setFilterRules]    = useState<string[]>([]);
  const [filterStates,   setFilterStates]   = useState<string[]>([]);
  const [filterId,       setFilterId]       = useState('');
  const [filterTitle,    setFilterTitle]    = useState('');
  const [filterVersion,  setFilterVersion]  = useState('');
  const [filterFoundIn,  setFilterFoundIn]  = useState('');
  const [filterBuild,    setFilterBuild]    = useState('');

  // Tri
  const [sort, setSort] = useState('changed_date');
  const [dir,  setDir]  = useState<SortDir>('desc');

  // Sélection multiple
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Édition multi-champs multi-lignes
  const [editRows,        setEditRows]        = useState<Record<number, EditRowState>>({});
  const [focusBugId,      setFocusBugId]      = useState<number | null>(null);
  const [focusField,      setFocusField]      = useState<string | null>(null);
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [saveError,       setSaveError]       = useState<string | null>(null);

  // Bulk action
  const [bulkField, setBulkField]   = useState<WritableField>('priority');
  const [bulkValue, setBulkValue]   = useState('2');
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [savingBulk, setSavingBulk] = useState(false);
  const [bulkError, setBulkError]   = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/bugs/meta/sprints').then(r => r.json()).then(setSprints).catch((err: unknown) => { console.error('meta/sprints', err); });
    fetch('/api/bugs/meta/areas').then(r => r.json()).then(setAreaPaths).catch((err: unknown) => { console.error('meta/areas', err); });
  }, []);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT), sort, dir });
      if (filterTeams.length)     params.set('team',      filterTeams.join(','));
      if (filterZones.length)     params.set('zone',      filterZones.join(','));
      if (filterSprints.length)   params.set('sprint',    filterSprints.join(','));
      if (filterBugTypes.length)  params.set('bug_type',  filterBugTypes.join(','));
      if (filterRules.length)     params.set('rule_code', filterRules.join(','));
      if (filterStates.length)    params.set('state',     filterStates.join(','));
      if (filterId)               params.set('id',        filterId);
      if (filterTitle)            params.set('title',     filterTitle);
      if (filterVersion)          params.set('version',   filterVersion);
      if (filterFoundIn)          params.set('found_in',  filterFoundIn);
      if (filterBuild)            params.set('build',     filterBuild);

      const res = await fetch(`/api/conformity/violations?${params}`);
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const data: ViolationsResponse = await res.json();
      setViolations(data.violations);
      setRuleCounts(data.rule_counts ?? []);
      setTotal(data.total);
      setPage(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [filterTeams, filterZones, filterSprints, filterBugTypes, filterRules, filterStates, filterId, filterTitle, filterVersion, filterFoundIn, filterBuild, sort, dir]);

  useEffect(() => { load(1); }, [load]);

  const {
    step: syncStep,
    result: syncResult,
    error: syncError,
    run: runSync,
    clearResult: clearSyncResult,
    clearError: clearSyncError,
  } = useSyncAndEvaluate(async () => {
    await load(1);
  });

  // Désélectionner les bugs absents de la page courante
  useEffect(() => {
    if (violations.length > 0) {
      const pageIds = new Set(violations.map(v => v.bug_id));
      setSelectedIds(prev => new Set([...prev].filter(id => pageIds.has(id))));
    }
  }, [violations]);

  function handleSort(col: string) {
    if (sort === col) setDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSort(col); setDir('asc'); }
  }

  function resetFilters() {
    setFilterTeams([]); setFilterZones([]); setFilterSprints([]); setFilterBugTypes([]);
    setFilterRules([]); setFilterStates([]);
    setFilterId(''); setFilterTitle(''); setFilterVersion(''); setFilterFoundIn(''); setFilterBuild('');
  }

  // ─── Sélection ──────────────────────────────────────────────────────────────

  const allPageIds = violations.map(v => v.bug_id);
  const allSelected = allPageIds.length > 0 && allPageIds.every(id => selectedIds.has(id));
  const someSelected = allPageIds.some(id => selectedIds.has(id));

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(prev => { const s = new Set(prev); allPageIds.forEach(id => s.delete(id)); return s; });
    } else {
      setSelectedIds(prev => new Set([...prev, ...allPageIds]));
    }
  }

  function toggleOne(bugId: number) {
    setSelectedIds(prev => {
      const s = new Set(prev);
      s.has(bugId) ? s.delete(bugId) : s.add(bugId);
      return s;
    });
  }

  // ─── Édition multi-champs multi-lignes ─────────────────────────────────────

  const dirtyFields = useMemo((): DirtyField[] => {
    const result: DirtyField[] = [];
    for (const [bugIdStr, row] of Object.entries(editRows)) {
      const bugId = Number(bugIdStr);
      for (const key of Object.keys(row.editValues)) {
        if (row.editValues[key] !== row.origValues[key]) {
          result.push({ bugId, key, label: EDIT_FIELD_LABELS[key] ?? key, oldVal: row.origValues[key] ?? '', newVal: row.editValues[key] ?? '' });
        }
      }
    }
    return result;
  }, [editRows]);

  function cancelEdit() {
    setEditRows({});
    setFocusBugId(null);
    setFocusField(null);
    setSaveError(null);
  }

  function enterEditRow(bugId: number, v: Violation, field: string) {
    setEditRows(prev => {
      if (prev[bugId]) return prev; // déjà en édition — ne pas réinitialiser les valeurs
      const orig: Record<string, string> = {
        priority:          v.bug_priority != null ? String(v.bug_priority) : '',
        found_in:          v.bug_found_in ?? '',
        integration_build: v.bug_integration_build ?? '',
        version_souhaitee: v.bug_version_souhaitee ?? '',
      };
      return { ...prev, [bugId]: { editValues: { ...orig }, origValues: { ...orig } } };
    });
    setFocusBugId(bugId);
    setFocusField(field);
    setSaveError(null);
  }

  function updateEditValue(bugId: number, key: string, val: string) {
    setEditRows(prev => {
      if (!prev[bugId]) return prev;
      return { ...prev, [bugId]: { ...prev[bugId], editValues: { ...prev[bugId].editValues, [key]: val } } };
    });
  }

  async function handleSave() {
    if (dirtyFields.length === 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      for (const f of dirtyFields) {
        const value = f.key === 'priority' ? parseInt(f.newVal, 10) : f.newVal;
        const res = await fetch(`/api/bugs/${f.bugId}/fields`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field: f.key, value }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(`Bug #${f.bugId} — ${humanizeAdoError(data.error ?? `Erreur ${res.status}`)}`);
      }
      cancelEdit();
      load(page);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setSaving(false);
    }
  }

  // ─── Bulk action ────────────────────────────────────────────────────────────

  function requestBulk() {
    if (selectedIds.size === 0) return;
    setConfirmBulk(true);
  }

  async function confirmBulkSave() {
    setSavingBulk(true);
    setBulkError(null);
    try {
      const ids = [...selectedIds];
      const value = bulkField === 'priority' ? parseInt(bulkValue, 10) : bulkValue;
      const res = await fetch('/api/bugs/bulk-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, field: bulkField, value }),
      });
      const data = await res.json() as { updated?: number; failed?: { bug_id: number; error: string }[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? `Erreur ${res.status}`);

      const failed = data.failed ?? [];
      if (failed.length > 0 && (data.updated ?? 0) === 0) {
        // Tous les bugs ont échoué
        const firstErr = humanizeAdoError(failed[0].error);
        throw new Error(`Échec pour tous les bugs — Bug #${failed[0].bug_id} : ${firstErr}`);
      }
      if (failed.length > 0) {
        // Échecs partiels — on affiche sans bloquer
        setBulkError(`${data.updated} bug${(data.updated ?? 0) > 1 ? 's' : ''} mis à jour, ${failed.length} échec${failed.length > 1 ? 's' : ''} — Bug #${failed[0].bug_id} : ${humanizeAdoError(failed[0].error)}`);
      }

      setConfirmBulk(false);
      setSelectedIds(new Set());
      load(page);
    } catch (e) {
      setBulkError(e instanceof Error ? e.message : 'Erreur inconnue');
      setConfirmBulk(false);
    } finally {
      setSavingBulk(false);
    }
  }

  // ─── Dérivés ────────────────────────────────────────────────────────────────

  const hasFilters  = filterTeams.length || filterZones.length || filterSprints.length || filterBugTypes.length || filterRules.length || filterStates.length || filterId || filterTitle || filterVersion || filterFoundIn || filterBuild;
  const totalPages  = Math.ceil(total / LIMIT);

  const headerActions = (
    <SyncButton step={syncStep} onClick={runSync} />
  );

  return (
    <Layout title="Anomalies de conformité" actions={headerActions}>

      {/* Résultat sync + évaluation */}
      {syncResult && (
        <div className="mb-4 flex items-center gap-3 bg-green-50 border border-green-100 rounded-2xl px-5 py-3 text-sm text-green-700">
          <svg className="w-4 h-4 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <span>
            <strong>{syncResult.synced}</strong> bugs importés —{' '}
            <strong>{syncResult.checkedBugs}</strong> analysés,{' '}
            <strong className="text-red-600">{syncResult.newViolations}</strong> nouvelles anomalies,{' '}
            <strong className="text-green-600">{syncResult.resolvedViolations}</strong> résolues.
          </span>
          <button onClick={clearSyncResult} className="ml-auto text-green-400 hover:text-green-600 text-lg leading-none">×</button>
        </div>
      )}
      {syncError && (
        <div className="mb-4 bg-red-50 border border-red-100 rounded-2xl px-5 py-3 text-sm text-red-600 flex items-center justify-between">
          <span>Erreur : {syncError}</span>
          <button onClick={clearSyncError} className="ml-2 text-red-400 hover:text-red-600">×</button>
        </div>
      )}
      {saveError && (
        <div className="mb-4 bg-red-50 border border-red-100 rounded-2xl px-5 py-3 text-sm text-red-600 flex items-center justify-between">
          <span>Erreur lors de la sauvegarde : {saveError}</span>
          <button onClick={() => setSaveError(null)} className="ml-2 text-red-400 hover:text-red-600">×</button>
        </div>
      )}
      {bulkError && (
        <div className="mb-4 bg-red-50 border border-red-100 rounded-2xl px-5 py-3 text-sm text-red-600 flex items-center justify-between">
          <span>Erreur lors de la mise à jour groupée : {bulkError}</span>
          <button onClick={() => setBulkError(null)} className="ml-2 text-red-400 hover:text-red-600">×</button>
        </div>
      )}

      {/* Compteurs par règle */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {loading
          ? <span className="text-sm text-gray-400">Chargement…</span>
          : ruleCounts.length === 0
            ? <span className="text-sm text-gray-400">Aucune anomalie</span>
            : ruleCounts.map(({ rule_code, count }) => (
                <button
                  key={rule_code}
                  onClick={() => setFilterRules(prev => prev.includes(rule_code) ? prev.filter(r => r !== rule_code) : [...prev, rule_code])}
                  className={`flex items-center gap-2 rounded-xl px-3 py-1.5 border text-[11px] font-semibold transition-colors ${filterRules.includes(rule_code) ? 'bg-[#1E40AF] text-white border-[#1E40AF]' : 'bg-white text-gray-700 border-gray-200 hover:border-[#1E40AF] hover:text-[#1E40AF]'}`}
                  title={`Filtrer par règle ${rule_code}`}
                >
                  <span className="font-mono">{rule_code}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${filterRules.includes(rule_code) ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'}`}>{count}</span>
                </button>
              ))
        }
        <span className="text-sm text-gray-400 font-mono ml-auto">{total.toLocaleString('fr-FR')} bug{total !== 1 ? 's' : ''} avec anomalie{total !== 1 ? 's' : ''} au total</span>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 space-y-3">
        {/* Ligne 1 : multi-selects */}
        <div className="flex flex-wrap gap-3 items-center">
          <MultiSelect label="Équipes" options={REAL_TEAMS} selected={filterTeams} onChange={setFilterTeams} />
          <MultiSelect
            label="Zone"
            options={ZONE_OPTIONS}
            selected={filterZones}
            onChange={setFilterZones}
            renderOption={opt => <span>{ZONE_LABELS[opt] ?? opt}</span>}
          />
          <MultiSelect label="États" options={['New', 'Active', 'Resolved', 'Closed']} selected={filterStates} onChange={setFilterStates}
            renderOption={(opt: string) => (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${STATE_STYLES[opt] ?? 'bg-gray-100 text-gray-600'}`}>{opt}</span>
            )}
          />
          <MultiSelect label="Sprints" options={sprints} selected={filterSprints} onChange={setFilterSprints}
            groupBy={v => {
              const sep = v.indexOf(' · ');
              if (sep === -1) return { group: '', itemLabel: v };
              return { group: v.slice(0, sep) === 'Archive' ? 'Archives' : v.slice(0, sep), itemLabel: v.slice(sep + 3) };
            }}
          />
          <MultiSelect
            label="Type"
            options={['live', 'onpremise', 'hors_version', 'uncategorized']}
            selected={filterBugTypes}
            onChange={setFilterBugTypes}
            renderOption={opt => <span>{BUG_TYPE_LABELS[opt] ?? opt}</span>}
          />
          <MultiSelect label="Règles" options={ALL_RULES} selected={filterRules} onChange={setFilterRules} />
          {hasFilters && (
            <button onClick={resetFilters} className="text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2 ml-1">
              Tout réinitialiser
            </button>
          )}
        </div>
        {/* Ligne 2 : champs texte contient */}
        <div className="flex flex-wrap gap-3">
          {([
            { label: 'ID contient',                 value: filterId,      set: setFilterId },
            { label: 'Titre contient',              value: filterTitle,   set: setFilterTitle },
            { label: 'Version souhaitée contient',  value: filterVersion, set: setFilterVersion },
            { label: 'Trouvé dans contient',        value: filterFoundIn, set: setFilterFoundIn },
            { label: 'Build contient',              value: filterBuild,   set: setFilterBuild },
          ] as { label: string; value: string; set: (v: string) => void }[]).map(({ label, value, set }) => (
            <div key={label} className="relative">
              <input
                type="text"
                placeholder={label}
                value={value}
                onChange={e => set(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg pl-3 pr-7 py-2 bg-white text-[#2B2B2B] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#66D2DB]/40 w-52"
              />
              {value && (
                <button onClick={() => set('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 text-lg leading-none">×</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {error && <div className="p-6 text-center text-red-600 text-sm">{error}</div>}

        {!error && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  {/* Checkbox all */}
                  <th className="px-4 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                      onChange={toggleAll}
                      className="rounded border-gray-300 text-[#1E40AF] focus:ring-[#1E40AF]/30 cursor-pointer"
                    />
                  </th>
                  <Th col="bug_id"            label="ID"               sort={sort} dir={dir} onSort={handleSort} />
                  <Th col="title"             label="Titre"            sort={sort} dir={dir} onSort={handleSort} className="min-w-[160px]" />
                  <Th col="state"             label="État"             sort={sort} dir={dir} onSort={handleSort} />
                  <Th col="team"              label="Équipe"           sort={sort} dir={dir} onSort={handleSort} />
                  <Th col="priority"          label="Prio"             sort={sort} dir={dir} onSort={handleSort} />
                  <Th col="found_in"          label="Trouvé dans"      sort={sort} dir={dir} onSort={handleSort} />
                  <Th col="resolved_reason"   label="Raison"           sort={sort} dir={dir} onSort={handleSort} />
                  <Th col="integration_build" label="Build"            sort={sort} dir={dir} onSort={handleSort} />
                  <Th col="version_souhaitee" label="Version souhaitée" sort={sort} dir={dir} onSort={handleSort} />
                  <Th col="changed_date"      label="Modifié"          sort={sort} dir={dir} onSort={handleSort} />
                  <th className="w-6" />
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={12} className="px-4 py-10 text-center text-gray-400 text-sm">Chargement…</td></tr>
                )}
                {!loading && violations.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-4 py-16 text-center">
                      <div className="text-4xl mb-3">✓</div>
                      <div className="text-sm font-semibold text-green-700 mb-1">Aucune anomalie</div>
                      <div className="text-xs text-gray-400">
                        {hasFilters ? 'Aucune anomalie avec ces filtres.' : 'Lancez une évaluation pour détecter les anomalies.'}
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && violations.map(v => {
                  const isSelected   = selectedIds.has(v.bug_id);
                  const isRowEditing = v.bug_id in editRows;
                  const rowEdit      = editRows[v.bug_id];

                  return (
                    <tr
                      key={v.id}
                      onClick={() => { if (!isRowEditing) navigate(`/conformity/${v.bug_id}`); }}
                      className={[
                        'border-b border-gray-50 group transition-colors',
                        isRowEditing ? 'bg-amber-50/60 cursor-default' : 'cursor-pointer',
                        isSelected && !isRowEditing ? 'bg-blue-50/50' : '',
                        !isRowEditing && !isSelected ? 'hover:bg-[#66D2DB]/5' : '',
                      ].join(' ')}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(v.bug_id)}
                          className="rounded border-gray-300 text-[#1E40AF] focus:ring-[#1E40AF]/30 cursor-pointer"
                        />
                      </td>

                      {/* ID */}
                      <td className="px-4 py-3 font-mono text-[12px] text-[#1E40AF] font-semibold whitespace-nowrap">
                        <a
                          href={`https://dev.azure.com/Isagri-Prod-Progiciels/Isagri_Dev_GC_GestionCommerciale/_workitems/edit/${v.bug_id}`}
                          target="_blank" rel="noopener noreferrer"
                          className="hover:underline"
                          onClick={e => e.stopPropagation()}
                        >
                          #{v.bug_id}
                        </a>
                      </td>

                      {/* Titre */}
                      <td className="px-4 py-3 text-[#2B2B2B] max-w-[300px]">
                        <span className="line-clamp-2 leading-snug" title={v.bug_title ?? undefined}>{v.bug_title ?? ''}</span>
                      </td>

                      {/* État */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {v.bug_state && <StateBadge state={v.bug_state} />}
                      </td>

                      {/* Équipe */}
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-[12px]">{v.bug_team ?? ''}</td>

                      {/* Prio — éditable */}
                      <td className="px-4 py-3">
                        <EditableCell
                          field="priority"
                          currentValue={v.bug_priority}
                          isRowEditing={isRowEditing}
                          editValue={isRowEditing ? (rowEdit.editValues['priority'] ?? '') : ''}
                          isFocusField={focusBugId === v.bug_id && focusField === 'priority'}
                          onStartEdit={() => enterEditRow(v.bug_id, v, 'priority')}
                          onChangeValue={val => updateEditValue(v.bug_id, 'priority', val)}
                        />
                      </td>

                      {/* Trouvé dans — éditable */}
                      <td className="px-4 py-3">
                        <EditableCell
                          field="found_in"
                          currentValue={v.bug_found_in}
                          isRowEditing={isRowEditing}
                          editValue={isRowEditing ? (rowEdit.editValues['found_in'] ?? '') : ''}
                          isFocusField={focusBugId === v.bug_id && focusField === 'found_in'}
                          onStartEdit={() => enterEditRow(v.bug_id, v, 'found_in')}
                          onChangeValue={val => updateEditValue(v.bug_id, 'found_in', val)}
                        />
                      </td>

                      {/* Raison */}
                      <td className="px-4 py-3 text-[12px] text-gray-500 whitespace-nowrap">{v.bug_resolved_reason ?? ''}</td>

                      {/* Build — éditable */}
                      <td className="px-4 py-3">
                        <EditableCell
                          field="integration_build"
                          currentValue={v.bug_integration_build}
                          isRowEditing={isRowEditing}
                          editValue={isRowEditing ? (rowEdit.editValues['integration_build'] ?? '') : ''}
                          isFocusField={focusBugId === v.bug_id && focusField === 'integration_build'}
                          onStartEdit={() => enterEditRow(v.bug_id, v, 'integration_build')}
                          onChangeValue={val => updateEditValue(v.bug_id, 'integration_build', val)}
                        />
                      </td>

                      {/* Version souhaitée — éditable */}
                      <td className="px-4 py-3">
                        <EditableCell
                          field="version_souhaitee"
                          currentValue={v.bug_version_souhaitee}
                          isRowEditing={isRowEditing}
                          editValue={isRowEditing ? (rowEdit.editValues['version_souhaitee'] ?? '') : ''}
                          isFocusField={focusBugId === v.bug_id && focusField === 'version_souhaitee'}
                          onStartEdit={() => enterEditRow(v.bug_id, v, 'version_souhaitee')}
                          onChangeValue={val => updateEditValue(v.bug_id, 'version_souhaitee', val)}
                        />
                      </td>

                      {/* Modifié */}
                      <td className="px-4 py-3 text-[12px] text-gray-400 whitespace-nowrap">{dateShort(v.bug_changed_date)}</td>

                      {/* Détail */}
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <Link
                          to={`/conformity/${v.bug_id}`}
                          className="text-xs font-bold text-[#1E40AF] hover:text-[#0F3E8A] opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Voir le détail"
                        >
                          →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && !loading && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[12px] text-gray-400">
              Page {page} / {totalPages} — {total.toLocaleString('fr-FR')} anomalies
            </span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => load(page - 1)}
                className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-30 hover:bg-gray-50">
                ← Précédent
              </button>
              <button disabled={page >= totalPages} onClick={() => load(page + 1)}
                className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-30 hover:bg-gray-50">
                Suivant →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Barre d'édition multi-lignes ─────────────────────────────────────── */}
      {Object.keys(editRows).length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-amber-900 text-white rounded-2xl shadow-2xl border border-amber-800/50 px-5 py-3.5 flex items-center gap-4 min-w-[480px] max-w-2xl">
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-6 h-6 rounded-full bg-amber-600 text-[11px] font-bold flex items-center justify-center">
              {dirtyFields.length}
            </span>
            <span className="text-sm font-semibold">
              {dirtyFields.length === 0
                ? `${Object.keys(editRows).length} ligne${Object.keys(editRows).length > 1 ? 's' : ''} en cours de modification`
                : `${dirtyFields.length} modification${dirtyFields.length > 1 ? 's' : ''} sur ${[...new Set(dirtyFields.map(f => f.bugId))].length} bug${[...new Set(dirtyFields.map(f => f.bugId))].length > 1 ? 's' : ''}`}
            </span>
          </div>

          <div className="flex-1" />

          <button
            onClick={cancelEdit}
            disabled={saving}
            className="shrink-0 px-4 py-1.5 rounded-xl text-sm font-semibold border border-amber-700 hover:bg-amber-800 disabled:opacity-50 transition-colors"
          >
            Annuler
          </button>

          <button
            onClick={() => setShowConfirmSave(true)}
            disabled={saving || dirtyFields.length === 0}
            className="shrink-0 px-4 py-1.5 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-amber-950"
          >
            {saving ? 'Enregistrement…' : `Appliquer (${dirtyFields.length})`}
          </button>
        </div>
      )}

      {/* ── Barre bulk action ────────────────────────────────────────────────── */}
      {selectedIds.size > 0 && Object.keys(editRows).length === 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#0e1a38] text-white rounded-2xl shadow-2xl border border-white/10 px-5 py-3.5 flex items-center gap-4 min-w-[560px] max-w-2xl">
          {/* Compteur */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-6 h-6 rounded-full bg-[#1E40AF] text-[11px] font-bold flex items-center justify-center">
              {selectedIds.size}
            </span>
            <span className="text-sm font-semibold">bug{selectedIds.size > 1 ? 's' : ''} sélectionné{selectedIds.size > 1 ? 's' : ''}</span>
          </div>

          <div className="w-px h-6 bg-white/15 shrink-0" />

          {/* Sélecteur champ */}
          <Select
            value={bulkField}
            onChange={e => {
              const f = e.target.value as WritableField;
              setBulkField(f);
              setBulkValue(f === 'priority' ? '2' : f === 'area_path' ? (areaPaths[0] ?? '') : '');
            }}
            tone="inverse"
            className="shrink-0 min-w-[180px]"
          >
            <option value="priority">Priorité</option>
            <option value="version_souhaitee">Version souhaitée</option>
            <option value="integration_build">Build</option>
            <option value="area_path">Zone</option>
          </Select>

          {/* Valeur */}
          {bulkField === 'priority' ? (
            <Select
              value={bulkValue}
              onChange={e => setBulkValue(e.target.value)}
              tone="inverse"
              className="w-20 shrink-0"
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </Select>
          ) : bulkField === 'area_path' ? (
            <Select
              value={bulkValue}
              onChange={e => setBulkValue(e.target.value)}
              tone="inverse"
              className="shrink-0 max-w-[200px]"
            >
              <optgroup label="Équipes">
                {REAL_TEAMS.map(t => {
                  const p = teamAreaPath(t);
                  return <option key={p} value={p}>{t}</option>;
                })}
              </optgroup>
              <optgroup label="Zone">
                {areaPaths.filter(p => !isTeamAreaPath(p) && !isObsoleteTeamAreaPath(p)).map(p => (
                  <option key={p} value={p}>{areaPathLabel(p)}</option>
                ))}
              </optgroup>
            </Select>
          ) : (
            <input
              type="text"
              value={bulkValue}
              onChange={e => setBulkValue(e.target.value)}
              placeholder="Nouvelle valeur..."
              className="bg-white border border-white/30 rounded-xl text-sm px-3 py-1.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/50 flex-1 min-w-[180px]"
            />
          )}

          {/* Appliquer */}
          <button
            onClick={requestBulk}
            disabled={savingBulk || !bulkValue}
            className="shrink-0 px-4 py-1.5 rounded-xl text-sm font-semibold bg-[#1E40AF] hover:bg-[#2a78d6] disabled:opacity-50 disabled:cursor-wait transition-colors"
          >
            {savingBulk ? 'Enregistrement…' : 'Appliquer'}
          </button>

          {/* Désélectionner */}
          <button
            onClick={() => setSelectedIds(new Set())}
            className="shrink-0 text-white/50 hover:text-white transition-colors"
            title="Désélectionner tout"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Modales ──────────────────────────────────────────────────────────── */}

      {/* Confirmation sauvegarde multi-champs */}
      {showConfirmSave && (
        <SaveConfirmModal
          dirtyFields={dirtyFields}
          loading={saving}
          onConfirm={() => { setShowConfirmSave(false); handleSave(); }}
          onCancel={() => setShowConfirmSave(false)}
        />
      )}

      {/* Confirmation bulk */}
      {confirmBulk && (
        <ConfirmModal
          title={`Modifier ${selectedIds.size} bug${selectedIds.size > 1 ? 's' : ''}`}
          message={`Champ : ${FIELD_LABELS[bulkField]}\nNouvelle valeur : "${bulkField === 'area_path' ? areaPathLabel(bulkValue) : bulkValue}"\n\nCette action modifiera ${selectedIds.size} bug${selectedIds.size > 1 ? 's' : ''} dans Azure DevOps.`}
          confirmLabel={`Appliquer à ${selectedIds.size} bug${selectedIds.size > 1 ? 's' : ''}`}
          loading={savingBulk}
          onConfirm={confirmBulkSave}
          onCancel={() => setConfirmBulk(false)}
        />
      )}
    </Layout>
  );
}
