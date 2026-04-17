import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import { SyncButton } from '../components/SyncButton';
import { useSyncAndEvaluate } from '../hooks/useSyncAndEvaluate';

const ADO_BASE = 'https://dev.azure.com/Isagri-Prod-Progiciels/Isagri_Dev_GC_GestionCommerciale/_workitems/edit/';

interface AutoFixRow {
  id: number;
  work_item_id: number;
  rule_code: string;
  rule_description: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  trigger_source: string;
  performed_at: string;
}

interface AutoFixLastRun {
  id: number;
  trigger_source: 'sync' | 'scheduler' | string;
  run_at: string;
  skipped: boolean;
  total_updated: number;
}

interface TeamBacklogSnapshotRow {
  team: string;
  objective: number;
  gc_bugs: number;
  new_bugs: number;
  active_bugs: number;
  resolved_bugs: number;
  co_bugs: number;
  iw_bugs: number;
}

interface TeamBacklogSnapshot {
  id: number;
  snapshot_date: string;
  sprint_name: string;
  pi_name: string | null;
  source: string;
  live_area_bugs: number;
  teams: TeamBacklogSnapshotRow[];
}

interface TeamBacklogHistoryResponse {
  generatedAt: string;
  teamOrder: string[];
  snapshots: TeamBacklogSnapshot[];
}

const FALLBACK_TEAM_ORDER = ['COCO', 'GO FAHST', 'JURASSIC BACK', 'MAGIC SYSTEM', 'MELI MELO', 'NULL.REF', 'PIXELS', 'LACE'];
const TEAM_OBJECTIVES: Record<string, number> = {
  'COCO': 8,
  'GO FAHST': 5,
  'JURASSIC BACK': 8,
  'MAGIC SYSTEM': 20,
  'MELI MELO': 8,
  'NULL.REF': 10,
  'PIXELS': 7,
  'LACE': 10,
};

function buildMockSnapshots(teamOrder: string[]): TeamBacklogSnapshot[] {
  const sprints = [
    { id: -1, snapshot_date: '2026-03-27', sprint_name: 'PI4-SP4', pi_name: 'PI4', live_area_bugs: 7 },
    { id: -2, snapshot_date: '2026-03-13', sprint_name: 'PI4-SP3', pi_name: 'PI4', live_area_bugs: 5 },
    { id: -3, snapshot_date: '2026-02-27', sprint_name: 'PI4-SP2', pi_name: 'PI4', live_area_bugs: 4 },
    { id: -4, snapshot_date: '2026-02-13', sprint_name: 'PI4-SP1', pi_name: 'PI4', live_area_bugs: 6 },
  ];

  const perTeamSeries: Record<string, number[]> = {
    'COCO': [17, 13, 9, 8],
    'GO FAHST': [15, 10, 7, 5],
    'JURASSIC BACK': [9, 8, 7, 6],
    'MAGIC SYSTEM': [16, 20, 22, 18],
    'MELI MELO': [2, 4, 6, 8],
    'NULL.REF': [10, 9, 8, 11],
    'PIXELS': [8, 7, 6, 9],
    'LACE': [2, 5, 8, 10],
  };

  return sprints.map((sprint, sprintIdx) => ({
    id: sprint.id,
    snapshot_date: sprint.snapshot_date,
    sprint_name: sprint.sprint_name,
    pi_name: sprint.pi_name,
    source: 'mock',
    live_area_bugs: sprint.live_area_bugs,
    teams: teamOrder.map((team, teamIdx) => {
      const objective = TEAM_OBJECTIVES[team] ?? 10;
      const gcBugs = perTeamSeries[team]?.[sprintIdx] ?? Math.max(0, objective + ((teamIdx + sprintIdx) % 5) - 2);
      const newBugs = Math.max(0, Math.round(gcBugs * 0.65));
      const activeBugs = Math.max(0, gcBugs - newBugs);
      return {
        team,
        objective,
        gc_bugs: gcBugs,
        new_bugs: newBugs,
        active_bugs: activeBugs,
        resolved_bugs: (teamIdx + sprintIdx) % 5,
        co_bugs: (teamIdx + 2 * sprintIdx) % 4,
        iw_bugs: (teamIdx + sprintIdx + 1) % 3,
      };
    }),
  }));
}

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function fmtSnapshotDate(isoDate: string): string {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return isoDate;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function teamTone(gcBugs: number, objective: number): string {
  if (gcBugs > objective) return 'bg-red-50 text-red-700 border-red-200';
  if (gcBugs === objective) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-green-50 text-green-700 border-green-200';
}

function isTeamCompliant(row: TeamBacklogSnapshotRow): boolean {
  return row.gc_bugs <= row.objective;
}

export default function History() {
  const [autoRows, setAutoRows] = useState<AutoFixRow[]>([]);
  const [loadingAuto, setLoadingAuto] = useState(false);
  const [autoError, setAutoError] = useState<string | null>(null);
  const [acking, setAcking] = useState(false);
  const [lastRun, setLastRun] = useState<AutoFixLastRun | null>(null);

  const [kpiHistory, setKpiHistory] = useState<TeamBacklogHistoryResponse | null>(null);
  const [loadingKpiHistory, setLoadingKpiHistory] = useState(false);
  const [kpiHistoryError, setKpiHistoryError] = useState<string | null>(null);
  const [showMockPreview, setShowMockPreview] = useState(true);

  const hasAutoRows = autoRows.length > 0;

  const loadAutoFixes = useCallback(async () => {
    setLoadingAuto(true);
    setAutoError(null);
    try {
      const res = await fetch('/api/stats/auto-fixes');
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const data = await res.json();
      setAutoRows(Array.isArray(data.rows) ? data.rows : []);
      setLastRun(data.lastRun && typeof data.lastRun === 'object' ? (data.lastRun as AutoFixLastRun) : null);
    } catch (e) {
      setAutoError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoadingAuto(false);
    }
  }, []);

  const loadKpiHistory = useCallback(async () => {
    setLoadingKpiHistory(true);
    setKpiHistoryError(null);
    try {
      const res = await fetch('/api/stats/kpi-history?limit=120');
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const data = (await res.json()) as TeamBacklogHistoryResponse;
      setKpiHistory(data);
    } catch (e) {
      setKpiHistoryError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoadingKpiHistory(false);
    }
  }, []);

  useEffect(() => {
    void loadAutoFixes();
    void loadKpiHistory();
  }, [loadAutoFixes, loadKpiHistory]);

  const {
    step: syncStep,
    result: syncResult,
    error: syncError,
    run: runSync,
    clearResult: clearSyncResult,
    clearError: clearSyncError,
  } = useSyncAndEvaluate(async () => {
    await Promise.all([loadAutoFixes(), loadKpiHistory()]);
  });

  async function acknowledgeAll() {
    setAcking(true);
    setAutoError(null);
    try {
      const res = await fetch('/api/stats/auto-fixes/ack', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `Erreur ${res.status}`);
      }
      await loadAutoFixes();
    } catch (e) {
      setAutoError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setAcking(false);
    }
  }

  const autoSectionTitle = useMemo(() => {
    const count = autoRows.length;
    return `Corrections auto effectuées depuis dernier check (${count})`;
  }, [autoRows.length]);

  const realTeamOrder = (kpiHistory?.teamOrder?.length ? kpiHistory.teamOrder : FALLBACK_TEAM_ORDER);
  const realSnapshots = kpiHistory?.snapshots ?? [];
  const mockSnapshots = useMemo(() => buildMockSnapshots(realTeamOrder), [realTeamOrder]);
  const usingMockPreview = showMockPreview && realSnapshots.length === 0;
  const snapshots = usingMockPreview ? mockSnapshots : realSnapshots;
  const teamOrder = realTeamOrder;
  const latestSnapshot = snapshots[0] ?? null;

  const compliantLiveSnapshots = useMemo(
    () => snapshots.filter((snapshot) => snapshot.live_area_bugs <= 5).length,
    [snapshots],
  );
  const compliantTeamSnapshots = useMemo(
    () => snapshots.filter((snapshot) => snapshot.teams.every(isTeamCompliant)).length,
    [snapshots],
  );

  const latestCompliance = useMemo(() => {
    if (!latestSnapshot) return null;
    return {
      teamsOk: latestSnapshot.teams.filter(isTeamCompliant).length,
      teamsTotal: latestSnapshot.teams.length,
      liveOk: latestSnapshot.live_area_bugs <= 5,
    };
  }, [latestSnapshot]);

  return (
    <Layout title="Historique" actions={<SyncButton step={syncStep} onClick={runSync} />}>
      {syncResult && (
        <div className="mb-4 flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-5 py-3 text-sm text-blue-700">
          <span>
            {'Synchronisation terminée - '}
            <strong>{syncResult.synced}</strong> {'bugs importés, '}
            <strong>{syncResult.checkedBugs}</strong> {'analysés, '}
            <strong className="text-red-600">{syncResult.newViolations}</strong> nouvelles anomalies,{' '}
            <strong className="text-green-700">{syncResult.resolvedViolations}</strong> {'résolues.'}
          </span>
          <button onClick={clearSyncResult} className="ml-auto text-blue-400 hover:text-blue-600 text-lg leading-none">x</button>
        </div>
      )}

      {syncError && (
        <div className="mb-4 bg-red-50 border border-red-100 rounded-2xl px-5 py-3 text-sm text-red-600 flex items-center justify-between">
          <span>{'Erreur de synchronisation/évaluation : '}{syncError}</span>
          <button onClick={clearSyncError} className="text-red-400 hover:text-red-600">x</button>
        </div>
      )}

      <div className="fade-up grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4">
          <div className="text-xs uppercase tracking-wide text-gray-400">Snapshots enregistrés</div>
          <div className="mt-1 text-2xl font-mono font-bold text-[#0e1a38]">{snapshots.length}</div>
          <div className="text-xs text-gray-400 mt-1">Captures automatiques le vendredi (SP1 à SP4)</div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4">
          <div className="text-xs uppercase tracking-wide text-gray-400">Conformité LIVE</div>
          <div className="mt-1 text-2xl font-mono font-bold text-[#0e1a38]">{compliantLiveSnapshots} / {snapshots.length || 0}</div>
          <div className="text-xs text-gray-400 mt-1">Bugs à corriger LIVE {'<= 5'}</div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4">
          <div className="text-xs uppercase tracking-wide text-gray-400">Conformité équipes</div>
          <div className="mt-1 text-2xl font-mono font-bold text-[#0e1a38]">{compliantTeamSnapshots} / {snapshots.length || 0}</div>
          <div className="text-xs text-gray-400 mt-1">Objectifs équipes respectés</div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4">
          <div className="text-xs uppercase tracking-wide text-gray-400">Dernier snapshot</div>
          <div className="mt-1 text-sm font-semibold text-[#0e1a38]">{latestSnapshot ? latestSnapshot.sprint_name : 'Aucun'}</div>
          <div className="text-xs text-gray-500 mt-1">
            {latestSnapshot && latestCompliance
              ? `${fmtSnapshotDate(latestSnapshot.snapshot_date)} - ${latestCompliance.teamsOk}/${latestCompliance.teamsTotal} équipes OK - Bugs à corriger LIVE ${latestSnapshot.live_area_bugs}/5`
              : 'Aucune capture disponible pour le moment'}
          </div>
        </div>
      </div>

      <div className="fade-up fade-up-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-[#0e1a38]">Historique Backlogs équipes et Bugs à corriger LIVE</div>
            {usingMockPreview && (
              <button
                type="button"
                onClick={() => setShowMockPreview(false)}
                className="text-xs font-semibold rounded-lg px-2.5 py-1 border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100"
              >
                Masquer aperçu mock
              </button>
            )}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            Stockage de l&apos;instant T pour les fins de sprint SP1/SP2/SP3/SP4.
          </div>
        </div>

        {usingMockPreview && (
          <div className="px-5 py-3 text-xs text-amber-800 bg-amber-50 border-b border-amber-100">
            Aperçu mock affiché (pas encore de snapshot réel enregistré).
          </div>
        )}

        {kpiHistoryError && (
          <div className="px-5 py-3 text-sm text-red-600 bg-red-50 border-b border-red-100">
            Erreur: {kpiHistoryError}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1220px]">
            <thead>
              <tr className="bg-gray-50/60 border-b border-gray-100">
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 text-left">Date</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 text-left">Sprint</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 text-left">PI</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 text-left">Bugs à corriger LIVE</th>
                {teamOrder.map((team) => (
                  <th key={team} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 text-left whitespace-nowrap">
                    {team}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {loadingKpiHistory && (
                <tr>
                  <td colSpan={4 + teamOrder.length} className="px-4 py-10 text-center text-sm text-gray-400">Chargement...</td>
                </tr>
              )}

              {!loadingKpiHistory && snapshots.length === 0 && (
                <tr>
                  <td colSpan={4 + teamOrder.length} className="px-4 py-10 text-center text-sm text-gray-400">
                    Aucun snapshot enregistré pour le moment.
                  </td>
                </tr>
              )}

              {!loadingKpiHistory && snapshots.map((snapshot, idx) => {
                const byTeam = new Map(snapshot.teams.map((row) => [row.team, row] as const));
                const liveOk = snapshot.live_area_bugs <= 5;

                return (
                  <tr key={snapshot.id} className={`hover:bg-gray-50/50 ${idx === 0 ? 'bg-blue-50/20' : ''}`}>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {fmtSnapshotDate(snapshot.snapshot_date)}
                      {idx === 0 && (
                        <span className="ml-2 text-[10px] font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          Actuel
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-xs font-mono font-semibold text-gray-700 whitespace-nowrap">{snapshot.sprint_name}</td>

                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{snapshot.pi_name ?? '-'}</td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={[
                          'inline-flex items-center px-2 py-0.5 rounded-lg border text-xs font-mono font-semibold',
                          liveOk ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200',
                        ].join(' ')}
                        title="Objectif : <= 5"
                      >
                        {snapshot.live_area_bugs} / 5
                      </span>
                    </td>

                    {teamOrder.map((team) => {
                      const row = byTeam.get(team);
                      if (!row) {
                        return (
                          <td key={`${snapshot.id}-${team}`} className="px-4 py-3 text-xs text-gray-300">-</td>
                        );
                      }

                      const title = `New ${row.new_bugs} | Active ${row.active_bugs} | Resolved ${row.resolved_bugs} | CO ${row.co_bugs} | IW ${row.iw_bugs}`;
                      return (
                        <td key={`${snapshot.id}-${team}`} className="px-4 py-3 whitespace-nowrap">
                          <span
                            title={title}
                            className={`inline-flex items-center px-2 py-0.5 rounded-lg border text-xs font-mono font-semibold ${teamTone(row.gc_bugs, row.objective)}`}
                          >
                            {row.gc_bugs} / {row.objective}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="fade-up fade-up-2 mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-[#0e1a38]">{autoSectionTitle}</div>
            <div className="text-xs text-gray-400 mt-0.5">
              {lastRun
                ? `Dernier check: ${fmtDateTime(lastRun.run_at)} (${lastRun.trigger_source === 'scheduler' ? 'scheduler 15 min' : 'sync'})`
                : 'Trace des modifications appliquées automatiquement (sync + scheduler 15 min)'}
            </div>
          </div>
          <button
            onClick={acknowledgeAll}
            disabled={acking || !hasAutoRows}
            className={[
              'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold border transition-colors',
              acking || !hasAutoRows
                ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
                : 'bg-white text-[#1E40AF] border-[#1E40AF]/30 hover:bg-blue-50 hover:border-[#1E40AF]',
            ].join(' ')}
            title="Valider/vider le tableau des corrections automatiques"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            {acking ? 'Validation...' : 'Valider / vider'}
          </button>
        </div>

        {autoError && (
          <div className="px-5 py-3 text-sm text-red-600 bg-red-50 border-b border-red-100">
            Erreur: {autoError}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px]">
            <thead>
              <tr className="bg-gray-50/60 border-b border-gray-100">
                {['Date', 'Bug', 'Règle', 'Champ', 'Ancienne valeur', 'Nouvelle valeur', 'Source'].map((h) => (
                  <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loadingAuto && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">Chargement...</td>
                </tr>
              )}

              {!loadingAuto && autoRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                    Aucune correction auto en attente de validation.
                  </td>
                </tr>
              )}

              {!loadingAuto && autoRows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-xs text-gray-600 font-mono">{fmtDateTime(row.performed_at)}</td>
                  <td className="px-4 py-3 text-xs font-mono">
                    <a
                      href={`${ADO_BASE}${row.work_item_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#1E40AF] hover:underline"
                    >
                      #{row.work_item_id}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700">
                    <div className="font-mono font-semibold">{row.rule_code}</div>
                    <div className="text-gray-500">{row.rule_description}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700 font-mono">{row.field}</td>
                  <td className="px-4 py-3 text-xs text-red-500 font-mono">{row.old_value ?? '(vide)'}</td>
                  <td className="px-4 py-3 text-xs text-green-600 font-mono">{row.new_value ?? '(vide)'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    <span className="inline-flex px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200">
                      {row.trigger_source}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
