import { Layout } from '../components/Layout';

// ─── Mock data ────────────────────────────────────────────────────────────────

const SNAPSHOTS = [
  { date: '23/03/2026', sprint: 'PI5-SP3', totalBugs: 247, created: 33, closed: 28, violations: 52, conformity: 78 },
  { date: '16/03/2026', sprint: 'PI5-SP2', totalBugs: 242, created: 47, closed: 43, violations: 61, conformity: 75 },
  { date: '09/03/2026', sprint: 'PI5-SP1', totalBugs: 238, created: 41, closed: 38, violations: 68, conformity: 71 },
  { date: '02/03/2026', sprint: 'PI5-IP',  totalBugs: 235, created: 12, closed: 18, violations: 55, conformity: 77 },
  { date: '23/02/2026', sprint: 'PI4-SP4', totalBugs: 241, created: 36, closed: 42, violations: 49, conformity: 80 },
  { date: '16/02/2026', sprint: 'PI4-SP3', totalBugs: 247, created: 44, closed: 39, violations: 63, conformity: 74 },
  { date: '09/02/2026', sprint: 'PI4-SP2', totalBugs: 242, created: 52, closed: 47, violations: 71, conformity: 71 },
  { date: '02/02/2026', sprint: 'PI4-SP1', totalBugs: 237, created: 38, closed: 41, violations: 58, conformity: 76 },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

function ConformityBar({ value }: { value: number }) {
  const color = value >= 80 ? 'bg-green-500' : value >= 70 ? 'bg-amber-400' : 'bg-red-500';
  const text  = value >= 80 ? 'text-green-600' : value >= 70 ? 'text-amber-600' : 'text-red-600';
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

  return (
    <Layout title="Historique des snapshots">

      {/* Info banner */}
      <div className="fade-up flex items-start gap-4 mb-6">
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-[#0e1a38]">
              {SNAPSHOTS.length} snapshots — automatiques chaque semaine
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              Évolution sur 8 semaines · Backlog {trend > 0 ? `+${trend}` : trend} bugs vs il y a 8 semaines
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

      {/* Table */}
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

      <p className="fade-up mt-4 text-[11px] text-gray-400 text-center">
        Snapshots générés automatiquement chaque semaine par le scheduler — aucune action manuelle requise.
      </p>
    </Layout>
  );
}
