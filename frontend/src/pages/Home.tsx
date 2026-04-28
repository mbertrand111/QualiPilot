import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { SyncButton } from '../components/SyncButton';
import { useSyncAndEvaluate } from '../hooks/useSyncAndEvaluate';

interface HomeStats {
  open_bugs: {
    total: number;
    live: number;
    onpremise: number;
    hors_version: number;
    uncategorized: number;
  };
  triage: {
    prioritiser: number;
    corriger_live: number;
    corriger_onpremise: number;
    corriger_hors_version: number;
  };
  resolved_bugs: { total: number; older_than_5d: number };
  anomalies: { total: number };
  trend_7d: { created: number; resolved: number };
  old_bugs: { live: number; onpremise: number; other: number };
}

interface StatCardProps {
  label: string;
  value: number | string;
  sub?: string;
  color: 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'gray';
  onClick?: () => void;
}

function StatCard({ label, value, sub, color, onClick }: StatCardProps) {
  const colorMap = {
    blue:   { border: 'border-blue-100',   label: 'text-blue-500',   value: 'text-[#0e1a38]', bg: 'hover:bg-blue-50/60' },
    green:  { border: 'border-green-100',  label: 'text-green-600',  value: 'text-green-700', bg: 'hover:bg-green-50/60' },
    amber:  { border: 'border-amber-100',  label: 'text-amber-600',  value: 'text-amber-700', bg: 'hover:bg-amber-50/60' },
    red:    { border: 'border-red-100',    label: 'text-red-500',    value: 'text-red-700',   bg: 'hover:bg-red-50/60' },
    violet: { border: 'border-violet-100', label: 'text-violet-600', value: 'text-violet-700', bg: 'hover:bg-violet-50/60' },
    gray:   { border: 'border-gray-200',   label: 'text-gray-400',   value: 'text-gray-600',  bg: 'hover:bg-gray-50' },
  };
  const c = colorMap[color];
  return (
    <button
      onClick={onClick}
      className={`text-left w-full bg-white rounded-2xl p-5 shadow-sm border ${c.border} ${onClick ? `cursor-pointer ${c.bg} transition-colors` : 'cursor-default'} hover:shadow-md`}
    >
      <div className={`text-[11px] font-semibold uppercase tracking-wider mb-3 ${c.label}`}>{label}</div>
      <div className={`text-4xl font-mono font-bold tracking-tight ${c.value}`}>{value}</div>
      {sub && <div className={`text-xs mt-2 ${c.label} opacity-80`}>{sub}</div>}
    </button>
  );
}

export function Home() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<HomeStats | null>(null);

  const [statsError, setStatsError] = useState<string | null>(null);

  const loadStats = useCallback(() => {
    fetch('/api/stats/home')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => { setStats(data); setStatsError(null); })
      .catch(() => { setStatsError('Impossible de charger les statistiques.'); });
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const {
    step: syncStep,
    result: syncResult,
    error: syncError,
    run: runSync,
    clearResult: clearSyncResult,
    clearError: clearSyncError,
  } = useSyncAndEvaluate(loadStats);

  const ob = stats?.open_bugs;
  const tr = stats?.triage;
  const rb = stats?.resolved_bugs;
  const old = stats?.old_bugs;
  const tnd = stats?.trend_7d;
  const trendNet = tnd ? tnd.created - tnd.resolved : null;

  return (
    <Layout title="Tableau de bord" actions={
      <SyncButton step={syncStep} onClick={runSync} />
    }>

      {/* Sync banners */}
      {syncResult && (
        <div className="mb-4 flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-5 py-3 text-sm text-blue-700">
          <span>
            Synchronisation terminée — <strong>{syncResult.synced}</strong> bugs importés,{' '}
            <strong>{syncResult.checkedBugs}</strong> analysés,{' '}
            <strong className="text-red-600">{syncResult.newViolations}</strong> nouvelles anomalies,{' '}
            <strong className="text-green-700">{syncResult.resolvedViolations}</strong> résolues.
          </span>
          <button onClick={clearSyncResult} className="ml-auto text-blue-400 hover:text-blue-600 text-lg leading-none">×</button>
        </div>
      )}
      {syncError && (
        <div className="mb-4 bg-red-50 border border-red-100 rounded-2xl px-5 py-3 text-sm text-red-600 flex items-center justify-between">
          <span>Erreur : {syncError}</span>
          <button onClick={clearSyncError} className="text-red-400 hover:text-red-600">×</button>
        </div>
      )}

      {statsError && (
        <div className="mb-4 bg-red-50 border border-red-100 rounded-2xl px-5 py-3 text-sm text-red-600">
          {statsError}
        </div>
      )}

      {/* Section 1 — Bugs ouverts par type */}
      <div className="mb-7">
        <h2 className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Bugs ouverts par type</h2>
        <div className="grid grid-cols-5 gap-4">
          <StatCard
            label="Total"
            value={ob?.total ?? '…'}
            sub="New + Active"
            color="blue"
            onClick={() => navigate('/triage')}
          />
          <StatCard
            label="Live"
            value={ob?.live ?? '…'}
            sub="Versions FAH"
            color="green"
            onClick={() => navigate('/triage?bug_type=live')}
          />
          <StatCard
            label="OnPremise"
            value={ob?.onpremise ?? '…'}
            sub="Versions historiques"
            color="violet"
            onClick={() => navigate('/triage?bug_type=onpremise')}
          />
          <StatCard
            label="Hors version"
            value={ob?.hors_version ?? '…'}
            sub="Non concerné"
            color="amber"
            onClick={() => navigate('/triage?bug_type=hors_version')}
          />
          <StatCard
            label="Non catégorisés"
            value={ob?.uncategorized ?? '…'}
            sub="À vérifier"
            color="gray"
            onClick={() => navigate('/triage?bug_type=uncategorized')}
          />
        </div>
      </div>

      {/* Section 2 — À trier (zones non assignées) */}
      <div className="mb-7">
        <h2 className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-3">À trier — bugs non répartis dans les équipes</h2>
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            label="À prioriser"
            value={tr?.prioritiser ?? '…'}
            sub="Sans zone définie"
            color="amber"
            onClick={() => navigate('/triage?card=prioritiser')}
          />
          <StatCard
            label="À corriger — Live"
            value={tr?.corriger_live ?? '…'}
            sub="Backlog Live à dispatcher"
            color="green"
            onClick={() => navigate('/triage?card=corriger_live')}
          />
          <StatCard
            label="À corriger — OnPremise"
            value={tr?.corriger_onpremise ?? '…'}
            sub="Backlog OnPremise à dispatcher"
            color="violet"
            onClick={() => navigate('/triage?card=corriger_onpremise')}
          />
          <StatCard
            label="À corriger — Hors version"
            value={tr?.corriger_hors_version ?? '…'}
            sub="Backlog hors version à dispatcher"
            color="gray"
            onClick={() => navigate('/triage?card=corriger_hors_version')}
          />
        </div>
      </div>

      <hr className="border-t border-gray-100 my-6" />

      {/* Section 3 — À surveiller */}
      <div className="mb-7">
        <h2 className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-3">À surveiller</h2>
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="Resolved en attente"
            value={rb?.total ?? '…'}
            sub={rb ? `dont ${rb.older_than_5d} en attente >5j` : 'Tests à valider'}
            color="red"
            onClick={() => navigate('/triage?state=Resolved&sort=changed_date&dir=desc')}
          />
          <StatCard
            label="Anomalies actives"
            value={stats?.anomalies.total ?? '…'}
            sub="Voir les anomalies →"
            color="red"
            onClick={() => navigate('/conformity')}
          />
          <StatCard
            label="Évolution 7 jours"
            value={trendNet === null ? '…' : (trendNet > 0 ? `+${trendNet}` : `${trendNet}`)}
            sub={tnd ? `+${tnd.created} créés · −${tnd.resolved} résolus` : 'Solde net hebdo'}
            color="blue"
          />
        </div>
      </div>

      {/* Section 4 — Bugs anciens (>6 mois) */}
      <div>
        <h2 className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Bugs anciens — ouverts depuis +6 mois</h2>
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="Live"
            value={old?.live ?? '…'}
            sub="Versions FAH"
            color="green"
            onClick={() => navigate('/triage?card=old_6months&bug_type=live')}
          />
          <StatCard
            label="OnPremise"
            value={old?.onpremise ?? '…'}
            sub="Versions historiques"
            color="violet"
            onClick={() => navigate('/triage?card=old_6months&bug_type=onpremise')}
          />
          <StatCard
            label="Autre"
            value={old?.other ?? '…'}
            sub="Hors version + Non catégorisés"
            color="amber"
            onClick={() => navigate('/triage?card=old_6months&bug_type=hors_version,uncategorized')}
          />
        </div>
      </div>
    </Layout>
  );
}
