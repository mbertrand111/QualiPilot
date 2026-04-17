import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Select } from '../components/Select';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Bug {
  id: number;
  title: string | null;
  state: string | null;
  priority: number | null;
  team: string | null;
  area_path: string | null;
  iteration_path: string | null;
  sprint: string | null;
  found_in: string | null;
  integration_build: string | null;
  version_souhaitee: string | null;
  resolved_reason: string | null;
  raison_origine: string | null;
  assigned_to: string | null;
  created_by: string | null;
  created_date: string | null;
  resolved_date: string | null;
  closed_date: string | null;
  sprint_done: string | null;
  changed_date: string | null;
  last_synced_at: string | null;
}

interface Violation {
  id: number;
  rule_code: string;
  rule_description: string;
  severity: 'error' | 'warning';
  detected_at: string;
}

interface AuditEntry {
  id: number;
  field: string;
  old_value: string | null;
  new_value: string | null;
  performed_at: string;
}

interface DirtyField {
  key: string;
  label: string;
  oldVal: string;
  newVal: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ADO_BASE    = 'https://dev.azure.com/Isagri-Prod-Progiciels/Isagri_Dev_GC_GestionCommerciale/_workitems/edit/';
const ADO_PROJECT = 'Isagri_Dev_GC_GestionCommerciale';
const REAL_TEAMS  = ['COCO', 'GO FAHST', 'JURASSIC BACK', 'MAGIC SYSTEM', 'MELI MELO', 'NULL.REF', 'PIXELS', 'LACE'];
const TEAM_AREA_SUFFIX: Record<string, string> = {
  'GO FAHST': 'GO_FAHST', 'MAGIC SYSTEM': 'MAGIC_SYSTEM', 'MELI MELO': 'MELI_MELO', 'NULL.REF': 'NULLREF',
};
const TEAM_AREA_SUFFIXES = new Set(REAL_TEAMS.map(t => TEAM_AREA_SUFFIX[t] ?? t));
const OBSOLETE_TEAMS     = new Set(['PIRATS', 'CORTEX']);

const EDITABLE_FIELDS = [
  { key: 'priority',          label: 'Priorité',             type: 'select'      as const, options: ['1', '2', '3', '4'] as const },
  { key: 'found_in',          label: 'Found In',             type: 'text'        as const },
  { key: 'integration_build', label: 'Integration Build',    type: 'text'        as const },
  { key: 'version_souhaitee', label: 'Version souhaitée GC', type: 'text'        as const },
  { key: 'resolved_reason',   label: 'Resolved Reason',      type: 'text'        as const },
  { key: 'raison_origine',    label: "Raison d'origine",     type: 'text'        as const },
  { key: 'area_path',         label: 'Zone',                 type: 'area_select'   as const },
  { key: 'iteration_path',   label: 'Iteration',            type: 'autocomplete'  as const },
  { key: 'sprint_done',      label: 'Sprint Done',          type: 'text'          as const },
] as const;

type EditableKey = typeof EDITABLE_FIELDS[number]['key'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function teamAreaPath(label: string): string {
  return `${ADO_PROJECT}\\${TEAM_AREA_SUFFIX[label] ?? label}`;
}
function isTeamAreaPath(path: string): boolean {
  const s = path.startsWith(ADO_PROJECT + '\\') ? path.slice(ADO_PROJECT.length + 1) : path;
  return TEAM_AREA_SUFFIXES.has(s);
}
function isObsoleteTeamAreaPath(path: string): boolean {
  const s = path.startsWith(ADO_PROJECT + '\\') ? path.slice(ADO_PROJECT.length + 1) : path;
  return OBSOLETE_TEAMS.has(s);
}
function areaPathLabel(path: string | null | undefined): string {
  if (!path) return '';
  const s = path.startsWith(ADO_PROJECT + '\\') ? path.slice(ADO_PROJECT.length + 1) : path;
  if (s === 'Bugs à corriger\\Versions LIVE')        return 'À corriger — Live';
  if (s === 'Bugs à corriger\\Versions historiques') return 'À corriger — OnPremise';
  if (s === 'Bugs à corriger\\Hors versions')        return 'À corriger — Hors version';
  return s;
}
function getOriginalValue(bug: Bug, key: EditableKey): string {
  if (key === 'priority') return bug.priority !== null ? String(bug.priority) : '';
  return (bug as unknown as Record<string, string | null>)[key] ?? '';
}
// Rend les messages d'erreur ADO lisibles en français
function humanizeAdoError(raw: string): string {
  return raw
    .replace(/Rule Error for field ([^.]+)\.\s*Error code:\s*Required,\s*InvalidEmpty\.?/gi,
      (_, field) => `Le champ "${field}" est requis et ne peut pas être vide.`)
    .replace(/Rule Error for field ([^.]+)\.\s*Error code:\s*([^.]+)\.?/gi,
      (_, field, code) => `Erreur sur le champ "${field}" (${code.trim()}).`);
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
}
function fmtDateShort(iso: string | null | undefined): string {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }); }
  catch { return iso; }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmptyVal() {
  return <span className="text-gray-300 font-normal italic">vide</span>;
}

function StateBadge({ state }: { state: string | null }) {
  if (!state) return null;
  const s: Record<string, string> = {
    New: 'bg-blue-100 text-blue-700', Active: 'bg-amber-100 text-amber-700',
    Resolved: 'bg-violet-100 text-violet-700', Closed: 'bg-gray-100 text-gray-500',
  };
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s[state] ?? 'bg-gray-100 text-gray-600'}`}>{state}</span>;
}

// Cellule lecture seule
function RoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-2.5 border-b border-gray-50 last:border-0">
      <div className="text-[11px] text-gray-400 font-medium mb-0.5">{label}</div>
      <div className="text-xs font-mono text-gray-600">{value || <EmptyVal />}</div>
    </div>
  );
}

// Cellule éditable (gère les deux états view/edit)
interface EditCellProps {
  label: string;
  fieldKey: EditableKey;
  editVal: string;
  origVal: string;
  editMode: boolean;
  focusMe: boolean;
  type: 'text' | 'select' | 'area_select' | 'autocomplete';
  options?: readonly string[];
  areaPaths: string[];
  suggestions?: string[];
  onClickField: (key: EditableKey) => void;
  onChange: (key: EditableKey, val: string) => void;
}

function EditCell({ label, fieldKey, editVal, origVal, editMode, focusMe, type, options, areaPaths, suggestions = [], onClickField, onChange }: EditCellProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const filteredSuggestions = suggestions
    .filter(s => s.toLowerCase().includes(editVal.toLowerCase()))
    .slice(0, 12);

  const isDirty    = editMode && editVal !== origVal;
  const displayVal = fieldKey === 'area_path' ? areaPathLabel(editVal) : editVal;

  if (!editMode) {
    return (
      <div
        role="button"
        tabIndex={0}
        className="group py-2.5 border-b border-gray-50 last:border-0 cursor-pointer"
        onClick={() => onClickField(fieldKey)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClickField(fieldKey); } }}
        title="Cliquer pour modifier"
      >
        <div className="text-[11px] text-gray-400 font-medium mb-0.5">{label}</div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono text-gray-700 group-hover:text-[#1E40AF] transition-colors">
            {editVal || <EmptyVal />}
          </span>
          <svg className="w-2.5 h-2.5 text-gray-300 group-hover:text-[#1E40AF] opacity-0 group-hover:opacity-100 transition-all shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="py-2.5 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[11px] text-gray-500 font-medium">{label}</span>
        {isDirty && <span className="text-[10px] font-semibold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">modifié</span>}
      </div>
      {type === 'select' ? (
        <Select
          value={editVal}
          onChange={e => onChange(fieldKey, e.target.value)}
          autoFocus={focusMe}
          tone={isDirty ? 'editing' : 'default'}
          uiSize="sm"
          className="w-full font-mono"
        >
          {options?.map(o => <option key={o} value={o}>{o}</option>)}
        </Select>
      ) : type === 'area_select' ? (
        <Select
          value={editVal}
          onChange={e => onChange(fieldKey, e.target.value)}
          autoFocus={focusMe}
          tone={isDirty ? 'editing' : 'default'}
          uiSize="sm"
          className="w-full"
        >
          <optgroup label="Équipes">
            {REAL_TEAMS.map(t => { const p = teamAreaPath(t); return <option key={p} value={p}>{t}</option>; })}
          </optgroup>
          <optgroup label="Zone">
            {areaPaths.filter(p => !isTeamAreaPath(p) && !isObsoleteTeamAreaPath(p)).map(p => (
              <option key={p} value={p}>{areaPathLabel(p)}</option>
            ))}
          </optgroup>
        </Select>
      ) : type === 'autocomplete' ? (
        <div className="relative">
          <input
            type="text"
            value={editVal}
            onChange={e => { onChange(fieldKey, e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            autoFocus={focusMe}
            placeholder={`${label}…`}
            className={`w-full text-xs border rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 font-mono transition-all
              ${isDirty ? 'border-amber-400 focus:ring-amber-200' : 'border-gray-200 focus:ring-[#1E40AF]/20 focus:border-[#1E40AF]/50'}`}
          />
          {showSuggestions && filteredSuggestions.length > 0 && (
            <ul className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
              {filteredSuggestions.map(s => (
                <li
                  key={s}
                  onMouseDown={() => { onChange(fieldKey, s); setShowSuggestions(false); }}
                  className="px-3 py-2 text-xs font-mono text-gray-700 cursor-pointer hover:bg-blue-50 hover:text-[#1E40AF] border-b border-gray-50 last:border-0"
                >
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <input
          type="text"
          value={editVal}
          onChange={e => onChange(fieldKey, e.target.value)}
          autoFocus={focusMe}
          placeholder={`${label}…`}
          className={`w-full text-xs border rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 font-mono transition-all
            ${isDirty ? 'border-amber-400 focus:ring-amber-200' : 'border-gray-200 focus:ring-[#1E40AF]/20 focus:border-[#1E40AF]/50'}`}
        />
      )}
      {isDirty && (
        <div className="flex items-center gap-1 mt-1">
          <span className="text-[10px] text-gray-400 font-mono line-through truncate max-w-[150px]">{origVal || '(vide)'}</span>
          <span className="text-[10px] text-gray-300">→</span>
          <span className="text-[10px] text-amber-700 font-mono font-semibold truncate max-w-[150px]">{displayVal || '(vide)'}</span>
        </div>
      )}
    </div>
  );
}

// Modal "modifications non sauvegardées" (remplace window.confirm)
interface UnsavedModalProps {
  dirtyCount: number;
  onKeep: () => void;
  onDiscard: () => void;
}
function UnsavedModal({ dirtyCount, onKeep, onDiscard }: UnsavedModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div role="button" aria-label="Annuler" tabIndex={0} className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onKeep} onKeyDown={(e) => { if (e.key === 'Escape') onKeep(); }} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-sm mx-4 p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-[#0e1a38]">Modifications non sauvegardées</h3>
            <p className="text-sm text-gray-500 mt-1">
              {dirtyCount} champ{dirtyCount > 1 ? 's ont' : ' a'} été modifié{dirtyCount > 1 ? 's' : ''} sans être enregistré{dirtyCount > 1 ? 's' : ''}.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onKeep}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Continuer les modifications
          </button>
          <button
            onClick={onDiscard}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
          >
            Abandonner
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConformityDetail() {
  const { bugId }      = useParams<{ bugId: string }>();
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();

  const backTo    = searchParams.get('from') === 'triage' ? '/triage' : '/conformity';
  const backLabel = backTo === '/triage' ? '← Retour aux bugs' : '← Retour aux anomalies';

  const [bug, setBug]               = useState<Bug | null>(null);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [audit, setAudit]           = useState<AuditEntry[]>([]);
  const [loadingBug, setLoadingBug] = useState(true);
  const [bugError, setBugError]     = useState<string | null>(null);
  const [areaPaths, setAreaPaths]     = useState<string[]>([]);
  const [iterations, setIterations]   = useState<string[]>([]);

  // ─── Edit state ───────────────────────────────────────────────────────────
  const [editMode, setEditMode]   = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [focusField, setFocusField] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = useState<string | null>(null);
  const [waivingRule, setWaivingRule] = useState<string | null>(null);
  const [waiveError, setWaiveError]   = useState<string | null>(null);

  // Unsaved changes guard
  const [unsavedModal, setUnsavedModal]   = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // ─── Chargement ───────────────────────────────────────────────────────────

  const reload = useCallback(async (silent = false) => {
    if (!bugId) return;
    const id = parseInt(bugId, 10);
    if (isNaN(id)) return;
    try {
      const [bugData, violData, auditData] = await Promise.all([
        fetch(`/api/bugs/${id}`).then(r => r.json()),
        fetch(`/api/conformity/violations?bug_id=${id}&limit=50`).then(r => r.json()),
        fetch(`/api/bugs/${id}/audit`).then(r => r.json()),
      ]);
      if (bugData.error) { if (!silent) setBugError(bugData.error); return; }
      setBug(bugData as Bug);
      setViolations((violData.violations ?? []) as Violation[]);
      setAudit((Array.isArray(auditData) ? auditData : []) as AuditEntry[]);
    } catch (e) {
      if (!silent) setBugError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      if (!silent) setLoadingBug(false);
    }
  }, [bugId]);

  useEffect(() => {
    setLoadingBug(true);
    reload();
    fetch('/api/bugs/meta/areas').then(r => r.json()).then(setAreaPaths).catch((err: unknown) => { console.error('meta/areas', err); });
    fetch('/api/bugs/meta/iterations').then(r => r.json()).then(setIterations).catch((err: unknown) => { console.error('meta/iterations', err); });
  }, [reload]);

  useEffect(() => {
    if (!bug) return;
    const init: Record<string, string> = {};
    for (const f of EDITABLE_FIELDS) init[f.key] = getOriginalValue(bug, f.key);
    setEditValues(init);
    setEditMode(false);
    setFocusField(null);
  }, [bug]);

  useEffect(() => {
    const dirty = bug ? EDITABLE_FIELDS.some(f => editValues[f.key] !== getOriginalValue(bug, f.key)) : false;
    if (!editMode || !dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [editMode, editValues, bug]);

  // ─── Dirty detection ──────────────────────────────────────────────────────

  const dirtyFields = useMemo((): DirtyField[] => {
    if (!bug) return [];
    return EDITABLE_FIELDS
      .filter(f => editValues[f.key] !== undefined && editValues[f.key] !== getOriginalValue(bug, f.key))
      .map(f => ({ key: f.key, label: f.label, oldVal: getOriginalValue(bug, f.key), newVal: editValues[f.key] ?? '' }));
  }, [bug, editValues]);

  // ─── Edit actions ─────────────────────────────────────────────────────────

  function guard(action: () => void) {
    if (editMode && dirtyFields.length > 0) {
      setPendingAction(() => action);
      setUnsavedModal(true);
    } else {
      action();
    }
  }

  function clickField(key: EditableKey) {
    setFocusField(key);
    setEditMode(true);
  }

  function doCancel() {
    if (!bug) return;
    const reset: Record<string, string> = {};
    for (const f of EDITABLE_FIELDS) reset[f.key] = getOriginalValue(bug, f.key);
    setEditValues(reset);
    setEditMode(false);
    setFocusField(null);
    setSaveError(null);
  }

  function cancelEdit() { guard(doCancel); }
  function handleBack() { guard(() => navigate(backTo)); }

  async function handleSaveAll() {
    if (!bug || dirtyFields.length === 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      // sprint_done doit être sauvegardé en premier : ADO le valide lors de toute écriture sur un bug Closed
      const ordered = [...dirtyFields].sort((a, b) =>
        a.key === 'sprint_done' ? -1 : b.key === 'sprint_done' ? 1 : 0
      );
      for (const d of ordered) {
        const value = d.key === 'priority' ? parseInt(d.newVal, 10) : d.newVal;
        const res  = await fetch(`/api/bugs/${bug.id}/fields`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field: d.key, value }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(humanizeAdoError(data.error ?? `Erreur ${res.status}`));
      }
      setShowConfirm(false);
      await reload(true);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Erreur inconnue');
      setShowConfirm(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleWaiveViolation(ruleCode: string) {
    if (!bug) return;
    setWaiveError(null);
    setWaivingRule(ruleCode);
    try {
      const res = await fetch('/api/conformity/waivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bug_id: bug.id, rule_code: ruleCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Erreur ${res.status}`);
      await reload(true);
    } catch (e) {
      setWaiveError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setWaivingRule(null);
    }
  }

  function getEditVal(key: EditableKey): string {
    return editValues[key] ?? (bug ? getOriginalValue(bug, key) : '');
  }

  // ─── Rendu ────────────────────────────────────────────────────────────────

  if (loadingBug) {
    return (
      <Layout title={`Bug #${bugId}`} actions={<button onClick={handleBack} className="text-sm text-gray-500 hover:text-gray-700 font-medium">{backLabel}</button>}>
        <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Chargement…</div>
      </Layout>
    );
  }
  if (bugError || !bug) {
    return (
      <Layout title={`Bug #${bugId}`} actions={<button onClick={handleBack} className="text-sm text-gray-500 hover:text-gray-700 font-medium">{backLabel}</button>}>
        <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-4 text-sm text-red-600">{bugError ?? 'Bug introuvable'}</div>
      </Layout>
    );
  }

  return (
    <Layout
      title={`Bug #${bug.id}`}
      actions={<button onClick={handleBack} className="text-sm text-gray-500 hover:text-gray-700 font-medium">{backLabel}</button>}
    >
      {saveError && (
        <div className="mb-4 bg-red-50 border border-red-100 rounded-2xl px-5 py-3 text-sm text-red-600 flex items-center justify-between">
          <span>Erreur : {saveError}</span>
          <button onClick={() => setSaveError(null)} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
        </div>
      )}

      {waiveError && (
        <div className="mb-4 bg-red-50 border border-red-100 rounded-2xl px-5 py-3 text-sm text-red-600 flex items-center justify-between">
          <span>Erreur acceptation anomalie : {waiveError}</span>
          <button onClick={() => setWaiveError(null)} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-5">

        {/* ── Colonne principale ── */}
        <div className="col-span-2 space-y-5">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">

            {/* En-tête : ID, titre, badges + hint */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-1">
                <a
                  href={`${ADO_BASE}${bug.id}`}
                  target="_blank" rel="noopener noreferrer"
                  className="font-mono text-xs font-semibold text-[#1E40AF] hover:underline"
                  title="Ouvrir dans Azure DevOps"
                >
                  #{bug.id} ↗
                </a>
              </div>
              <h2 className="text-[17px] font-bold text-[#0e1a38] mb-3">{bug.title ?? ''}</h2>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center flex-wrap gap-2">
                  <StateBadge state={bug.state} />
                  {bug.priority !== null && (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${bug.priority !== 2 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      Priorité {bug.priority}
                    </span>
                  )}
                  {bug.team && (
                    <span className="text-xs font-mono font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">{bug.team}</span>
                  )}
                  {bug.sprint && (
                    <span className="text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">{bug.sprint}</span>
                  )}
                </div>
                {!editMode && (
                  <span className="text-[11px] text-gray-400 shrink-0">Cliquer sur un champ pour modifier</span>
                )}
                {editMode && (
                  <span className="text-[11px] font-semibold text-amber-600 shrink-0">● Mode édition</span>
                )}
              </div>
            </div>

            {/* Grille unifiée de tous les champs */}
            <div className={`grid grid-cols-2 gap-x-10 rounded-xl transition-all ${editMode ? 'bg-amber-50/30 border border-amber-100 p-4 -mx-1' : ''}`}>

              {/* Rows 1-3 : 6 champs éditables */}
              {(['priority', 'found_in', 'integration_build', 'version_souhaitee', 'resolved_reason', 'raison_origine'] as const).map(key => {
                const f = EDITABLE_FIELDS.find(x => x.key === key)!;
                return (
                  <EditCell
                    key={key}
                    label={f.label}
                    fieldKey={key}
                    editVal={getEditVal(key)}
                    origVal={getOriginalValue(bug, key)}
                    editMode={editMode}
                    focusMe={focusField === key}
                    type={f.type}
                    options={'options' in f ? f.options : undefined}
                    areaPaths={areaPaths}
                    onClickField={clickField}
                    onChange={(k, val) => setEditValues(prev => ({ ...prev, [k]: val }))}
                  />
                );
              })}

              {/* Row 4 : Assigned To (lecture seule) + Créé par (lecture seule) */}
              <RoCell label="Assigned To" value={bug.assigned_to ?? ''} />
              <RoCell label="Créé par"    value={bug.created_by ?? ''} />

              {/* Row 5 : Créé le + Modifié le */}
              <RoCell label="Créé le"    value={fmtDateShort(bug.created_date)}  />
              <RoCell label="Modifié le" value={fmtDateShort(bug.changed_date)}  />

              {/* Row 6 : Résolu le + Fermé le */}
              <RoCell label="Résolu le" value={fmtDateShort(bug.resolved_date)} />
              <RoCell label="Fermé le"  value={fmtDateShort(bug.closed_date)}   />

              {/* Row 7 : Synchronisé le + Sprint Done (éditable) */}
              <RoCell label="Synchronisé le" value={fmtDateShort(bug.last_synced_at)} />
              <EditCell
                label="Sprint Done"
                fieldKey="sprint_done"
                editVal={getEditVal('sprint_done')}
                origVal={getOriginalValue(bug, 'sprint_done')}
                editMode={editMode}
                focusMe={focusField === 'sprint_done'}
                type="text"
                areaPaths={areaPaths}
                onClickField={clickField}
                onChange={(k, val) => setEditValues(prev => ({ ...prev, [k]: val }))}
              />

              {/* Row 8 : Zone (éditable) + Iteration (éditable avec autocomplétion) */}
              <EditCell
                label="Zone"
                fieldKey="area_path"
                editVal={getEditVal('area_path')}
                origVal={getOriginalValue(bug, 'area_path')}
                editMode={editMode}
                focusMe={focusField === 'area_path'}
                type="area_select"
                areaPaths={areaPaths}
                onClickField={clickField}
                onChange={(k, val) => setEditValues(prev => ({ ...prev, [k]: val }))}
              />
              <EditCell
                label="Iteration"
                fieldKey="iteration_path"
                editVal={getEditVal('iteration_path')}
                origVal={getOriginalValue(bug, 'iteration_path')}
                editMode={editMode}
                focusMe={focusField === 'iteration_path'}
                type="autocomplete"
                areaPaths={areaPaths}
                suggestions={iterations}
                onClickField={clickField}
                onChange={(k, val) => setEditValues(prev => ({ ...prev, [k]: val }))}
              />
            </div>

            {/* Barre d'action mode édition */}
            {editMode && (
              <div className="mt-4 pt-4 border-t border-amber-200 flex items-center justify-between gap-4">
                <span className="text-xs text-amber-700 font-medium">
                  {dirtyFields.length > 0
                    ? `${dirtyFields.length} modification${dirtyFields.length > 1 ? 's' : ''} en attente`
                    : 'Aucune modification pour l\'instant'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={cancelEdit}
                    disabled={saving}
                    className="px-3.5 py-1.5 rounded-lg text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  {dirtyFields.length > 0 && (
                    <button
                      onClick={() => setShowConfirm(true)}
                      disabled={saving}
                      className="px-3.5 py-1.5 rounded-lg text-sm font-semibold bg-amber-400 text-amber-900 hover:bg-amber-300 transition-colors disabled:opacity-50 disabled:cursor-wait"
                    >
                      {saving ? 'Enregistrement…' : `Appliquer (${dirtyFields.length})`}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Historique des modifications */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-bold text-gray-700 mb-4">Historique des modifications</h3>
            {audit.length === 0 ? (
              <p className="text-xs text-gray-400">Aucune modification effectuée via QualiPilot.</p>
            ) : (
              <div className="space-y-2">
                {audit.map(a => (
                  <div key={a.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2.5 text-xs border border-gray-100 flex-wrap">
                    <span className="font-mono text-gray-400 shrink-0">{fmtDate(a.performed_at)}</span>
                    <span className="text-gray-200">·</span>
                    <span className="font-semibold text-gray-700 shrink-0">{a.field}</span>
                    <span className="text-gray-200">·</span>
                    <span className="font-mono line-through text-red-400">{a.old_value ?? '(vide)'}</span>
                    <span className="text-gray-400">→</span>
                    <span className="font-mono text-green-600 font-semibold">{a.new_value ?? '(vide)'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Colonne anomalies ── */}
        <div>
          <div className={`bg-white rounded-2xl shadow-sm border p-6 sticky top-0 ${violations.length > 0 ? 'border-red-100' : 'border-gray-100'}`}>
            <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${violations.length > 0 ? 'text-red-700' : 'text-green-700'}`}>
              <span className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-xs font-bold shrink-0 ${violations.length > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                {violations.length > 0 ? violations.length : '✓'}
              </span>
              {violations.length > 0
                ? `${violations.length} anomalie${violations.length > 1 ? 's' : ''} détectée${violations.length > 1 ? 's' : ''}`
                : 'Aucune anomalie active'}
            </h3>
            {violations.length > 0 && (
              <div className="space-y-3">
                {violations.map(v => (
                  <div key={v.id} className="bg-red-50 border border-red-100 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-1.5 gap-2">
                      <span className="text-xs font-mono font-semibold text-red-800">{v.rule_code}</span>
                      <div className="flex items-center gap-2">
                        <span className={['text-[11px] font-semibold px-2.5 py-0.5 rounded-full', v.severity === 'error' ? 'bg-red-200 text-red-900' : 'bg-amber-200 text-amber-900'].join(' ')}>
                          {v.severity === 'error' ? 'Erreur' : 'Alerte'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleWaiveViolation(v.rule_code)}
                          disabled={waivingRule === v.rule_code}
                          className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-red-200 bg-white text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-wait"
                          title="Accepter cette anomalie : elle ne remontera plus aux prochaines synchronisations"
                        >
                          {waivingRule === v.rule_code ? 'Acceptation…' : 'Accepter'}
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-red-700">{v.rule_description}</p>
                    <p className="text-[11px] text-gray-400 font-mono mt-1.5">{fmtDateShort(v.detected_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal confirmation multi-champs ── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div role="button" aria-label="Annuler" tabIndex={0} className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => !saving && setShowConfirm(false)} onKeyDown={(e) => { if (e.key === 'Escape' && !saving) setShowConfirm(false); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg mx-4 p-6">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-[#0e1a38]">Confirmer les modifications</h3>
                <p className="text-sm text-gray-500 mt-1">Ces changements seront écrits dans Azure DevOps et tracés dans l'historique.</p>
              </div>
            </div>
            <div className="space-y-2 mb-5">
              {dirtyFields.map(d => (
                <div key={d.key} className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                  <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">{d.label}</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs line-through text-red-400 bg-red-50 px-2 py-0.5 rounded">
                      {d.key === 'area_path' ? areaPathLabel(d.oldVal) || '(vide)' : d.oldVal || '(vide)'}
                    </span>
                    <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                    <span className="font-mono text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded">
                      {d.key === 'area_path' ? areaPathLabel(d.newVal) || '(vide)' : d.newVal || '(vide)'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowConfirm(false)} disabled={saving} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-50">
                Annuler
              </button>
              <button onClick={handleSaveAll} disabled={saving} className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#1E40AF] hover:bg-[#0F3E8A] disabled:opacity-50 disabled:cursor-wait">
                {saving ? 'Enregistrement…' : 'Confirmer dans Azure DevOps'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal modifications non sauvegardées ── */}
      {unsavedModal && (
        <UnsavedModal
          dirtyCount={dirtyFields.length}
          onKeep={() => setUnsavedModal(false)}
          onDiscard={() => {
            setUnsavedModal(false);
            pendingAction?.();
            setPendingAction(null);
          }}
        />
      )}
    </Layout>
  );
}
