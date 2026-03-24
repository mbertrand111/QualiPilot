import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';

// ─── Mock data ────────────────────────────────────────────────────────────────

const TEAMS = [
  { name: 'COCO',           bugs: 28, anomalies: 3,  status: 'warning' as const },
  { name: 'GO FAHST',       bugs: 35, anomalies: 8,  status: 'error'   as const },
  { name: 'JURASSIC BACK',  bugs: 22, anomalies: 1,  status: 'ok'      as const },
  { name: 'MAGIC SYSTEM',   bugs: 19, anomalies: 5,  status: 'error'   as const },
  { name: 'MELI MELO',      bugs: 31, anomalies: 4,  status: 'warning' as const },
  { name: 'NULL.REF',       bugs: 27, anomalies: 2,  status: 'ok'      as const },
  { name: 'PIXELS',         bugs: 41, anomalies: 9,  status: 'error'   as const },
  { name: 'LACE',           bugs: 44, anomalies: 2,  status: 'warning' as const },
];

const STATUS_COLORS = {
  ok:      { dot: 'bg-green-500', label: 'Conforme',     text: 'text-green-600' },
  warning: { dot: 'bg-amber-400', label: 'À surveiller', text: 'text-amber-600' },
  error:   { dot: 'bg-red-500',   label: 'Critique',     text: 'text-red-600'   },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SyncIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      className={`w-4 h-4 shrink-0 ${spinning ? 'animate-spin' : ''}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}
    >
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}

function KpiCard({
  label, value, sub, colorClass, borderClass, delay,
}: {
  label: string; value: string | number; sub: string;
  colorClass: string; borderClass: string; delay: string;
}) {
  return (
    <div className={`fade-up ${delay} bg-white rounded-2xl p-5 shadow-sm border ${borderClass} hover:shadow-md`}>
      <div className={`text-[11px] font-semibold uppercase tracking-wider mb-3 ${colorClass}`}>{label}</div>
      <div className={`text-4xl font-mono font-bold tracking-tight ${colorClass}`}>{value}</div>
      <div className={`text-xs mt-2 ${colorClass} opacity-70`}>{sub}</div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function Home() {
  const [syncing, setSyncing] = useState(false);
  const [lastSync] = useState('23/03/2026 — 09:30');

  const totalBugs    = TEAMS.reduce((s, t) => s + t.bugs, 0);
  const totalErrors  = TEAMS.reduce((s, t) => s + (t.status === 'error'   ? t.anomalies : 0), 0);
  const totalWarning = TEAMS.reduce((s, t) => s + (t.status === 'warning' ? t.anomalies : 0), 0);

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 2200);
  };

  const syncBtn = (
    <button
      onClick={handleSync}
      disabled={syncing}
      className={[
        'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white',
        syncing
          ? 'bg-blue-400 cursor-wait sync-pulsing'
          : 'bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/35',
      ].join(' ')}
    >
      <SyncIcon spinning={syncing} />
      {syncing ? 'Synchronisation…' : 'Synchroniser'}
    </button>
  );

  return (
    <Layout title="Tableau de bord" actions={syncBtn}>

      {/* Sprint banner */}
      <div className="fade-up mb-6 flex items-center gap-3 bg-blue-50/80 border border-blue-100 rounded-2xl px-5 py-3">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
        </span>
        <span className="text-sm text-blue-700 font-medium">Sprint actif :</span>
        <span className="text-sm font-mono font-bold text-blue-900">PI5-SP3</span>
        <span className="mx-1 text-blue-200">|</span>
        <span className="text-sm text-blue-500">Sync : {lastSync}</span>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4 mb-7">
        <KpiCard
          label="Bugs en cache" value={totalBugs} sub="8 équipes · PI5-SP3"
          colorClass="text-[#0e1a38]" borderClass="border-gray-100"
          delay="fade-up-1"
        />
        <KpiCard
          label="Anomalies — erreurs" value={totalErrors} sub="Action requise"
          colorClass="text-red-600" borderClass="border-red-100"
          delay="fade-up-2"
        />
        <KpiCard
          label="Avertissements" value={totalWarning} sub="À surveiller"
          colorClass="text-amber-600" borderClass="border-amber-100"
          delay="fade-up-3"
        />
        <KpiCard
          label="Taux de conformité" value="78 %" sub="↑ +3 pts vs sprint préc."
          colorClass="text-green-600" borderClass="border-green-100"
          delay="fade-up-4"
        />
      </div>

      {/* Team health table */}
      <div className="fade-up fade-up-4 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-bold text-[#0e1a38]">Santé par équipe</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Bugs ouverts + anomalies actives — PI5-SP3</p>
          </div>
          <Link
            to="/conformity"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            Voir toutes les anomalies →
          </Link>
        </div>

        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/60 border-b border-gray-100/80">
              {['Équipe', 'Bugs ouverts', 'Anomalies', 'Statut', 'Charge'].map((h, i) => (
                <th
                  key={h}
                  className={`px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 ${i === 0 ? 'text-left' : i < 3 ? 'text-right' : 'text-center'}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {TEAMS.map((team) => {
              const sc = STATUS_COLORS[team.status];
              return (
                <tr key={team.name} className="hover:bg-blue-50/20 group">
                  <td className="px-6 py-3.5">
                    <span className="text-[13px] font-mono font-semibold text-[#0e1a38]">{team.name}</span>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <span className="text-[13px] font-mono font-medium text-gray-700">{team.bugs}</span>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <span className={`text-[13px] font-mono font-bold ${sc.text}`}>{team.anomalies}</span>
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full
                      ${team.status === 'ok'      ? 'bg-green-50 text-green-700 border border-green-100' :
                        team.status === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                                    'bg-red-50 text-red-700 border border-red-100'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                      {sc.label}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700
                            ${team.status === 'ok' ? 'bg-green-500' : team.status === 'warning' ? 'bg-amber-400' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(100, (team.bugs / 50) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
