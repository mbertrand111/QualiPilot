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
  resolved_bugs: { total: number };
  anomalies: { total: number };
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
      .then(r => r.json())
      .then(setStats)
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
  const rb = stats?.resolved_bugs;

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

      {/* Section — Bugs ouverts par type */}
      <div className="mb-2">
        <h2 className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Bugs</h2>
        <div className="grid grid-cols-6 gap-4 mb-7">
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
          <StatCard
            label="Resolved"
            value={rb?.total ?? '…'}
            sub="Voir les plus récents"
            color="red"
            onClick={() => navigate('/triage?state=Resolved&sort=changed_date&dir=desc')}
          />
        </div>
      </div>

      {/* Section — Actions rapides */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="Anomalies actives"
          value={stats?.anomalies.total ?? '…'}
          sub="Voir les anomalies →"
          color="red"
          onClick={() => navigate('/conformity')}
        />
        <StatCard
          label="Bugs à trier"
          value=""
          sub="Bugs à prioriser / corriger →"
          color="amber"
          onClick={() => navigate('/triage')}
        />
      </div>
    </Layout>
  );
}
