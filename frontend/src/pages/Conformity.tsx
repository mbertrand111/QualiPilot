import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { MultiSelect } from '../components/MultiSelect';
import { ConfirmModal } from '../components/ConfirmModal';

// ─── Types ────────────────────────────────────────────────────────────────────

type Severity = 'error' | 'warning';
type WritableField = 'priority' | 'version_souhaitee' | 'integration_build';

interface Violation {
  id: number;
  bug_id: number;
  detected_at: string;
  bug_title: string | null;
  bug_state: string | null;
  bug_team: string | null;
  bug_priority: number | null;
  bug_sprint: string | null;
  bug_version_souhaitee: string | null;
  bug_integration_build: string | null;
  rule_code: string;
  rule_description: string;
  severity: Severity;
}

interface ViolationsResponse {
  total: number;
  page: number;
  limit: number;
  violations: Violation[];
}

interface RunResult {
  checkedBugs: number;
  newViolations: number;
  resolvedViolations: number;
  runAt: string;
}

interface EditState {
  bugId: number;
  field: WritableField;
  value: string;
}

interface ConfirmState {
  bugId: number;
  field: WritableField;
  value: unknown;
  displayValue: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LIMIT = 50;

const ALL_RULES = [
  'PRIORITY_CHECK',
  'VERSION_SOUHAITEE_CHECK',
  'INTEGRATION_BUILD_REQUIRED',
  'VERSION_BUILD_COHERENCE',
  'INTEGRATION_BUILD_NOT_EMPTIED',
  'CLOSED_BUG_COHERENCE',
  'NON_CONCERNE_COHERENCE',
  'FAH_VERSION_REQUIRED',
  'CLOSED_BUG_IN_TRIAGE_AREA',
  'AREA_PATH_PRODUCT_COHERENCE',
];

const FIELD_LABELS: Record<WritableField, string> = {
  priority: 'Priorité',
  version_souhaitee: 'Version souhaitée',
  integration_build: 'Build',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: Severity }) {
  return severity === 'error' ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
      Erreur
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
      Avertissement
    </span>
  );
}

function RunIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${spinning ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
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
  bugId: number;
  field: WritableField;
  currentValue: string | number | null;
  editing: boolean;
  editValue: string;
  onStartEdit: (bugId: number, field: WritableField, value: string) => void;
  onChangeValue: (value: string) => void;
  onRequestSave: () => void;
  onCancelEdit: () => void;
}

function EditableCell({ bugId, field, currentValue, editing, editValue, onStartEdit, onChangeValue, onRequestSave, onCancelEdit }: EditableCellProps) {
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    if (editing) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [editing]);

  const displayVal = currentValue !== null && currentValue !== undefined && currentValue !== '' ? String(currentValue) : '—';

  if (!editing) {
    return (
      <div
        className="group/cell flex items-center gap-1.5 cursor-pointer rounded-lg px-2 py-1 -mx-2 hover:bg-blue-50 transition-colors min-w-[80px]"
        onClick={() => onStartEdit(bugId, field, currentValue !== null && currentValue !== undefined ? String(currentValue) : '')}
        title="Cliquer pour modifier"
      >
        <span className={`text-xs font-mono ${currentValue !== null && currentValue !== '' ? 'text-gray-700' : 'text-gray-300'}`}>
          {displayVal}
        </span>
        <span className="text-gray-300 opacity-0 group-hover/cell:opacity-100 transition-opacity">
          <PencilIcon />
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
      {field === 'priority' ? (
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={editValue}
          onChange={e => onChangeValue(e.target.value)}
          className="text-xs border border-[#1E63B6] rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#1E63B6]/30 bg-white w-16"
        >
          <option value="">—</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
        </select>
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={editValue}
          onChange={e => onChangeValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onRequestSave(); if (e.key === 'Escape') onCancelEdit(); }}
          className="text-xs border border-[#1E63B6] rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#1E63B6]/30 w-32"
          placeholder="—"
        />
      )}
      <button
        onClick={onRequestSave}
        className="p-1 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
        title="Enregistrer"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </button>
      <button
        onClick={onCancelEdit}
        className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
        title="Annuler"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Conformity() {
  const navigate = useNavigate();
  const [violations, setViolations] = useState<Violation[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  const [teams, setTeams] = useState<string[]>([]);

  // Filtres
  const [filterTeams,    setFilterTeams]    = useState<string[]>([]);
  const [filterRules,    setFilterRules]    = useState<string[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<string[]>([]);

  // Synchronisation ADO
  const [syncing, setSyncing]       = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; lastSyncAt: string } | null>(null);
  const [syncError, setSyncError]   = useState<string | null>(null);

  // Lancer l'évaluation
  const [running, setRunning]     = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [runError, setRunError]   = useState<string | null>(null);

  // Sélection multiple
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Largeurs des colonnes (redimensionnables, persistées dans localStorage)
  const COL_WIDTHS_KEY = 'qualipilot:conformity:colWidths';
  const COL_WIDTHS_DEFAULT = { bug: 180, team: 90, priority: 64, version: 130, build: 110, rule: 160, severity: 100, date: 70 };

  const [colWidths, setColWidths] = useState<typeof COL_WIDTHS_DEFAULT>(() => {
    try {
      const saved = localStorage.getItem(COL_WIDTHS_KEY);
      if (saved) return { ...COL_WIDTHS_DEFAULT, ...JSON.parse(saved) };
    } catch { /* ignore */ }
    return COL_WIDTHS_DEFAULT;
  });

  useEffect(() => {
    localStorage.setItem(COL_WIDTHS_KEY, JSON.stringify(colWidths));
  }, [colWidths]);

  function resetColWidths() {
    setColWidths(COL_WIDTHS_DEFAULT);
    localStorage.removeItem(COL_WIDTHS_KEY);
  }

  const resizingRef = useRef<{ key: keyof typeof colWidths; startX: number; startWidth: number } | null>(null);

  function startResize(key: keyof typeof colWidths, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = { key, startX: e.clientX, startWidth: colWidths[key] };
    function onMove(ev: MouseEvent) {
      if (!resizingRef.current) return;
      const diff = ev.clientX - resizingRef.current.startX;
      setColWidths(prev => ({ ...prev, [resizingRef.current!.key]: Math.max(48, resizingRef.current!.startWidth + diff) }));
    }
    function onUp() {
      resizingRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // Édition inline
  const [editState, setEditState]   = useState<EditState | null>(null);
  const [confirmEdit, setConfirmEdit] = useState<ConfirmState | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);

  // Bulk action
  const [bulkField, setBulkField]   = useState<WritableField>('priority');
  const [bulkValue, setBulkValue]   = useState('2');
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [savingBulk, setSavingBulk] = useState(false);
  const [bulkError, setBulkError]   = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/bugs/meta/teams').then(r => r.json()).then(setTeams).catch(() => {});
  }, []);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
      if (filterTeams.length)    params.set('team',      filterTeams.join(','));
      if (filterRules.length)    params.set('rule_code', filterRules.join(','));
      if (filterSeverity.length) params.set('severity',  filterSeverity.map(s => s === 'Erreur' ? 'error' : 'warning').join(','));

      const res = await fetch(`/api/conformity/violations?${params}`);
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const data: ViolationsResponse = await res.json();
      setViolations(data.violations);
      setTotal(data.total);
      setPage(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [filterTeams, filterRules, filterSeverity]);

  useEffect(() => { load(1); }, [load]);

  // Désélectionner les bugs absents de la page courante
  useEffect(() => {
    if (violations.length > 0) {
      const pageIds = new Set(violations.map(v => v.bug_id));
      setSelectedIds(prev => new Set([...prev].filter(id => pageIds.has(id))));
    }
  }, [violations]);

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    setSyncError(null);
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const result = await res.json();
      setSyncResult(result);
      load(1);
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setSyncing(false);
    }
  }

  async function handleRun() {
    setRunning(true);
    setRunResult(null);
    setRunError(null);
    try {
      const res = await fetch('/api/conformity/run', { method: 'POST' });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const result: RunResult = await res.json();
      setRunResult(result);
      load(1);
    } catch (e) {
      setRunError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setRunning(false);
    }
  }

  function resetFilters() {
    setFilterTeams([]); setFilterRules([]); setFilterSeverity([]);
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

  // ─── Édition inline ─────────────────────────────────────────────────────────

  function startEdit(bugId: number, field: WritableField, value: string) {
    setEditState({ bugId, field, value });
    setSaveError(null);
  }

  function requestSave() {
    if (!editState) return;
    const { bugId, field, value } = editState;
    const parsed = field === 'priority' ? parseInt(value, 10) : value;
    const displayValue = field === 'priority' ? `Priorité → ${value}` : `${FIELD_LABELS[field]} → "${value}"`;
    setConfirmEdit({ bugId, field, value: parsed, displayValue });
  }

  async function confirmSave() {
    if (!confirmEdit) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/bugs/${confirmEdit.bugId}/fields`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: confirmEdit.field, value: confirmEdit.value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Erreur ${res.status}`);
      setConfirmEdit(null);
      setEditState(null);
      setSaveError(null);
      load(page);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Erreur inconnue');
      setConfirmEdit(null);
    } finally {
      setSavingEdit(false);
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Erreur ${res.status}`);
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

  const hasFilters  = filterTeams.length || filterRules.length || filterSeverity.length;
  const totalPages  = Math.ceil(total / LIMIT);
  const errorsCount = violations.filter(v => v.severity === 'error').length;
  const warningsCount = violations.filter(v => v.severity === 'warning').length;

  const headerActions = (
    <div className="flex items-center gap-2">
      {/* Synchroniser ADO */}
      <button
        onClick={handleSync}
        disabled={syncing || running}
        className={[
          'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border',
          syncing
            ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-wait'
            : 'bg-white text-gray-600 border-gray-200 hover:border-[#1E63B6] hover:text-[#1E63B6] hover:bg-blue-50',
        ].join(' ')}
      >
        <svg className={`w-4 h-4 shrink-0 ${syncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
        {syncing ? 'Synchronisation…' : 'Synchroniser'}
      </button>

      {/* Lancer l'évaluation */}
      <button
        onClick={handleRun}
        disabled={running || syncing}
        className={[
          'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all',
          running
            ? 'bg-[#1E63B6]/60 cursor-wait'
            : 'bg-[#1E63B6] hover:bg-[#0F3E8A] shadow-md shadow-[#1E63B6]/25',
        ].join(' ')}
      >
        <RunIcon spinning={running} />
        {running ? 'Évaluation…' : 'Lancer l\'évaluation'}
      </button>
    </div>
  );

  return (
    <Layout title="Anomalies de conformité" actions={headerActions}>

      {/* Résultat de la sync */}
      {syncResult && (
        <div className="mb-4 flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-5 py-3 text-sm text-blue-700">
          <svg className="w-4 h-4 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          <span>Synchronisation terminée — <strong>{syncResult.synced}</strong> bugs importés depuis Azure DevOps.</span>
          <button onClick={() => setSyncResult(null)} className="ml-auto text-blue-400 hover:text-blue-600 text-lg leading-none">×</button>
        </div>
      )}
      {syncError && (
        <div className="mb-4 bg-red-50 border border-red-100 rounded-2xl px-5 py-3 text-sm text-red-600 flex items-center justify-between">
          <span>Erreur de synchronisation : {syncError}</span>
          <button onClick={() => setSyncError(null)} className="ml-2 text-red-400 hover:text-red-600">×</button>
        </div>
      )}

      {/* Résultat du run */}
      {runResult && (
        <div className="mb-4 flex items-center gap-3 bg-green-50 border border-green-100 rounded-2xl px-5 py-3 text-sm text-green-700">
          <svg className="w-4 h-4 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <span>
            Évaluation terminée — <strong>{runResult.checkedBugs}</strong> bugs analysés,{' '}
            <strong className="text-red-600">{runResult.newViolations}</strong> nouvelles anomalies,{' '}
            <strong className="text-green-600">{runResult.resolvedViolations}</strong> résolues.
          </span>
          <button onClick={() => setRunResult(null)} className="ml-auto text-green-400 hover:text-green-600 text-lg leading-none">×</button>
        </div>
      )}
      {runError && (
        <div className="mb-4 bg-red-50 border border-red-100 rounded-2xl px-5 py-3 text-sm text-red-600">
          Erreur lors de l'évaluation : {runError}
          <button onClick={() => setRunError(null)} className="ml-2 text-red-400 hover:text-red-600">×</button>
        </div>
      )}
      {saveError && (
        <div className="mb-4 bg-red-50 border border-red-100 rounded-2xl px-5 py-3 text-sm text-red-600">
          Erreur lors de la sauvegarde : {saveError}
          <button onClick={() => setSaveError(null)} className="ml-2 text-red-400 hover:text-red-600">×</button>
        </div>
      )}
      {bulkError && (
        <div className="mb-4 bg-red-50 border border-red-100 rounded-2xl px-5 py-3 text-sm text-red-600">
          Erreur lors de la mise à jour groupée : {bulkError}
          <button onClick={() => setBulkError(null)} className="ml-2 text-red-400 hover:text-red-600">×</button>
        </div>
      )}

      {/* Compteurs */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-2">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-sm font-semibold text-red-700">
            {loading ? '…' : errorsCount} erreur{errorsCount !== 1 ? 's' : ''} (page)
          </span>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-sm font-semibold text-amber-700">
            {loading ? '…' : warningsCount} avertissement{warningsCount !== 1 ? 's' : ''} (page)
          </span>
        </div>
        <span className="text-sm text-gray-400 font-mono ml-auto">{total.toLocaleString('fr-FR')} anomalie{total !== 1 ? 's' : ''} au total</span>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <MultiSelect
            label="Équipes"
            options={teams}
            selected={filterTeams}
            onChange={setFilterTeams}
          />
          <MultiSelect
            label="Règles"
            options={ALL_RULES}
            selected={filterRules}
            onChange={setFilterRules}
          />
          <MultiSelect
            label="Sévérité"
            options={['Erreur', 'Avertissement']}
            selected={filterSeverity}
            onChange={setFilterSeverity}
            renderOption={opt => (
              opt === 'Erreur'
                ? <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-red-700"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />Erreur</span>
                : <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Avertissement</span>
            )}
          />
          {hasFilters ? (
            <button onClick={resetFilters} className="text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2 ml-1">
              Tout réinitialiser
            </button>
          ) : null}
          <button
            onClick={resetColWidths}
            title="Remettre les colonnes à leur taille par défaut"
            className="ml-auto flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-600 border border-gray-200 hover:border-gray-300 rounded-lg px-2.5 py-1.5 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
            Colonnes par défaut
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {error && <div className="p-6 text-center text-red-600 text-sm">{error}</div>}

        {!error && (
          <div className="overflow-x-auto">
            <table className="text-sm" style={{ tableLayout: 'fixed', width: colWidths.bug + colWidths.team + colWidths.priority + colWidths.version + colWidths.build + colWidths.rule + colWidths.severity + colWidths.date + 28 + 24 }}>
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  {/* Checkbox all */}
                  <th className="px-3 py-3" style={{ width: 28 }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                      onChange={toggleAll}
                      className="rounded border-gray-300 text-[#1E63B6] focus:ring-[#1E63B6]/30 cursor-pointer"
                    />
                  </th>
                  {(
                    [
                      { key: 'bug',      label: 'Bug'      },
                      { key: 'team',     label: 'Équipe'   },
                      { key: 'priority', label: 'Prio'     },
                      { key: 'version',  label: 'Version'  },
                      { key: 'build',    label: 'Build'    },
                      { key: 'rule',     label: 'Règle'    },
                      { key: 'severity', label: 'Sévérité' },
                      { key: 'date',     label: 'Détecté'  },
                    ] as { key: keyof typeof colWidths; label: string }[]
                  ).map(col => (
                    <th
                      key={col.key}
                      style={{ width: colWidths[col.key] }}
                      className="text-left px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400 relative select-none overflow-hidden"
                    >
                      <span className="truncate block pr-2">{col.label}</span>
                      {/* Resize handle */}
                      <div
                        onMouseDown={e => startResize(col.key, e)}
                        className="absolute right-0 top-0 h-full w-2 cursor-col-resize flex items-center justify-center group/rh"
                      >
                        <div className="w-px h-3/4 bg-gray-200 group-hover/rh:bg-[#1E63B6] group-hover/rh:w-0.5 transition-all" />
                      </div>
                    </th>
                  ))}
                  <th style={{ width: 24 }} />
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={10} className="px-5 py-10 text-center text-gray-400 text-sm">Chargement…</td></tr>
                )}
                {!loading && violations.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-5 py-16 text-center">
                      <div className="text-4xl mb-3">✓</div>
                      <div className="text-sm font-semibold text-green-700 mb-1">Aucune anomalie</div>
                      <div className="text-xs text-gray-400">
                        {hasFilters ? 'Aucune anomalie avec ces filtres.' : 'Lancez une évaluation pour détecter les anomalies.'}
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && violations.map(v => {
                  const isSelected = selectedIds.has(v.bug_id);
                  const isEditingPriority = editState?.bugId === v.bug_id && editState.field === 'priority';
                  const isEditingVersion  = editState?.bugId === v.bug_id && editState.field === 'version_souhaitee';
                  const isEditingBuild    = editState?.bugId === v.bug_id && editState.field === 'integration_build';
                  const isEditing = isEditingPriority || isEditingVersion || isEditingBuild;

                  return (
                    <tr
                      key={v.id}
                      onClick={() => !isEditing && navigate(`/conformity/${v.bug_id}`)}
                      className={`border-b border-gray-50 group transition-colors ${isEditing ? '' : 'cursor-pointer'} ${isSelected ? 'bg-blue-50/50' : 'hover:bg-[#66D2DB]/8'}`}
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(v.bug_id)}
                          className="rounded border-gray-300 text-[#1E63B6] focus:ring-[#1E63B6]/30 cursor-pointer"
                        />
                      </td>

                      {/* Bug */}
                      <td className="px-3 py-2.5">
                        <div className="font-mono text-[11px] font-semibold text-[#1E63B6]">
                          <a
                            href={`https://dev.azure.com/Isagri-Prod-Progiciels/Isagri_Dev_GC_GestionCommerciale/_workitems/edit/${v.bug_id}`}
                            target="_blank" rel="noopener noreferrer"
                            className="hover:underline"
                            onClick={e => e.stopPropagation()}
                          >
                            #{v.bug_id}
                          </a>
                        </div>
                        <div className="text-[12px] font-semibold text-[#2B2B2B] line-clamp-1 leading-snug mt-0.5 truncate" title={v.bug_title ?? undefined}>{v.bug_title ?? ''}</div>
                      </td>

                      {/* Équipe */}
                      <td className="px-3 py-2.5">
                        <span className="text-[10px] font-mono font-semibold text-gray-600 bg-gray-100 rounded-lg px-2 py-0.5 whitespace-nowrap">
                          {v.bug_team ?? ''}
                        </span>
                      </td>

                      {/* Priorité — éditable */}
                      <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                        <EditableCell
                          bugId={v.bug_id}
                          field="priority"
                          currentValue={v.bug_priority}
                          editing={isEditingPriority}
                          editValue={isEditingPriority ? editState.value : ''}
                          onStartEdit={startEdit}
                          onChangeValue={val => setEditState(s => s ? { ...s, value: val } : null)}
                          onRequestSave={requestSave}
                          onCancelEdit={() => setEditState(null)}
                        />
                      </td>

                      {/* Version souhaitée — éditable */}
                      <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                        <EditableCell
                          bugId={v.bug_id}
                          field="version_souhaitee"
                          currentValue={v.bug_version_souhaitee}
                          editing={isEditingVersion}
                          editValue={isEditingVersion ? editState.value : ''}
                          onStartEdit={startEdit}
                          onChangeValue={val => setEditState(s => s ? { ...s, value: val } : null)}
                          onRequestSave={requestSave}
                          onCancelEdit={() => setEditState(null)}
                        />
                      </td>

                      {/* Build — éditable */}
                      <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                        <EditableCell
                          bugId={v.bug_id}
                          field="integration_build"
                          currentValue={v.bug_integration_build}
                          editing={isEditingBuild}
                          editValue={isEditingBuild ? editState.value : ''}
                          onStartEdit={startEdit}
                          onChangeValue={val => setEditState(s => s ? { ...s, value: val } : null)}
                          onRequestSave={requestSave}
                          onCancelEdit={() => setEditState(null)}
                        />
                      </td>

                      {/* Règle */}
                      <td className="px-3 py-2.5">
                        <div className="text-[10px] font-mono text-[#1E63B6] bg-blue-50 rounded-lg px-2 py-0.5 whitespace-nowrap inline-block max-w-[150px] truncate" title={v.rule_code}>
                          {v.rule_code}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{v.rule_description}</div>
                      </td>

                      {/* Sévérité */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <SeverityBadge severity={v.severity} />
                      </td>

                      {/* Détecté */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="text-[11px] text-gray-400 font-mono">{dateShort(v.detected_at)}</span>
                      </td>

                      {/* Détail — toujours visible */}
                      <td className="px-3 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                        <Link
                          to={`/conformity/${v.bug_id}`}
                          className="text-xs font-bold text-[#1E63B6] hover:text-[#0F3E8A] opacity-0 group-hover:opacity-100 transition-opacity"
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
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
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

      {/* ── Barre bulk action ────────────────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#0e1a38] text-white rounded-2xl shadow-2xl border border-white/10 px-5 py-3.5 flex items-center gap-4 min-w-[560px] max-w-2xl">
          {/* Compteur */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-6 h-6 rounded-full bg-[#1E63B6] text-[11px] font-bold flex items-center justify-center">
              {selectedIds.size}
            </span>
            <span className="text-sm font-semibold">bug{selectedIds.size > 1 ? 's' : ''} sélectionné{selectedIds.size > 1 ? 's' : ''}</span>
          </div>

          <div className="w-px h-6 bg-white/15 shrink-0" />

          {/* Sélecteur champ */}
          <select
            value={bulkField}
            onChange={e => { setBulkField(e.target.value as WritableField); setBulkValue(e.target.value === 'priority' ? '2' : ''); }}
            className="bg-white/10 border border-white/20 rounded-xl text-sm px-3 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-[#1E63B6]/50 shrink-0"
          >
            <option value="priority">Priorité</option>
            <option value="version_souhaitee">Version souhaitée</option>
            <option value="integration_build">Build</option>
          </select>

          {/* Valeur */}
          {bulkField === 'priority' ? (
            <select
              value={bulkValue}
              onChange={e => setBulkValue(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-xl text-sm px-3 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-[#1E63B6]/50 w-20 shrink-0"
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          ) : (
            <input
              type="text"
              value={bulkValue}
              onChange={e => setBulkValue(e.target.value)}
              placeholder="Nouvelle valeur…"
              className="bg-white/10 border border-white/20 rounded-xl text-sm px-3 py-1.5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#1E63B6]/50 flex-1 min-w-0"
            />
          )}

          {/* Appliquer */}
          <button
            onClick={requestBulk}
            disabled={savingBulk || !bulkValue}
            className="shrink-0 px-4 py-1.5 rounded-xl text-sm font-semibold bg-[#1E63B6] hover:bg-[#2a78d6] disabled:opacity-50 disabled:cursor-wait transition-colors"
          >
            {savingBulk ? 'Enregistrement…' : 'Appliquer'}
          </button>

          {/* Désélectionner */}
          <button
            onClick={() => setSelectedIds(new Set())}
            className="shrink-0 text-white/50 hover:text-white transition-colors ml-auto"
            title="Désélectionner tout"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Modales de confirmation ──────────────────────────────────────────── */}

      {confirmEdit && (
        <ConfirmModal
          title="Confirmer la modification"
          message={`Bug #${confirmEdit.bugId}\n${confirmEdit.displayValue}`}
          confirmLabel="Enregistrer"
          loading={savingEdit}
          onConfirm={confirmSave}
          onCancel={() => setConfirmEdit(null)}
        />
      )}

      {confirmBulk && (
        <ConfirmModal
          title={`Modifier ${selectedIds.size} bug${selectedIds.size > 1 ? 's' : ''}`}
          message={`Champ : ${FIELD_LABELS[bulkField]}\nNouvelle valeur : "${bulkValue}"\n\nCette action modifiera ${selectedIds.size} bug${selectedIds.size > 1 ? 's' : ''} dans Azure DevOps.`}
          confirmLabel={`Appliquer à ${selectedIds.size} bug${selectedIds.size > 1 ? 's' : ''}`}
          loading={savingBulk}
          onConfirm={confirmBulkSave}
          onCancel={() => setConfirmBulk(false)}
        />
      )}
    </Layout>
  );
}
