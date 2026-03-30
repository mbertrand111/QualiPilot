import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import { SyncButton } from '../components/SyncButton';
import { useSyncAndEvaluate } from '../hooks/useSyncAndEvaluate';

const ADO_BASE = 'https://dev.azure.com/Isagri-Prod-Progiciels/Isagri_Dev_GC_GestionCommerciale/_workitems/edit/';

// Donnees snapshots (mock historique existant)
const SNAPSHOTS = [
  { date: '23/03/2026', sprint: 'PI5-SP3', totalBugs: 247, created: 33, closed: 28, violations: 52, conformity: 78 },
  { date: '16/03/2026', sprint: 'PI5-SP2', totalBugs: 242, created: 47, closed: 43, violations: 61, conformity: 75 },
  { date: '09/03/2026', sprint: 'PI5-SP1', totalBugs: 238, created: 41, closed: 38, violations: 68, conformity: 71 },
  { date: '02/03/2026', sprint: 'PI5-IP', totalBugs: 235, created: 12, closed: 18, violations: 55, conformity: 77 },
  { date: '23/02/2026', sprint: 'PI4-SP4', totalBugs: 241, created: 36, closed: 42, violations: 49, conformity: 80 },
  { date: '16/02/2026', sprint: 'PI4-SP3', totalBugs: 247, created: 44, closed: 39, violations: 63, conformity: 74 },
  { date: '09/02/2026', sprint: 'PI4-SP2', totalBugs: 242, created: 52, closed: 47, violations: 71, conformity: 71 },
  { date: '02/02/2026', sprint: 'PI4-SP1', totalBugs: 237, created: 38, closed: 41, violations: 58, conformity: 76 },
];

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

function ConformityBar({ value }: { value: number }) {
  const color = value >= 80 ? 'bg-green-500' : value >= 70 ? 'bg-amber-400' : 'bg-red-500';
  const text = value >= 80 ? 'text-green-600' : value >= 70 ? 'text-amber-600' : 'text-red-600';
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className={`text-[12px] font-mono font-bold w-10 text-right ${text}`}>{value} %</span>
    </div>
  );
}

export default function History() {
  const trend = SNAPSHOTS[0].totalBugs - SNAPSHOTS[SNAPSHOTS.length - 1].totalBugs;

  const [autoRows, setAutoRows] = useState<AutoFixRow[]>([]);
  const [loadingAuto, setLoadingAuto] = useState(false);
  const [autoError, setAutoError] = useState<string | null>(null);
  const [acking, setAcking] = useState(false);
  const [lastRun, setLastRun] = useState<AutoFixLastRun | null>(null);

  const hasAutoRows = autoRows.length > 0;

  const loadAutoFixes = useCallback(async () => {
    setLoadingAuto(true);
    setAutoError(null);
    try {
      const res = await fetch('/api/stats/auto-fixes');
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const data = await res.json();
      setAutoRows(Array.isArray(data.rows) ? data.rows : []);
      setLastRun(data.lastRun && typeof data.lastRun === 'object' ? data.lastRun as AutoFixLastRun : null);
    } catch (e) {
      setAutoError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoadingAuto(false);
    }
  }, []);

  useEffect(() => {
    loadAutoFixes();
  }, [loadAutoFixes]);

  const {
    step: syncStep,
    result: syncResult,
    error: syncError,
    run: runSync,
    clearResult: clearSyncResult,
    clearError: clearSyncError,
  } = useSyncAndEvaluate(async () => {
    await loadAutoFixes();
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
    const count = typeof lastRun?.total_updated === 'number' ? lastRun.total_updated : autoRows.length;
    return `Corrections auto effectu\u00E9es depuis dernier check (${count})`;
  }, [lastRun, autoRows.length]);

  return (
    <Layout title="Historique des snapshots" actions={<SyncButton step={syncStep} onClick={runSync} />}>
      {syncResult && (
        <div className="mb-4 flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-5 py-3 text-sm text-blue-700">
          <span>
            {'Synchronisation termin\u00E9e \u2014 '}
            <strong>{syncResult.synced}</strong> {'bugs import\u00E9s, '}
            <strong>{syncResult.checkedBugs}</strong> {'analys\u00E9s, '}
            <strong className="text-red-600">{syncResult.newViolations}</strong> nouvelles anomalies,{' '}
            <strong className="text-green-700">{syncResult.resolvedViolations}</strong> {'r\u00E9solues.'}
          </span>
          <button onClick={clearSyncResult} className="ml-auto text-blue-400 hover:text-blue-600 text-lg leading-none">x</button>
        </div>
      )}
      {syncError && (
        <div className="mb-4 bg-red-50 border border-red-100 rounded-2xl px-5 py-3 text-sm text-red-600 flex items-center justify-between">
          <span>{'Erreur de synchronisation/\u00E9valuation : '}{syncError}</span>
          <button onClick={clearSyncError} className="text-red-400 hover:text-red-600">x</button>
        </div>
      )}
      <div className="fade-up flex items-start gap-4 mb-6">
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-[#0e1a38]">
              {SNAPSHOTS.length} snapshots - automatiques chaque semaine
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              Evolution sur 8 semaines - Backlog {trend > 0 ? `+${trend}` : trend} bugs vs il y a 8 semaines
            </div>
          </div>
        </div>
        <div className={`bg-white rounded-2xl shadow-sm border px-5 py-4 text-center min-w-[120px] ${
          trend <= 0 ? 'border-green-100' : 'border-amber-100'
        }`}>
          <div className={`text-2xl font-mono font-bold ${trend <= 0 ? 'text-green-600' : 'text-amber-600'}`}>
            {trend > 0 ? '+' : ''}{trend}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">bugs sur 8 sem.</div>
        </div>
      </div>

      <div className="fade-up fade-up-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/60 border-b border-gray-100">
              {['Date', 'Sprint', 'Bugs ouverts', 'Créés', 'Fermés', 'Anomalies', 'Conformité'].map((h, i) => (
                <th
                  key={h}
                  className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 ${
                    i < 2 ? 'text-left' : 'text-right'
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {SNAPSHOTS.map((s, i) => (
              <tr key={s.date} className={`hover:bg-gray-50/50 ${i === 0 ? 'bg-blue-50/20' : ''}`}>
                <td className="px-5 py-3.5">
                  <span className="text-[13px] font-medium text-gray-700">{s.date}</span>
                  {i === 0 && (
                    <span className="ml-2 text-[10px] font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      Actuel
                    </span>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-[12px] font-mono font-semibold text-gray-600">{s.sprint}</span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <span className="text-[13px] font-mono font-bold text-[#0e1a38]">{s.totalBugs}</span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <span className="text-[12px] font-mono font-semibold text-red-500">+{s.created}</span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <span className="text-[12px] font-mono font-semibold text-green-600">-{s.closed}</span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <span className={`text-[12px] font-mono font-bold ${
                    s.violations > 65 ? 'text-red-600' : s.violations > 55 ? 'text-amber-600' : 'text-green-600'
                  }`}>
                    {s.violations}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <ConformityBar value={s.conformity} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
                : 'bg-white text-[#1E63B6] border-[#1E63B6]/30 hover:bg-blue-50 hover:border-[#1E63B6]',
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
                    Aucune correction auto sur le dernier check.
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
                      className="text-[#1E63B6] hover:underline"
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

      <p className="fade-up mt-4 text-[11px] text-gray-400 text-center">
        Snapshots générés automatiquement chaque semaine par le scheduler - aucune action manuelle requise.
      </p>
    </Layout>
  );
}


