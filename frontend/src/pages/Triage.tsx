import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { MultiSelect } from '../components/MultiSelect';
import { ConfirmModal } from '../components/ConfirmModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Bug {
  id: number;
  title: string;
  state: string;
  priority: number | null;
  team: string | null;
  sprint: string | null;
  found_in: string | null;
  integration_build: string | null;
  version_souhaitee: string | null;
  assigned_to: string | null;
  created_date: string | null;
  changed_date: string | null;
}

interface TriageStats {
  prioritiser: number;
  corriger_live: number;
  corriger_onpremise: number;
  corriger_hors_version: number;
  corriger_sans_zone: number;
  old_6months: number;
}

type ActiveCard = 'prioritiser' | 'corriger_live' | 'corriger_onpremise' | 'corriger_hors_version' | 'old_6months' | null;
type SortDir = 'asc' | 'desc';
type WritableField = 'priority' | 'version_souhaitee' | 'integration_build' | 'area_path';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATE_STYLES: Record<string, string> = {
  'New':      'bg-blue-50 text-blue-700 border border-blue-200',
  'Active':   'bg-amber-50 text-amber-700 border border-amber-200',
  'Resolved': 'bg-violet-50 text-violet-700 border border-violet-200',
  'Closed':   'bg-gray-100 text-gray-500 border border-gray-200',
};

const FIELD_LABELS: Record<WritableField, string> = {
  priority:          'Priorité',
  version_souhaitee: 'Version souhaitée',
  integration_build: 'Build',
  area_path:         'Zone',
};

const BUG_TYPE_LABELS: Record<string, string> = {
  live:          'Live',
  onpremise:     'OnPremise',
  hors_version:  'Hors version',
  uncategorized: 'Non catégorisés',
};

const ADO_PROJECT = 'Isagri_Dev_GC_GestionCommerciale';

function areaPathLabel(path: string): string {
  const suffix = path.startsWith(ADO_PROJECT + '\\') ? path.slice(ADO_PROJECT.length + 1) : path;
  if (suffix === 'Bugs à corriger\\Versions LIVE')        return 'À corriger — Live';
  if (suffix === 'Bugs à corriger\\Versions historiques') return 'À corriger — OnPremise';
  if (suffix === 'Bugs à corriger\\Hors versions')        return 'À corriger — Hors version';
  return suffix;
}

function StateBadge({ state }: { state: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${STATE_STYLES[state] ?? 'bg-gray-100 text-gray-600'}`}>
      {state}
    </span>
  );
}

function dateShort(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return (
    <svg className="w-3 h-3 text-gray-300 ml-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4M16 15l-4 4-4-4" />
    </svg>
  );
  return dir === 'asc'
    ? <svg className="w-3 h-3 text-[#1E63B6] ml-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>
    : <svg className="w-3 h-3 text-[#1E63B6] ml-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>;
}

function Th({ col, label, sort, dir, onSort, className = '' }: { col: string; label: string; sort: string; dir: SortDir; onSort: (c: string) => void; className?: string }) {
  const active = sort === col;
  return (
    <th onClick={() => onSort(col)} className={`text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide cursor-pointer select-none whitespace-nowrap ${active ? 'text-[#1E63B6]' : 'text-gray-400 hover:text-gray-600'} ${className}`}>
      <span className="flex items-center">{label}<SortIcon active={active} dir={dir} /></span>
    </th>
  );
}

// ─── Card config ──────────────────────────────────────────────────────────────

const CARDS: { key: ActiveCard; label: string; color: string; borderColor: string; textColor: string; hoverBg: string }[] = [
  { key: 'prioritiser',           label: 'Bugs à prioriser',          color: 'text-amber-700',  borderColor: 'border-amber-100',  textColor: 'text-amber-500',  hoverBg: 'hover:bg-amber-50' },
  { key: 'corriger_live',         label: 'À corriger — Live',         color: 'text-green-700',  borderColor: 'border-green-100',  textColor: 'text-green-500',  hoverBg: 'hover:bg-green-50' },
  { key: 'corriger_onpremise',    label: 'À corriger — OnPremise',    color: 'text-violet-700', borderColor: 'border-violet-100', textColor: 'text-violet-500', hoverBg: 'hover:bg-violet-50' },
  { key: 'corriger_hors_version', label: 'À corriger — Hors version', color: 'text-gray-700',   borderColor: 'border-gray-200',   textColor: 'text-gray-400',   hoverBg: 'hover:bg-gray-50' },
  { key: 'old_6months',           label: 'Ouverts depuis +6 mois',    color: 'text-red-700',    borderColor: 'border-red-100',    textColor: 'text-red-500',    hoverBg: 'hover:bg-red-50' },
];

const ALL_STATES = ['New', 'Active', 'Resolved', 'Closed'];
const DEFAULT_STATES = ['New', 'Active'];
const LIMIT = 50;

// Les 8 équipes réelles (hors zones ADO)
const REAL_TEAMS = ['COCO', 'GO FAHST', 'JURASSIC BACK', 'MAGIC SYSTEM', 'MELI MELO', 'NULL.REF', 'PIXELS', 'LACE'];

// Zones ADO (valeurs stockées dans la colonne team)
const ZONE_TEAM_OPTIONS = [
  'Bugs à prioriser',
  'Bugs à corriger LIVE',
  'Bugs à corriger OnPremise',
  'Bugs à corriger Hors versions',
  'Bugs à corriger',
];
const ZONE_TEAM_LABELS: Record<string, string> = {
  'Bugs à prioriser':              'Bugs à prioriser',
  'Bugs à corriger LIVE':          'À corriger — Live',
  'Bugs à corriger OnPremise':     'À corriger — OnPremise',
  'Bugs à corriger Hors versions': 'À corriger — Hors version',
  'Bugs à corriger':               'À corriger (sans zone)',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Triage() {
  const [searchParams] = useSearchParams();

  const [triageStats, setTriageStats] = useState<TriageStats | null>(null);
  const [activeCard, setActiveCard]   = useState<ActiveCard>(null);

  const [bugs, setBugs]       = useState<Bug[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // Méta
  const [sprints, setSprints] = useState<string[]>([]);
  const [areaPaths, setAreaPaths] = useState<string[]>([]);

  // Filtres — initialisés depuis l'URL si présents (navigation depuis le tableau de bord)
  const [filterTeams,    setFilterTeams]    = useState<string[]>([]);
  const [filterZones,    setFilterZones]    = useState<string[]>([]);
  const [filterStates,   setFilterStates]   = useState<string[]>(() => {
    const s = searchParams.get('state');
    return s ? s.split(',').filter(Boolean) : DEFAULT_STATES;
  });
  const [filterSprints,  setFilterSprints]  = useState<string[]>([]);
  const [filterBugTypes, setFilterBugTypes] = useState<string[]>(() => {
    const bt = searchParams.get('bug_type');
    const valid = ['live', 'onpremise', 'hors_version', 'uncategorized'];
    return bt ? bt.split(',').filter(v => valid.includes(v)) : [];
  });
  const [filterTitle,    setFilterTitle]    = useState('');
  const [filterVersion,  setFilterVersion]  = useState('');
  const [filterFoundIn,  setFilterFoundIn]  = useState('');
  const [filterBuild,    setFilterBuild]    = useState('');

  // Tri
  const [sort, setSort] = useState('changed_date');
  const [dir,  setDir]  = useState<SortDir>('desc');

  // Sync
  const [syncing,    setSyncing]    = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number } | null>(null);
  const [syncError,  setSyncError]  = useState<string | null>(null);

  // Sélection multiple
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Bulk action
  const [bulkField, setBulkField]     = useState<WritableField>('priority');
  const [bulkValue, setBulkValue]     = useState('2');
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [savingBulk, setSavingBulk]   = useState(false);
  const [bulkError, setBulkError]     = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filterStates.length)   params.set('state',    filterStates.join(','));
    if (filterSprints.length)  params.set('sprint',   filterSprints.join(','));
    if (filterBugTypes.length) params.set('bug_type', filterBugTypes.join(','));
    if (filterTitle)    params.set('title',    filterTitle);
    if (filterVersion)  params.set('version',  filterVersion);
    if (filterFoundIn)  params.set('found_in', filterFoundIn);
    if (filterBuild)    params.set('build',    filterBuild);
    fetch(`/api/stats/triage?${params}`).then(r => r.json()).then(setTriageStats).catch(() => {});
  }, [filterStates, filterSprints, filterBugTypes, filterTitle, filterVersion, filterFoundIn, filterBuild]);

  useEffect(() => {
    fetch('/api/bugs/meta/sprints').then(r => r.json()).then(setSprints).catch(() => {});
    fetch('/api/bugs/meta/areas').then(r => r.json()).then(setAreaPaths).catch(() => {});
  }, []);

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

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT), sort, dir });

      // Équipes et zones : combinés dans le param team
      const teamValues: string[] = [];
      if (filterTeams.length > 0) teamValues.push(...filterTeams);
      if (filterZones.length > 0) teamValues.push(...filterZones);

      if (teamValues.length > 0) {
        params.set('team', teamValues.join(','));
      } else if (activeCard === 'prioritiser') {
        params.set('team', 'Bugs à prioriser');
      } else if (activeCard === 'corriger_live') {
        params.set('team', 'Bugs à corriger LIVE');
      } else if (activeCard === 'corriger_onpremise') {
        params.set('team', 'Bugs à corriger OnPremise');
      } else if (activeCard === 'corriger_hors_version') {
        params.set('team', 'Bugs à corriger Hors versions');
      } else if (activeCard === 'old_6months') {
        params.set('old_months', '6');
      }
      // Pas de filtre : on affiche tous les bugs

      if (activeCard !== 'old_6months' && filterStates.length > 0) {
        params.set('state', filterStates.join(','));
      }

      if (filterSprints.length)  params.set('sprint',    filterSprints.join(','));
      if (filterBugTypes.length) params.set('bug_type',  filterBugTypes.join(','));
      if (filterTitle)    params.set('title',    filterTitle);
      if (filterVersion)  params.set('version',  filterVersion);
      if (filterFoundIn)  params.set('found_in', filterFoundIn);
      if (filterBuild)    params.set('build',    filterBuild);

      const res = await fetch(`/api/bugs?${params}`);
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const data = await res.json();
      setBugs(data.bugs);
      setTotal(data.total);
      setPage(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [activeCard, filterTeams, filterZones, filterStates, filterSprints, filterBugTypes, filterTitle, filterVersion, filterFoundIn, filterBuild, sort, dir]);

  useEffect(() => { load(1); }, [load]);

  useEffect(() => {
    if (bugs.length > 0) {
      const pageIds = new Set(bugs.map(b => b.id));
      setSelectedIds(prev => new Set([...prev].filter(id => pageIds.has(id))));
    }
  }, [bugs]);

  function handleSort(col: string) {
    if (sort === col) setDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSort(col); setDir('asc'); }
  }

  function handleCardClick(key: ActiveCard) {
    setActiveCard(prev => prev === key ? null : key);
  }

  function resetFilters() {
    setFilterTeams([]); setFilterZones([]); setFilterStates(DEFAULT_STATES); setFilterSprints([]); setFilterBugTypes([]);
    setFilterTitle(''); setFilterVersion(''); setFilterFoundIn(''); setFilterBuild('');
  }

  // ─── Sélection ──────────────────────────────────────────────────────────────

  const allPageIds   = bugs.map(b => b.id);
  const allSelected  = allPageIds.length > 0 && allPageIds.every(id => selectedIds.has(id));
  const someSelected = allPageIds.some(id => selectedIds.has(id));

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(prev => { const s = new Set(prev); allPageIds.forEach(id => s.delete(id)); return s; });
    } else {
      setSelectedIds(prev => new Set([...prev, ...allPageIds]));
    }
  }

  function toggleOne(id: number) {
    setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  // ─── Bulk action ────────────────────────────────────────────────────────────

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
      if (data.failed?.length > 0) {
        setBulkError(`${data.failed.length} bug(s) n'ont pas pu être mis à jour : ${data.failed[0].error}`);
      }
      setConfirmBulk(false);
      if (data.updated > 0) {
        setSelectedIds(new Set());
        load(page);
      }
    } catch (e) {
      setBulkError(e instanceof Error ? e.message : 'Erreur inconnue');
      setConfirmBulk(false);
    } finally {
      setSavingBulk(false);
    }
  }

  // ─── Dérivés ────────────────────────────────────────────────────────────────

  const statesChanged = filterStates.length !== DEFAULT_STATES.length || filterStates.some(s => !DEFAULT_STATES.includes(s));
  const hasFilters = filterTeams.length || filterZones.length || statesChanged || filterSprints.length || filterBugTypes.length || filterTitle || filterVersion || filterFoundIn || filterBuild;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <Layout title="Bugs à trier" actions={
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-400 font-mono">{total.toLocaleString('fr-FR')} bugs</span>
        <button
          onClick={handleSync}
          disabled={syncing}
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
      </div>
    }>

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
      {bulkError && (
        <div className="mb-4 bg-red-50 border border-red-100 rounded-2xl px-5 py-3 text-sm text-red-600 flex items-center justify-between">
          <span>Erreur lors de la mise à jour groupée : {bulkError}</span>
          <button onClick={() => setBulkError(null)} className="ml-2 text-red-400 hover:text-red-600">×</button>
        </div>
      )}

      {/* Cards récap */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {CARDS.map(card => {
          const count = triageStats
            ? card.key === 'prioritiser'           ? triageStats.prioritiser
            : card.key === 'corriger_live'          ? triageStats.corriger_live
            : card.key === 'corriger_onpremise'     ? triageStats.corriger_onpremise
            : card.key === 'corriger_hors_version'  ? triageStats.corriger_hors_version
            : triageStats.old_6months
            : null;
          const isActive = activeCard === card.key;
          return (
            <button
              key={card.key}
              onClick={() => handleCardClick(card.key)}
              className={`text-left w-full rounded-2xl p-5 shadow-sm border transition-all hover:shadow-md ${
                isActive ? 'bg-[#1E63B6] border-[#1E63B6]' : `bg-white ${card.borderColor} ${card.hoverBg}`
              }`}
            >
              <div className={`text-[11px] font-semibold uppercase tracking-wider mb-3 ${isActive ? 'text-white/70' : card.textColor}`}>
                {card.label}
              </div>
              <div className={`text-4xl font-mono font-bold tracking-tight ${isActive ? 'text-white' : card.color}`}>
                {count ?? '…'}
              </div>
              {isActive && <div className="text-[11px] text-white/60 mt-2">Cliquer pour tout afficher</div>}
            </button>
          );
        })}
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <MultiSelect label="Équipes" options={REAL_TEAMS} selected={filterTeams} onChange={setFilterTeams} />
          <MultiSelect
            label="Zone"
            options={ZONE_TEAM_OPTIONS}
            selected={filterZones}
            onChange={setFilterZones}
            renderOption={opt => <span>{ZONE_TEAM_LABELS[opt] ?? opt}</span>}
          />
          <MultiSelect
            label="États"
            options={ALL_STATES}
            selected={filterStates}
            onChange={setFilterStates}
            renderOption={opt => (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${STATE_STYLES[opt] ?? 'bg-gray-100 text-gray-600'}`}>
                {opt}
              </span>
            )}
          />
          <MultiSelect label="Sprints" options={sprints} selected={filterSprints} onChange={setFilterSprints} />
          <MultiSelect
            label="Type"
            options={['live', 'onpremise', 'hors_version', 'uncategorized']}
            selected={filterBugTypes}
            onChange={setFilterBugTypes}
            renderOption={opt => <span>{BUG_TYPE_LABELS[opt] ?? opt}</span>}
          />
          {hasFilters && (
            <button onClick={resetFilters} className="text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2 ml-1">
              Tout réinitialiser
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          {([
            { label: 'Titre contient',             value: filterTitle,   set: setFilterTitle },
            { label: 'Version souhaitée contient', value: filterVersion, set: setFilterVersion },
            { label: 'Trouvé dans contient',       value: filterFoundIn, set: setFilterFoundIn },
            { label: 'Build contient',             value: filterBuild,   set: setFilterBuild },
          ] as const).map(({ label, value, set }) => (
            <div key={label} className="relative">
              <input
                type="text"
                placeholder={label}
                value={value}
                onChange={e => set(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg pl-3 pr-7 py-2 bg-white text-[#2B2B2B] placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#66D2DB]/40 w-52"
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
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">
            {filterTeams.length > 0
              ? filterTeams.join(', ')
              : activeCard ? CARDS.find(c => c.key === activeCard)?.label : 'Tous les bugs à trier'}
          </span>
          <span className="text-[12px] text-gray-400 font-mono">{total.toLocaleString('fr-FR')} bug{total !== 1 ? 's' : ''}</span>
        </div>

        {error && <div className="p-6 text-center text-red-600 text-sm">{error}</div>}

        {!error && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="px-4 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                      onChange={toggleAll}
                      className="rounded border-gray-300 text-[#1E63B6] focus:ring-[#1E63B6]/30 cursor-pointer"
                    />
                  </th>
                  <Th col="id"                label="ID"                sort={sort} dir={dir} onSort={handleSort} />
                  <Th col="title"             label="Titre"             sort={sort} dir={dir} onSort={handleSort} className="min-w-[200px]" />
                  <Th col="state"             label="État"              sort={sort} dir={dir} onSort={handleSort} />
                  <Th col="team"              label="Zone"              sort={sort} dir={dir} onSort={handleSort} />
                  <Th col="priority"          label="Prio"              sort={sort} dir={dir} onSort={handleSort} />
                  <Th col="found_in"          label="Trouvé dans"       sort={sort} dir={dir} onSort={handleSort} />
                  <Th col="version_souhaitee" label="Version souhaitée" sort={sort} dir={dir} onSort={handleSort} />
                  <Th col="integration_build" label="Build"             sort={sort} dir={dir} onSort={handleSort} />
                  <Th col="created_date"      label="Créé le"           sort={sort} dir={dir} onSort={handleSort} />
                  <Th col="changed_date"      label="Modifié"           sort={sort} dir={dir} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={11} className="px-4 py-10 text-center text-gray-400 text-sm">Chargement…</td></tr>
                )}
                {!loading && bugs.length === 0 && (
                  <tr><td colSpan={11} className="px-4 py-10 text-center text-gray-400 text-sm">Aucun bug trouvé</td></tr>
                )}
                {!loading && bugs.map(bug => {
                  const isSelected = selectedIds.has(bug.id);
                  return (
                    <tr key={bug.id} className={`border-b border-gray-50 transition-colors ${isSelected ? 'bg-blue-50/50' : 'hover:bg-[#66D2DB]/5'}`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(bug.id)}
                          className="rounded border-gray-300 text-[#1E63B6] focus:ring-[#1E63B6]/30 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-[12px] text-[#1E63B6] font-semibold whitespace-nowrap">
                        <a href={`https://dev.azure.com/Isagri-Prod-Progiciels/Isagri_Dev_GC_GestionCommerciale/_workitems/edit/${bug.id}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          #{bug.id}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-[#2B2B2B] max-w-[300px]">
                        <span className="line-clamp-2 leading-snug" title={bug.title}>{bug.title}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap"><StateBadge state={bug.state} /></td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-[12px]">{bug.team ?? ''}</td>
                      <td className="px-4 py-3 font-mono text-[12px] text-gray-700 whitespace-nowrap text-center">{bug.priority ?? ''}</td>
                      <td className="px-4 py-3 font-mono text-[12px] text-gray-500 whitespace-nowrap">{bug.found_in ?? ''}</td>
                      <td className="px-4 py-3 font-mono text-[12px] text-gray-700 whitespace-nowrap">{bug.version_souhaitee ?? ''}</td>
                      <td className="px-4 py-3 font-mono text-[12px] text-gray-500 whitespace-nowrap">{bug.integration_build ?? ''}</td>
                      <td className="px-4 py-3 text-[12px] text-gray-400 whitespace-nowrap">{dateShort(bug.created_date)}</td>
                      <td className="px-4 py-3 text-[12px] text-gray-400 whitespace-nowrap">{dateShort(bug.changed_date)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && !loading && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[12px] text-gray-400">Page {page} / {totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => load(page - 1)} className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-30 hover:bg-gray-50">← Précédent</button>
              <button disabled={page >= totalPages} onClick={() => load(page + 1)} className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-30 hover:bg-gray-50">Suivant →</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Barre bulk action ─────────────────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#0e1a38] text-white rounded-2xl shadow-2xl border border-white/10 px-5 py-3.5 flex items-center gap-4 min-w-[560px] max-w-2xl">
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-6 h-6 rounded-full bg-[#1E63B6] text-[11px] font-bold flex items-center justify-center">
              {selectedIds.size}
            </span>
            <span className="text-sm font-semibold">bug{selectedIds.size > 1 ? 's' : ''} sélectionné{selectedIds.size > 1 ? 's' : ''}</span>
          </div>

          <div className="w-px h-6 bg-white/15 shrink-0" />

          <select
            value={bulkField}
            onChange={e => {
              const f = e.target.value as WritableField;
              setBulkField(f);
              setBulkValue(f === 'priority' ? '2' : f === 'area_path' ? (areaPaths[0] ?? '') : '');
            }}
            className="bg-white border border-white/30 rounded-xl text-sm px-3 py-1.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1E63B6]/50 shrink-0"
          >
            <option value="priority">Priorité</option>
            <option value="version_souhaitee">Version souhaitée</option>
            <option value="integration_build">Build</option>
            <option value="area_path">Zone</option>
          </select>

          {bulkField === 'priority' ? (
            <select
              value={bulkValue}
              onChange={e => setBulkValue(e.target.value)}
              className="bg-white border border-white/30 rounded-xl text-sm px-3 py-1.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1E63B6]/50 w-20 shrink-0"
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          ) : bulkField === 'area_path' ? (
            <select
              value={bulkValue}
              onChange={e => setBulkValue(e.target.value)}
              className="bg-white border border-white/30 rounded-xl text-sm px-3 py-1.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1E63B6]/50 shrink-0 max-w-[190px]"
            >
              {areaPaths.map(p => (
                <option key={p} value={p}>{areaPathLabel(p)}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={bulkValue}
              onChange={e => setBulkValue(e.target.value)}
              placeholder="Nouvelle valeur…"
              className="bg-white border border-white/30 rounded-xl text-sm px-3 py-1.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E63B6]/50 flex-1 min-w-0"
            />
          )}

          <button
            onClick={() => setConfirmBulk(true)}
            disabled={savingBulk || !bulkValue}
            className="shrink-0 px-4 py-1.5 rounded-xl text-sm font-semibold bg-[#1E63B6] hover:bg-[#2a78d6] disabled:opacity-50 disabled:cursor-wait transition-colors"
          >
            {savingBulk ? 'Enregistrement…' : 'Appliquer'}
          </button>

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
