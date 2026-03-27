import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';

interface HomeStats {
  open_bugs: {
    total: number;
    live: number;
    onpremise: number;
    hors_version: number;
    uncategorized: number;
  };
  anomalies: { total: number };
}

function SyncIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${spinning ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
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
  const [syncing,   setSyncing]   = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number } | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/stats/home').then(r => r.json()).then(setStats).catch(() => {});
  }, []);

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    setSyncError(null);
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const result = await res.json();
      setSyncResult({ synced: result.synced });
      window.dispatchEvent(new CustomEvent('qualipilot:synced'));
      fetch('/api/stats/home').then(r => r.json()).then(setStats).catch(() => {});
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setSyncing(false);
    }
  }

  const ob = stats?.open_bugs;

  return (
    <Layout title="Tableau de bord" actions={
      <button
        onClick={handleSync}
        disabled={syncing}
        className={[
          'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all',
          syncing ? 'bg-blue-400 cursor-wait' : 'bg-[#1E63B6] hover:bg-[#0F3E8A] shadow-md shadow-[#1E63B6]/25',
        ].join(' ')}
      >
        <SyncIcon spinning={syncing} />
        {syncing ? 'Synchronisation…' : 'Synchroniser'}
      </button>
    }>

      {/* Sync banners */}
      {syncResult && (
        <div className="mb-4 flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-5 py-3 text-sm text-blue-700">
          <SyncIcon spinning={false} />
          <span>Synchronisation terminée — <strong>{syncResult.synced}</strong> bugs importés.</span>
          <button onClick={() => setSyncResult(null)} className="ml-auto text-blue-400 hover:text-blue-600 text-lg leading-none">×</button>
        </div>
      )}
      {syncError && (
        <div className="mb-4 bg-red-50 border border-red-100 rounded-2xl px-5 py-3 text-sm text-red-600 flex items-center justify-between">
          <span>Erreur : {syncError}</span>
          <button onClick={() => setSyncError(null)} className="text-red-400 hover:text-red-600">×</button>
        </div>
      )}

      {/* Section — Bugs ouverts par type */}
      <div className="mb-2">
        <h2 className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Bugs New / Active</h2>
        <div className="grid grid-cols-5 gap-4 mb-7">
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
