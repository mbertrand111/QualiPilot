import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { MultiSelect } from '../components/MultiSelect';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Bug {
  id: number;
  title: string;
  state: string;
  priority: number | null;
  team: string | null;
  sprint: string | null;
  sprint_done: string | null;
  found_in: string | null;
  integration_build: string | null;
  version_souhaitee: string | null;
  resolved_reason: string | null;
  raison_origine: string | null;
  assigned_to: string | null;
  created_date: string | null;
  changed_date: string | null;
}

interface BugsResponse {
  total: number;
  page: number;
  limit: number;
  sort: string;
  dir: string;
  bugs: Bug[];
}

type SortDir = 'asc' | 'desc';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function dateShort(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// ─── SortableHeader ───────────────────────────────────────────────────────────

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
      className={`text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide cursor-pointer select-none whitespace-nowrap group ${active ? 'text-[#1E63B6]' : 'text-gray-400 hover:text-gray-600'} ${className}`}
    >
      <span className="flex items-center">
        {label}
        <SortIcon active={active} dir={dir} />
      </span>
    </th>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const LIMIT = 50;

export default function BugList() {
  const [bugs, setBugs]       = useState<Bug[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const [teams, setTeams]     = useState<string[]>([]);
  const [sprints, setSprints] = useState<string[]>([]);

  // Filtres multi-sélection
  const [filterTeams,   setFilterTeams]   = useState<string[]>([]);
  const [filterStates,  setFilterStates]  = useState<string[]>([]);
  const [filterSprints, setFilterSprints] = useState<string[]>([]);

  // Filtres contient
  const [filterTitle,   setFilterTitle]   = useState('');
  const [filterVersion, setFilterVersion] = useState('');
  const [filterFoundIn, setFilterFoundIn] = useState('');
  const [filterBuild,   setFilterBuild]   = useState('');

  // Tri
  const [sort, setSort] = useState('changed_date');
  const [dir,  setDir]  = useState<SortDir>('desc');

  // Synchronisation ADO
  const [syncing,     setSyncing]     = useState(false);
  const [syncResult,  setSyncResult]  = useState<{ synced: number } | null>(null);
  const [syncError,   setSyncError]   = useState<string | null>(null);

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

  useEffect(() => {
    fetch('/api/bugs/meta/teams').then(r => r.json()).then(setTeams).catch(() => {});
    fetch('/api/bugs/meta/sprints').then(r => r.json()).then(setSprints).catch(() => {});
  }, []);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT), sort, dir });
      if (filterTeams.length)   params.set('team',     filterTeams.join(','));
      if (filterStates.length)  params.set('state',    filterStates.join(','));
      if (filterSprints.length) params.set('sprint',   filterSprints.join(','));
      if (filterTitle)   params.set('title',    filterTitle);
      if (filterVersion) params.set('version',  filterVersion);
      if (filterFoundIn) params.set('found_in', filterFoundIn);
      if (filterBuild)   params.set('build',    filterBuild);

      const res = await fetch(`/api/bugs?${params}`);
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const data: BugsResponse = await res.json();
      setBugs(data.bugs);
      setTotal(data.total);
      setPage(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [filterTeams, filterStates, filterSprints, filterTitle, filterVersion, filterFoundIn, filterBuild, sort, dir]);

  useEffect(() => { load(1); }, [load]);

  function handleSort(col: string) {
    if (sort === col) {
      setDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(col);
      setDir('asc');
    }
  }

  function resetFilters() {
    setFilterTeams([]); setFilterStates([]); setFilterSprints([]);
    setFilterTitle(''); setFilterVersion(''); setFilterFoundIn(''); setFilterBuild('');
  }

  const hasFilters = filterTeams.length || filterStates.length || filterSprints.length || filterTitle || filterVersion || filterFoundIn || filterBuild;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <Layout title="Bugs" actions={
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

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 space-y-3">
        {/* Ligne 1 : multi-selects */}
        <div className="flex flex-wrap gap-3 items-center">
          <MultiSelect
            label="Équipes"
            options={teams}
            selected={filterTeams}
            onChange={setFilterTeams}
          />
          <MultiSelect
            label="États"
            options={['New', 'Active', 'Resolved', 'Closed']}
            selected={filterStates}
            onChange={setFilterStates}
            renderOption={opt => (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${STATE_STYLES[opt] ?? 'bg-gray-100 text-gray-600'}`}>
                {opt}
              </span>
            )}
          />
          <MultiSelect
            label="Sprints"
            options={sprints}
            selected={filterSprints}
            onChange={setFilterSprints}
          />
          {hasFilters && (
            <button onClick={resetFilters} className="text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2 ml-1">
              Tout réinitialiser
            </button>
          )}
        </div>

        {/* Ligne 2 : champs texte "contient" */}
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Titre contient',           value: filterTitle,   set: setFilterTitle },
            { label: 'Version souhaitée contient', value: filterVersion, set: setFilterVersion },
            { label: 'Trouvé dans contient',      value: filterFoundIn, set: setFilterFoundIn },
            { label: 'Build contient',            value: filterBuild,   set: setFilterBuild },
          ].map(({ label, value, set }) => (
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
        {error && <div className="p-6 text-center text-red-600 text-sm">{error}</div>}

        {!error && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <Th col="id"                label="ID"               sort={sort} dir={dir} onSort={handleSort} />
                  <Th col="title"             label="Titre"            sort={sort} dir={dir} onSort={handleSort} className="min-w-[200px]" />
                  <Th col="state"             label="État"             sort={sort} dir={dir} onSort={handleSort} />
                  <Th col="team"              label="Équipe"           sort={sort} dir={dir} onSort={handleSort} />
                  <Th col="sprint"            label="Sprint"           sort={sort} dir={dir} onSort={handleSort} />
                  <Th col="found_in"          label="Trouvé dans"      sort={sort} dir={dir} onSort={handleSort} />
                  <Th col="version_souhaitee" label="Version souhaitée" sort={sort} dir={dir} onSort={handleSort} />
                  <Th col="integration_build" label="Build"            sort={sort} dir={dir} onSort={handleSort} />
                  <Th col="changed_date"      label="Modifié"          sort={sort} dir={dir} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400 text-sm">Chargement…</td></tr>
                )}
                {!loading && bugs.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400 text-sm">Aucun bug trouvé</td></tr>
                )}
                {!loading && bugs.map(bug => (
                  <tr key={bug.id} className="border-b border-gray-50 hover:bg-[#66D2DB]/5 transition-colors">
                    <td className="px-4 py-3 font-mono text-[12px] text-[#1E63B6] font-semibold whitespace-nowrap">
                      <a href={`https://dev.azure.com/Isagri-Prod-Progiciels/Isagri_Dev_GC_GestionCommerciale/_workitems/edit/${bug.id}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        #{bug.id}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-[#2B2B2B] max-w-[300px]">
                      <span className="line-clamp-2 leading-snug">{bug.title}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap"><StateBadge state={bug.state} /></td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-[12px]">{bug.team ?? ''}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-gray-500 whitespace-nowrap">{bug.sprint ?? ''}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-gray-500 whitespace-nowrap">{bug.found_in ?? ''}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-gray-700 whitespace-nowrap">{bug.version_souhaitee ?? ''}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-gray-500 whitespace-nowrap">{bug.integration_build ?? ''}</td>
                    <td className="px-4 py-3 text-[12px] text-gray-400 whitespace-nowrap">{dateShort(bug.changed_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && !loading && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[12px] text-gray-400">
              Page {page} / {totalPages} — {total.toLocaleString('fr-FR')} bugs
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
    </Layout>
  );
}
