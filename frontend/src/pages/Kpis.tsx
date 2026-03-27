import { useState } from 'react';
import { Layout } from '../components/Layout';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, AreaChart, Area, PieChart, Pie, ReferenceLine,
  ResponsiveContainer, Legend,
} from 'recharts';

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'defect-debt',   label: 'Defect Debt'        },
  { key: 'backlog-evo',   label: 'Évolution backlog'   },
  { key: 'point-backlog', label: 'Point backlog'       },
  { key: 'closed-by-pi', label: 'Bugs fermés par PI'  },
  { key: 'team-backlogs', label: 'Backlogs équipes'   },
] as const;
type TabKey = typeof TABS[number]['key'];

// ─── Colors ───────────────────────────────────────────────────────────────────

const C = {
  live:            '#EC4899',
  livePatch:       '#F9A8D4',
  onpremise:       '#6B7280',
  onpremisePatch:  '#9CA3AF',
  horsVersion:     '#7C3AED',
  nonCategorise:   '#1E3A5F',
  stateNew:        '#1D4ED8',
  stateActive:     '#D97706',
  stateResolved:   '#7C3AED',
  teams: {
    'COCO':          '#10B981',
    'GO FAHST':      '#3B82F6',
    'JURASSIC BACK': '#EF4444',
    'MAGIC SYSTEM':  '#7C3AED',
    'MELI MELO':     '#EC4899',
    'NULL.REF':      '#F59E0B',
    'PIXELS':        '#14B8A6',
    'LACE':          '#6366F1',
  } as Record<string, string>,
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

// Tab 1 — Defect Debt (créés - fermés par PI)
const DD_RAW = [
  { pi: '24-25 PI4', global:  120, live:  55, onpremise: -10, hors:   2, endGlobal: 340, endLive:  85, endOnpremise: 230, endHors: 25 },
  { pi: '24-25 PI5', global: -180, live: -45, onpremise:  -8, hors:  -3, endGlobal: 295, endLive:  65, endOnpremise: 210, endHors: 20 },
  { pi: '24-25 PI6', global: -290, live: -80, onpremise:   5, hors:   5, endGlobal: 420, endLive: 120, endOnpremise: 270, endHors: 30 },
  { pi: '25-26 PI1', global:  180, live:  60, onpremise:  35, hors:   4, endGlobal: 265, endLive: 100, endOnpremise: 140, endHors: 25 },
  { pi: '25-26 PI2', global: -160, live: -75, onpremise: -22, hors:  -5, endGlobal: 220, endLive:  95, endOnpremise: 108, endHors: 17 },
  { pi: '25-26 PI3', global:   35, live:  12, onpremise:   8, hors:   1, endGlobal: 247, endLive: 107, endOnpremise: 122, endHors: 18 },
  { pi: '25-26 PI4', global:   48, live:  18, onpremise:  10, hors:   2, endGlobal: 252, endLive: 110, endOnpremise: 124, endHors: 18 },
];

// Tab 2 — Backlog evolution (snapshots mensuels)
const BACKLOG_EVO = [
  { label: 'Avr 25', total: 335, live: 62, onpremise: 254, hors: 19 },
  { label: 'Mai 25', total: 340, live: 65, onpremise: 256, hors: 19 },
  { label: 'Jun 25', total: 347, live: 68, onpremise: 260, hors: 19 },
  { label: 'Jul 25', total: 410, live: 72, onpremise: 318, hors: 20 },
  { label: 'Aoû 25', total: 265, live: 88, onpremise: 157, hors: 20 },
  { label: 'Sep 25', total: 248, live: 92, onpremise: 138, hors: 18 },
  { label: 'Oct 25', total: 242, live: 95, onpremise: 130, hors: 17 },
  { label: 'Nov 25', total: 228, live: 92, onpremise: 119, hors: 17 },
  { label: 'Déc 25', total: 220, live: 90, onpremise: 113, hors: 17 },
  { label: 'Jan 26', total: 230, live: 95, onpremise: 117, hors: 18 },
  { label: 'Fév 26', total: 242, live: 100, onpremise: 123, hors: 19 },
  { label: 'Mar 26', total: 252, live: 107, onpremise: 127, hors: 18 },
];

// Tab 3 — Point backlog (données par version)
const VERSIONS_LIST = ['FAH_26.20', 'FAH_26.30', '13.87.200', '13.87.250', 'Non concerné'];

const POINT_BACKLOG_BY_VERSION: Record<string, {
  byState: { name: string; value: number; color: string }[];
  byTeam:  { name: string; value: number; color: string }[];
  bugs: { id: number; title: string; state: string; team: string; sprint: string }[];
}> = {
  'FAH_26.20': {
    byState: [
      { name: 'New',      value: 42, color: C.stateNew      },
      { name: 'Active',   value: 15, color: C.stateActive   },
      { name: 'Resolved', value:  3, color: C.stateResolved },
    ],
    byTeam: [
      { name: 'COCO',          value:  8, color: C.teams['COCO']          },
      { name: 'GO FAHST',      value:  9, color: C.teams['GO FAHST']      },
      { name: 'JURASSIC BACK', value:  8, color: C.teams['JURASSIC BACK'] },
      { name: 'LACE',          value:  4, color: C.teams['LACE']          },
      { name: 'MAGIC SYSTEM',  value:  1, color: C.teams['MAGIC SYSTEM']  },
      { name: 'MELI MELO',     value:  6, color: C.teams['MELI MELO']     },
      { name: 'NULL.REF',      value:  9, color: C.teams['NULL.REF']      },
      { name: 'PIXELS',        value:  7, color: C.teams['PIXELS']        },
      { name: 'À corriger',    value:  8, color: '#D1D5DB'                },
    ],
    bugs: [
      { id: 190961, title: '[CI] 3 tests incompatibles avec CO 25.11.081',                    state: 'New',      team: 'COCO',          sprint: 'PI4' },
      { id: 171163, title: '[CO] Nombre de requête anormalement élevé lors de la comptabilisation', state: 'New', team: 'GO FAHST',   sprint: '2025-2026' },
      { id: 227933, title: '[CO] Plante en essayant de se connecter en compta',               state: 'Active',   team: 'NULL.REF',      sprint: 'PI2-SP1' },
      { id: 266738, title: '[Embedded] Historique client - L\'annulation d\'affectation',     state: 'New',      team: 'PIXELS',        sprint: 'PI4-SP4' },
      { id: 145490, title: '[IQS] Enregistrement d\'une facture : dégradation des performances', state: 'New',   team: 'À corriger',    sprint: '2025-2026' },
      { id: 183440, title: '[IW] - LIVE - Le correcteur d\'orthographe n\'est pas opérationnel', state: 'New',  team: 'GO FAHST',      sprint: '2025-2026' },
      { id: 132834, title: '[IW] .NetCore - Appels aux API REST - plante de la lecture',      state: 'Active',   team: 'LACE',          sprint: '2025-2026' },
      { id: 200628, title: '[IW] [GCLive] Quids pour Stimulsoft : LA fonction Moyenne pondérée', state: 'New',  team: 'JURASSIC BACK', sprint: 'PI5' },
    ],
  },
  'FAH_26.30': {
    byState: [
      { name: 'New',    value: 28, color: C.stateNew    },
      { name: 'Active', value:  8, color: C.stateActive },
    ],
    byTeam: [
      { name: 'GO FAHST',      value: 10, color: C.teams['GO FAHST']      },
      { name: 'MAGIC SYSTEM',  value:  8, color: C.teams['MAGIC SYSTEM']  },
      { name: 'MELI MELO',     value:  7, color: C.teams['MELI MELO']     },
      { name: 'NULL.REF',      value:  6, color: C.teams['NULL.REF']      },
      { name: 'PIXELS',        value:  5, color: C.teams['PIXELS']        },
    ],
    bugs: [
      { id: 249783, title: '[Embedded] Problème d\'affichage du scroll dans le tableau', state: 'New',    team: 'MAGIC SYSTEM', sprint: 'PI5' },
      { id: 266635, title: '[Documents] - Factures - Comptabilisation plante',           state: 'Active', team: 'MELI MELO',    sprint: 'PI5-SP1' },
    ],
  },
  '13.87.200': {
    byState: [
      { name: 'New',      value: 18, color: C.stateNew      },
      { name: 'Active',   value: 12, color: C.stateActive   },
      { name: 'Resolved', value:  5, color: C.stateResolved },
    ],
    byTeam: [
      { name: 'MAGIC SYSTEM',  value: 12, color: C.teams['MAGIC SYSTEM']  },
      { name: 'COCO',          value:  8, color: C.teams['COCO']          },
      { name: 'JURASSIC BACK', value:  8, color: C.teams['JURASSIC BACK'] },
      { name: 'À corriger',    value:  7, color: '#D1D5DB'                },
    ],
    bugs: [
      { id: 206120, title: '[13.8X] La purge sur un gros dossier provoque une erreur', state: 'Active', team: 'MAGIC SYSTEM', sprint: 'PI4' },
    ],
  },
  '13.87.250': {
    byState: [
      { name: 'New',    value: 10, color: C.stateNew    },
      { name: 'Active', value:  5, color: C.stateActive },
    ],
    byTeam: [
      { name: 'MAGIC SYSTEM', value: 9, color: C.teams['MAGIC SYSTEM'] },
      { name: 'MELI MELO',    value: 4, color: C.teams['MELI MELO']    },
      { name: 'LACE',         value: 2, color: C.teams['LACE']         },
    ],
    bugs: [],
  },
  'Non concerné': {
    byState: [
      { name: 'New',    value: 14, color: C.stateNew    },
      { name: 'Active', value:  8, color: C.stateActive },
    ],
    byTeam: [
      { name: 'GO FAHST', value: 8, color: C.teams['GO FAHST'] },
      { name: 'PIXELS',   value: 6, color: C.teams['PIXELS']   },
      { name: 'LACE',     value: 5, color: C.teams['LACE']     },
      { name: 'COCO',     value: 3, color: C.teams['COCO']      },
    ],
    bugs: [
      { id: 97659, title: '[Délégation IW] Ajouter une étape "Configure" sur les Modules avant OnInitialized', state: 'New', team: 'GO FAHST', sprint: 'PI4' },
    ],
  },
};

// Tab 4 — Bugs fermés par PI
const CLOSED_PRODUIT = [
  { pi: '24-25 PI6', live: 68, livePatch: 28, onpremise: 48, onpremisePatch: 0,  horsVersion: 0, nonCategorise: 30, total: 174 },
  { pi: '25-26 PI1', live: 150, livePatch: 0,  onpremise: 35, onpremisePatch: 12, horsVersion: 0, nonCategorise: 1,  total: 198 },
  { pi: '25-26 PI2', live: 75,  livePatch: 10, onpremise: 22, onpremisePatch: 5,  horsVersion: 0, nonCategorise: 4,  total: 116 },
  { pi: '25-26 PI3', live: 70,  livePatch: 5,  onpremise: 47, onpremisePatch: 7,  horsVersion: 0, nonCategorise: 2,  total: 131 },
  { pi: '25-26 PI4', live: 70,  livePatch: 20, onpremise: 17, onpremisePatch: 22, horsVersion: 1, nonCategorise: 5,  total: 135 },
];
const CLOSED_EQUIPE = [
  { pi: '24-25 PI6', COCO: 22, 'GO FAHST': 12, 'JURASSIC BACK': 14, 'MAGIC SYSTEM': 97, 'MELI MELO': 15, 'NULL.REF': 0,  PIXELS: 8,  LACE: 6,  total: 174 },
  { pi: '25-26 PI1', COCO: 19, 'GO FAHST': 16, 'JURASSIC BACK': 55, 'MAGIC SYSTEM': 47, 'MELI MELO': 31, 'NULL.REF': 4,  PIXELS: 26, LACE: 0,  total: 198 },
  { pi: '25-26 PI2', COCO: 15, 'GO FAHST': 16, 'JURASSIC BACK': 30, 'MAGIC SYSTEM': 18, 'MELI MELO': 18, 'NULL.REF': 6,  PIXELS: 8,  LACE: 5,  total: 116 },
  { pi: '25-26 PI3', COCO: 11, 'GO FAHST': 14, 'JURASSIC BACK': 47, 'MAGIC SYSTEM': 32, 'MELI MELO': 10, 'NULL.REF': 14, PIXELS: 15, LACE: 0,  total: 131 },
  { pi: '25-26 PI4', COCO: 11, 'GO FAHST': 12, 'JURASSIC BACK': 36, 'MAGIC SYSTEM': 36, 'MELI MELO': 12, 'NULL.REF': 3,  PIXELS: 24, LACE: 1,  total: 135 },
];

// Tab 5 — Backlogs équipes (⚠️ objectifs à configurer dans Paramètres)
interface TeamBacklog {
  team:       string;
  objective:  number; // bugs GC max en fin de sprint
  gcBugs:     number; // bugs GC non fermés (comptent dans l'objectif)
  newBugs:    number;
  activeBugs: number;
  coBugs:     number; // [CO] — ne comptent pas
  iwBugs:     number; // [IW] — ne comptent pas
  topVersions: { version: string; count: number }[];
}
const TEAM_BACKLOGS: TeamBacklog[] = [
  { team: 'COCO',          objective:  8, gcBugs:  7, newBugs:  5, activeBugs: 2, coBugs: 1, iwBugs: 1, topVersions: [{ version: 'FAH_26.20', count: 4 }, { version: 'FAH_26.30', count: 2 }, { version: '-', count: 1 }] },
  { team: 'GO FAHST',      objective:  5, gcBugs:  6, newBugs:  4, activeBugs: 2, coBugs: 2, iwBugs: 3, topVersions: [{ version: 'FAH_26.20', count: 3 }, { version: 'FAH_26.30', count: 2 }, { version: 'FAH_26.10', count: 1 }] },
  { team: 'JURASSIC BACK', objective:  8, gcBugs:  6, newBugs:  5, activeBugs: 1, coBugs: 0, iwBugs: 1, topVersions: [{ version: 'FAH_26.20', count: 3 }, { version: '13.87.200', count: 2 }, { version: 'FAH_26.30', count: 1 }] },
  { team: 'MAGIC SYSTEM',  objective: 20, gcBugs: 18, newBugs: 13, activeBugs: 5, coBugs: 1, iwBugs: 0, topVersions: [{ version: '13.87.250', count: 8 }, { version: '13.87.200', count: 6 }, { version: 'FAH_26.20', count: 3 }] },
  { team: 'MELI MELO',     objective:  8, gcBugs:  9, newBugs:  6, activeBugs: 3, coBugs: 2, iwBugs: 1, topVersions: [{ version: 'FAH_26.20', count: 5 }, { version: 'FAH_26.30', count: 3 }, { version: '-', count: 1 }] },
  { team: 'NULL.REF',      objective: 10, gcBugs: 10, newBugs:  7, activeBugs: 3, coBugs: 1, iwBugs: 1, topVersions: [{ version: 'FAH_26.20', count: 5 }, { version: 'FAH_26.10', count: 3 }, { version: 'FAH_26.30', count: 2 }] },
  { team: 'PIXELS',        objective:  7, gcBugs:  5, newBugs:  4, activeBugs: 1, coBugs: 1, iwBugs: 1, topVersions: [{ version: 'FAH_26.20', count: 3 }, { version: 'FAH_26.30', count: 1 }, { version: '-', count: 1 }] },
  { team: 'LACE',          objective: 10, gcBugs:  8, newBugs:  6, activeBugs: 2, coBugs: 0, iwBugs: 1, topVersions: [{ version: 'FAH_26.20', count: 4 }, { version: 'FAH_26.30', count: 3 }, { version: '13.87.200', count: 1 }] },
];

// ─── Shared components ────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-bold text-[#0e1a38] uppercase tracking-wide mb-4">{children}</h2>;
}

function tooltipStyle() {
  return { fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' };
}

// ─── Tab 1 : Defect Debt ──────────────────────────────────────────────────────

interface DebtChartRow { pi: string; debt: number; endBugs: number }

function DebtChart({ title, data }: { title: string; data: DebtChartRow[] }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-3">{title}</div>
      <ResponsiveContainer width="100%" height={210}>
        <ComposedChart data={data} margin={{ top: 5, right: 30, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis dataKey="pi" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="left"  tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle()} />
          <ReferenceLine yAxisId="left" y={0} stroke="#d1d5db" />
          <Bar yAxisId="left" dataKey="debt" name="Defect Debt" maxBarSize={44} radius={[3, 3, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.debt > 0 ? '#EF4444' : '#22C55E'} fillOpacity={0.85} />
            ))}
          </Bar>
          <Line yAxisId="right" type="monotone" dataKey="endBugs" name="Bugs fin PI"
            stroke="#c084fc" strokeWidth={1.5} dot={{ r: 3, fill: '#c084fc', strokeWidth: 0 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function DefectDebtTab() {
  const [selectedPis, setSelectedPis] = useState<Set<string>>(new Set(DD_RAW.map(d => d.pi)));
  const allPis = DD_RAW.map(d => d.pi);
  const filtered = DD_RAW.filter(d => selectedPis.has(d.pi));

  const globalData  = filtered.map(d => ({ pi: d.pi, debt: d.global,     endBugs: d.endGlobal      }));
  const liveData    = filtered.map(d => ({ pi: d.pi, debt: d.live,       endBugs: d.endLive        }));
  const onpremData  = filtered.map(d => ({ pi: d.pi, debt: d.onpremise,  endBugs: d.endOnpremise   }));
  const horsData    = filtered.map(d => ({ pi: d.pi, debt: d.hors,       endBugs: d.endHors        }));

  function togglePi(pi: string) {
    setSelectedPis(prev => {
      const next = new Set(prev);
      if (next.has(pi)) { if (next.size > 1) next.delete(pi); }
      else next.add(pi);
      return next;
    });
  }

  return (
    <div>
      {/* PI filter */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {allPis.map(pi => (
          <button
            key={pi}
            onClick={() => togglePi(pi)}
            className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
              selectedPis.has(pi)
                ? 'bg-[#1E40AF] text-white border-[#1E40AF]'
                : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
            }`}
          >{pi}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <DebtChart title="Global" data={globalData} />
        <DebtChart title="Live (FAH)" data={liveData} />
        <DebtChart title="OnPremise (13.8x)" data={onpremData} />
        <DebtChart title="Hors version" data={horsData} />
      </div>

      <div className="flex items-center gap-4 mt-3 text-[11px] text-gray-400">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500" /> Dette qui diminue (fermés &gt; créés)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500" /> Dette qui augmente (créés &gt; fermés)</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-6 border-t-2 border-purple-400" /> Bugs ouverts fin PI</span>
      </div>
    </div>
  );
}

// ─── Tab 2 : Évolution backlog ────────────────────────────────────────────────

function BacklogEvoTab() {
  return (
    <div>
      <SectionTitle>Évolution du backlog de bugs</SectionTitle>
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={BACKLOG_EVO} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="gradTotal"    x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#1E40AF" stopOpacity={0.15} /><stop offset="95%" stopColor="#1E40AF" stopOpacity={0} /></linearGradient>
              <linearGradient id="gradLive"     x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor={C.live}       stopOpacity={0.3}  /><stop offset="95%" stopColor={C.live}       stopOpacity={0} /></linearGradient>
              <linearGradient id="gradOnprem"   x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor={C.onpremise}  stopOpacity={0.3}  /><stop offset="95%" stopColor={C.onpremise}  stopOpacity={0} /></linearGradient>
              <linearGradient id="gradHors"     x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor={C.horsVersion} stopOpacity={0.3} /><stop offset="95%" stopColor={C.horsVersion} stopOpacity={0} /></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle()} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
            <Area type="monotone" dataKey="total"     name="Total"        stroke="#1E40AF"      strokeWidth={2}   fill="url(#gradTotal)"  />
            <Area type="monotone" dataKey="onpremise" name="OnPremise"    stroke={C.onpremise}  strokeWidth={1.5} fill="url(#gradOnprem)" />
            <Area type="monotone" dataKey="live"      name="Live"         stroke={C.live}       strokeWidth={1.5} fill="url(#gradLive)"   />
            <Area type="monotone" dataKey="hors"      name="Hors version" stroke={C.horsVersion} strokeWidth={1.5} fill="url(#gradHors)"  />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Tab 3 : Point backlog ────────────────────────────────────────────────────

function MiniPie({ data, title }: { data: { name: string; value: number; color: string }[]; title: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex-1 bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">{title}</div>
      <div className="relative">
        <ResponsiveContainer width="100%" height={170}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={52} outerRadius={72} dataKey="value" paddingAngle={2}>
              {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle()} formatter={(v) => [`${v} bugs`]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-2xl font-mono font-bold text-[#0e1a38]">{total}</span>
        </div>
      </div>
      <div className="mt-2 space-y-1">
        {data.map(d => (
          <div key={d.name} className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              <span className="text-gray-600">{d.name}</span>
            </span>
            <span className="font-mono text-gray-600">{d.value} <span className="text-gray-400">({Math.round((d.value / total) * 100)}%)</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

const STATE_BADGE: Record<string, string> = {
  New:      'bg-blue-50 text-blue-700 border-blue-200',
  Active:   'bg-amber-50 text-amber-700 border-amber-200',
  Resolved: 'bg-violet-50 text-violet-700 border-violet-200',
  Closed:   'bg-gray-100 text-gray-500 border-gray-200',
};

function PointBacklogTab() {
  const [version, setVersion] = useState('FAH_26.20');
  const data = POINT_BACKLOG_BY_VERSION[version];
  if (!data) return null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <span className="text-sm text-gray-500">Version souhaitée :</span>
        <select
          value={version}
          onChange={e => setVersion(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-[#0e1a38] font-medium focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          {VERSIONS_LIST.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <span className="text-xs text-gray-400 ml-auto">
          {data.byState.reduce((s, d) => s + d.value, 0)} bugs au total
        </span>
      </div>

      <div className="flex gap-4 mb-5">
        <MiniPie data={data.byState} title="Par état" />
        <MiniPie data={data.byTeam}  title="Par équipe" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 w-16">ID</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Titre</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 w-24">État</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 w-32">Équipe</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 w-28">Sprint</th>
            </tr>
          </thead>
          <tbody>
            {data.bugs.map(bug => (
              <tr key={bug.id} className="border-b border-gray-50 hover:bg-blue-50/40 transition-colors">
                <td className="px-4 py-2 font-mono text-gray-400">{bug.id}</td>
                <td className="px-4 py-2 text-gray-700 truncate max-w-0" style={{ maxWidth: 400 }}>
                  <span title={bug.title}>{bug.title}</span>
                </td>
                <td className="px-4 py-2">
                  <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border ${STATE_BADGE[bug.state] ?? 'bg-gray-50 text-gray-500'}`}>
                    {bug.state}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-600">{bug.team}</td>
                <td className="px-4 py-2 font-mono text-gray-400 text-[10px]">{bug.sprint}</td>
              </tr>
            ))}
            {data.bugs.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-xs">Aucun bug à afficher</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab 4 : Bugs fermés par PI ───────────────────────────────────────────────

const TEAMS_LIST = ['COCO', 'GO FAHST', 'JURASSIC BACK', 'MAGIC SYSTEM', 'MELI MELO', 'NULL.REF', 'PIXELS', 'LACE'];

function ClosedByPiTab() {
  const [view, setView] = useState<'produit' | 'equipe'>('produit');

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <SectionTitle>Répartition des bugs fermés par PI</SectionTitle>
        <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs">
          {(['produit', 'equipe'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 font-medium transition-colors ${
                view === v ? 'bg-[#1E40AF] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >{v === 'produit' ? 'Par produit' : 'Par équipe'}</button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <ResponsiveContainer width="100%" height={300}>
          {view === 'produit' ? (
            <ComposedChart data={CLOSED_PRODUIT} margin={{ top: 5, right: 30, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="pi" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle()} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
              <Bar dataKey="live"           name="Live"              fill={C.live}           maxBarSize={18} radius={[2,2,0,0]} />
              <Bar dataKey="livePatch"      name="Live Patch"        fill={C.livePatch}      maxBarSize={18} radius={[2,2,0,0]} />
              <Bar dataKey="onpremise"      name="OnPremise"         fill={C.onpremise}      maxBarSize={18} radius={[2,2,0,0]} />
              <Bar dataKey="onpremisePatch" name="OnPremise Patch"   fill={C.onpremisePatch} maxBarSize={18} radius={[2,2,0,0]} />
              <Bar dataKey="horsVersion"    name="Hors version"      fill={C.horsVersion}    maxBarSize={18} radius={[2,2,0,0]} />
              <Bar dataKey="nonCategorise"  name="Non catégorisé"    fill={C.nonCategorise}  maxBarSize={18} radius={[2,2,0,0]} />
              <Line type="monotone" dataKey="total" name="Total" stroke="#FCD34D" strokeWidth={2} strokeDasharray="5 3"
                dot={{ r: 4, fill: '#FCD34D', strokeWidth: 0 }} />
            </ComposedChart>
          ) : (
            <ComposedChart data={CLOSED_EQUIPE} margin={{ top: 5, right: 30, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="pi" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle()} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
              {TEAMS_LIST.map(t => (
                <Bar key={t} dataKey={t} name={t} fill={C.teams[t]} maxBarSize={14} radius={[2,2,0,0]} />
              ))}
              <Line type="monotone" dataKey="total" name="Total" stroke="#FCD34D" strokeWidth={2} strokeDasharray="5 3"
                dot={{ r: 4, fill: '#FCD34D', strokeWidth: 0 }} />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Tab 5 : Backlogs équipes ─────────────────────────────────────────────────

function TeamBacklogCard({ t }: { t: TeamBacklog }) {
  const pct    = Math.round((t.gcBugs / t.objective) * 100);
  const over   = pct >= 100;
  const warn   = pct >= 80 && !over;
  const barCls = over ? 'bg-red-500' : warn ? 'bg-amber-400' : 'bg-green-500';
  const cntCls = over ? 'text-red-600' : warn ? 'text-amber-600' : 'text-green-600';

  return (
    <div className={`bg-white rounded-xl p-4 border shadow-sm transition-shadow hover:shadow-md ${
      over ? 'border-red-100' : warn ? 'border-amber-100' : 'border-gray-100'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-bold text-[#0e1a38]">{t.team}</div>
        <div className={`text-xs font-mono font-bold ${cntCls}`}>
          {t.gcBugs} / {t.objective}
          {over && <span className="ml-1 text-[10px] bg-red-100 text-red-600 px-1 rounded">DÉPASSÉ</span>}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
        <div className={`h-full rounded-full ${barCls}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>

      {/* State badges + CO/IW */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-md">New {t.newBugs}</span>
        <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-md">Active {t.activeBugs}</span>
        {(t.coBugs + t.iwBugs) > 0 && (
          <span className="text-[10px] bg-gray-50 text-gray-400 border border-gray-200 px-2 py-0.5 rounded-md" title="CO/IW ne comptent pas dans l'objectif">
            +{t.coBugs + t.iwBugs} CO/IW
          </span>
        )}
      </div>

      {/* Top versions mini-bars */}
      <div className="space-y-1.5">
        {t.topVersions.map(v => (
          <div key={v.version} className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 font-mono w-24 truncate shrink-0">{v.version || '(vide)'}</span>
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-200 rounded-full" style={{ width: `${Math.round((v.count / t.gcBugs) * 100)}%` }} />
            </div>
            <span className="text-[10px] font-mono text-gray-500 w-4 text-right shrink-0">{v.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamBacklogsTab() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <SectionTitle>Backlogs équipes — sprint en cours</SectionTitle>
        <span className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">
          ⚠ Objectifs à configurer dans Paramètres
        </span>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {TEAM_BACKLOGS.map(t => <TeamBacklogCard key={t.team} t={t} />)}
      </div>
      <p className="text-[11px] text-gray-400 mt-3">
        Bugs GC uniquement (hors [CO] et [IW]) — vérifié le dernier jeudi avant fin de sprint.
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Kpis() {
  const [tab, setTab] = useState<TabKey>('defect-debt');

  return (
    <Layout>
      <div className="flex-1 overflow-auto bg-gray-50/50">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-8 pt-6 pb-0 sticky top-0 z-10">
          <h1 className="text-lg font-bold text-[#0e1a38] mb-4">KPIs & Suivi qualité</h1>
          {/* Tab bar */}
          <div className="flex gap-0.5">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  tab === t.key
                    ? 'border-[#1E40AF] text-[#1E40AF]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
                }`}
              >{t.label}</button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6">
          <div className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-5 inline-flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
            Données mockées — branchement sur données réelles à venir
          </div>

          {tab === 'defect-debt'   && <DefectDebtTab />}
          {tab === 'backlog-evo'   && <BacklogEvoTab />}
          {tab === 'point-backlog' && <PointBacklogTab />}
          {tab === 'closed-by-pi' && <ClosedByPiTab />}
          {tab === 'team-backlogs' && <TeamBacklogsTab />}
        </div>
      </div>
    </Layout>
  );
}
