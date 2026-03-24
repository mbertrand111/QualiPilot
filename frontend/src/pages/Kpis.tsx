import { useState } from 'react';
import { Layout } from '../components/Layout';

// ─── Mock data ────────────────────────────────────────────────────────────────

const DEFECT_DEBT = [
  { team: 'LACE',          bugs: 44, color: '#F59E0B' },
  { team: 'PIXELS',        bugs: 41, color: '#EF4444' },
  { team: 'GO FAHST',      bugs: 35, color: '#EF4444' },
  { team: 'MELI MELO',     bugs: 31, color: '#F59E0B' },
  { team: 'COCO',          bugs: 28, color: '#3B82F6' },
  { team: 'NULL.REF',      bugs: 27, color: '#3B82F6' },
  { team: 'JURASSIC BACK', bugs: 22, color: '#10B981' },
  { team: 'MAGIC SYSTEM',  bugs: 19, color: '#10B981' },
];

const BACKLOG = [
  { period: 'PI3-SP1', created: 45, closed: 38 },
  { period: 'PI3-SP2', created: 52, closed: 47 },
  { period: 'PI4-SP1', created: 38, closed: 41 },
  { period: 'PI4-SP2', created: 44, closed: 39 },
  { period: 'PI4-SP3', created: 36, closed: 42 },
  { period: 'PI5-SP1', created: 41, closed: 38 },
  { period: 'PI5-SP2', created: 47, closed: 43 },
  { period: 'PI5-SP3', created: 33, closed: 28 },
];

const ANOMALY_COUNTS = [3, 8, 1, 5, 4, 2, 9, 2]; // matching DEFECT_DEBT order

const SUMMARY_PI5 = [
  { label: 'Bugs ouverts',    value: '247', sub: 'toutes équipes'         },
  { label: 'Fermés ce PI',    value: '156', sub: 'corrigés + autres'      },
  { label: 'Taux conformité', value: '78 %',  sub: '↑ +3 pts vs PI4'       },
  { label: 'Anomalies',       value: '52',  sub: '34 erreurs · 18 warnings' },
];

// ─── SVG Charts ───────────────────────────────────────────────────────────────

function HorizontalBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.max(4, (value / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-sm font-mono font-bold text-gray-700 w-7 text-right">{value}</span>
    </div>
  );
}

function BacklogChart() {
  const maxVal = Math.max(...BACKLOG.map(d => Math.max(d.created, d.closed)));
  const H  = 110;
  const BW = 13;
  const GAP = 5;
  const GROUP_GAP = 16;
  const GW = BW * 2 + GAP + GROUP_GAP;
  const W  = BACKLOG.length * GW + GROUP_GAP;

  return (
    <div className="overflow-x-auto -mx-1">
      <svg width={W} height={H + 28} className="min-w-full">
        {/* Gridlines */}
        {[0.25, 0.5, 0.75, 1].map(f => (
          <line
            key={f}
            x1={0} y1={H - f * H}
            x2={W} y2={H - f * H}
            stroke="#F3F4F6" strokeWidth={1}
          />
        ))}
        {/* Bars */}
        {BACKLOG.map((d, i) => {
          const x  = GROUP_GAP / 2 + i * GW;
          const ch = (d.created / maxVal) * H;
          const cl = (d.closed  / maxVal) * H;
          return (
            <g key={d.period}>
              <rect x={x}       y={H - ch} width={BW} height={ch} fill="#EF4444" fillOpacity={0.75} rx={3} />
              <rect x={x + BW + GAP} y={H - cl} width={BW} height={cl} fill="#10B981" fillOpacity={0.75} rx={3} />
              <text
                x={x + BW + GAP / 2}
                y={H + 18}
                textAnchor="middle"
                fontSize={9}
                fill="#9CA3AF"
                fontFamily="JetBrains Mono, monospace"
              >
                {d.period.replace('PI', 'P')}
              </text>
            </g>
          );
        })}
        <line x1={0} y1={H} x2={W} y2={H} stroke="#E5E7EB" strokeWidth={1} />
      </svg>
      <div className="flex items-center gap-5 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-red-400/80" />
          <span className="text-[11px] text-gray-500 font-medium">Créés</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-emerald-500/80" />
          <span className="text-[11px] text-gray-500 font-medium">Fermés</span>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PIS = ['Tous', 'PI3', 'PI4', 'PI5'];

export default function Kpis() {
  const [piFilter, setPiFilter] = useState('PI5');
  const maxBugs = DEFECT_DEBT[0].bugs; // already sorted desc

  return (
    <Layout title="KPIs Qualité">

      {/* PI filter */}
      <div className="fade-up flex items-center gap-3 mb-6">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">PI</span>
        <div className="flex gap-1.5">
          {PIS.map(pi => (
            <button
              key={pi}
              onClick={() => setPiFilter(pi)}
              className={[
                'px-3.5 py-1.5 rounded-xl text-[12px] font-semibold',
                piFilter === pi
                  ? 'bg-[#1e40af] text-white shadow-md shadow-blue-600/25'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-blue-300 hover:text-blue-600',
              ].join(' ')}
            >
              {pi}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">

        {/* Defect debt */}
        <div className="fade-up fade-up-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-[15px] font-bold text-[#0e1a38] mb-0.5">Defect Debt par équipe</h2>
          <p className="text-[11px] text-gray-400 mb-5">
            Bugs ouverts — {piFilter === 'Tous' ? "aujourd'hui" : piFilter}
          </p>
          <div className="space-y-3.5">
            {DEFECT_DEBT.map(d => (
              <div key={d.team}>
                <span className="text-[12px] font-mono font-semibold text-gray-600 block mb-1.5">{d.team}</span>
                <HorizontalBar value={d.bugs} max={maxBugs} color={d.color} />
              </div>
            ))}
          </div>
        </div>

        {/* Backlog evolution */}
        <div className="fade-up fade-up-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-[15px] font-bold text-[#0e1a38] mb-0.5">Évolution du backlog</h2>
          <p className="text-[11px] text-gray-400 mb-5">Bugs créés vs fermés par sprint</p>
          <BacklogChart />
        </div>

        {/* Sprint view */}
        <div className="fade-up fade-up-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-[15px] font-bold text-[#0e1a38] mb-0.5">Sprint en cours — PI5-SP3</h2>
          <p className="text-[11px] text-gray-400 mb-5">Anomalies actives par équipe</p>
          <div className="space-y-1.5">
            {DEFECT_DEBT.map((d, i) => {
              const anom  = ANOMALY_COUNTS[i];
              const ratio = anom / d.bugs;
              const color = ratio > 0.2 ? 'bg-red-500' : ratio > 0.1 ? 'bg-amber-400' : 'bg-green-500';
              const tc    = anom >= 7 ? 'text-red-600' : anom >= 3 ? 'text-amber-600' : 'text-green-600';
              return (
                <div key={d.team} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className="text-[12px] font-mono font-semibold text-gray-600 w-28 shrink-0">{d.team}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${color} transition-all duration-700`}
                      style={{ width: `${Math.min(100, ratio * 250)}%` }}
                    />
                  </div>
                  <span className={`text-[12px] font-mono font-bold w-5 text-right ${tc}`}>{anom}</span>
                  <span className="text-[10px] text-gray-400 w-20">anomalies</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary card */}
        <div className="fade-up fade-up-4 bg-gradient-to-br from-[#0e1a38] to-[#1e40af] rounded-2xl shadow-sm p-6 text-white">
          <h2 className="text-[15px] font-bold mb-5 text-white/90">Résumé {piFilter}</h2>
          <div className="grid grid-cols-2 gap-3">
            {SUMMARY_PI5.map(s => (
              <div key={s.label} className="bg-white/[0.09] rounded-xl p-4 hover:bg-white/[0.13]">
                <div className="text-[11px] font-semibold text-blue-200/80 mb-1">{s.label}</div>
                <div className="text-3xl font-mono font-bold text-white leading-none">{s.value}</div>
                <div className="text-[11px] text-blue-300/60 mt-2">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </Layout>
  );
}
