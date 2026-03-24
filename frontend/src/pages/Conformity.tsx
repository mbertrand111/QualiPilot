import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';

// ─── Mock data ────────────────────────────────────────────────────────────────

type Severity = 'error' | 'warning';

interface Violation {
  id: number;
  title: string;
  team: string;
  rule: string;
  severity: Severity;
  description: string;
  detected: string;
}

const VIOLATIONS: Violation[] = [
  { id: 15234, title: 'Crash au démarrage sur FAH_26.20',       team: 'PIXELS',       rule: 'PRIORITY_CHECK',                severity: 'error',   description: 'Priorité 3 — doit être 2',                                  detected: '23/03/2026' },
  { id: 15890, title: 'Export PDF ne fonctionne pas',            team: 'MAGIC SYSTEM', rule: 'VERSION_SOUHAITEE_CHECK',        severity: 'error',   description: 'Version souhaitée GC manquante',                            detected: '22/03/2026' },
  { id: 14567, title: 'Lenteur sur liste clients > 1 000',       team: 'GO FAHST',     rule: 'INTEGRATION_BUILD_NOT_EMPTIED', severity: 'warning', description: 'Bug actif avec Integration Build renseigné',                detected: '22/03/2026' },
  { id: 13456, title: 'Erreur 500 lors de la facturation',       team: 'PIXELS',       rule: 'INTEGRATION_BUILD_REQUIRED',    severity: 'error',   description: 'Bug fermé sans Integration Build valide',                   detected: '21/03/2026' },
  { id: 16001, title: 'Date de livraison incorrecte',            team: 'COCO',         rule: 'FAH_VERSION_REQUIRED',          severity: 'error',   description: 'Bug FAH sans version souhaitée FAH_xxx',                    detected: '21/03/2026' },
  { id: 15102, title: 'Doublon dans le référentiel articles',    team: 'NULL.REF',     rule: 'CLOSED_BUG_COHERENCE',          severity: 'warning', description: 'Bug fermé non-corrigé avec version souhaitée renseignée',  detected: '20/03/2026' },
  { id: 14789, title: 'Filtre par période ne fonctionne pas',    team: 'MELI MELO',    rule: 'PRIORITY_CHECK',                severity: 'error',   description: 'Priorité 1 — doit être 2',                                  detected: '20/03/2026' },
  { id: 15678, title: 'Import CSV bloqué sur certains fichiers', team: 'GO FAHST',     rule: 'VERSION_SOUHAITEE_CHECK',       severity: 'error',   description: 'Format version souhaitée invalide : "v14.2"',               detected: '19/03/2026' },
  { id: 14301, title: 'Rapport mensuel tronqué',                 team: 'MAGIC SYSTEM', rule: 'PRIORITY_CHECK',                severity: 'error',   description: 'Priorité 3 — doit être 2',                                  detected: '19/03/2026' },
  { id: 13987, title: 'Calcul TVA incorrect en mode multi-site', team: 'JURASSIC BACK',rule: 'INTEGRATION_BUILD_NOT_EMPTIED', severity: 'warning', description: 'Bug actif avec Integration Build renseigné',                detected: '18/03/2026' },
];

const TEAMS    = ['Toutes', 'COCO', 'GO FAHST', 'JURASSIC BACK', 'MAGIC SYSTEM', 'MELI MELO', 'NULL.REF', 'PIXELS', 'LACE'];
const RULES    = ['Toutes', 'PRIORITY_CHECK', 'VERSION_SOUHAITEE_CHECK', 'INTEGRATION_BUILD_REQUIRED', 'INTEGRATION_BUILD_NOT_EMPTIED', 'CLOSED_BUG_COHERENCE', 'FAH_VERSION_REQUIRED'];
const SEVS     = ['Toutes', 'Erreur', 'Avertissement'];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: Severity }) {
  return severity === 'error' ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
      Erreur
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
      Avertissement
    </span>
  );
}

function FilterSelect({
  label, value, options, onChange,
}: {
  label: string; value: string; options: string[]; onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="text-[13px] border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </label>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Conformity() {
  const [team, setTeam]     = useState('Toutes');
  const [rule, setRule]     = useState('Toutes');
  const [sev,  setSev]      = useState('Toutes');

  const filtered = VIOLATIONS.filter(v => {
    if (team !== 'Toutes' && v.team !== team)  return false;
    if (rule !== 'Toutes' && v.rule !== rule)  return false;
    if (sev  === 'Erreur'        && v.severity !== 'error')   return false;
    if (sev  === 'Avertissement' && v.severity !== 'warning') return false;
    return true;
  });

  const errors   = filtered.filter(v => v.severity === 'error').length;
  const warnings = filtered.filter(v => v.severity === 'warning').length;
  const hasFilters = team !== 'Toutes' || rule !== 'Toutes' || sev !== 'Toutes';

  return (
    <Layout title="Anomalies de conformité">

      {/* Summary row */}
      <div className="fade-up flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-2">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-sm font-semibold text-red-700">
            {errors} erreur{errors !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-sm font-semibold text-amber-700">
            {warnings} avertissement{warnings !== 1 ? 's' : ''}
          </span>
        </div>
        {filtered.length === 0 && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm font-semibold text-green-700">
              Aucune anomalie avec ces filtres ✓
            </span>
          </div>
        )}
      </div>

      {/* Filter bar */}
      <div className="fade-up fade-up-1 bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4 mb-5 flex items-center gap-5 flex-wrap">
        <FilterSelect label="Équipe"   value={team} options={TEAMS}  onChange={setTeam} />
        <FilterSelect label="Règle"    value={rule} options={RULES}  onChange={setRule} />
        <FilterSelect label="Sévérité" value={sev}  options={SEVS}   onChange={setSev}  />
        {hasFilters && (
          <button
            onClick={() => { setTeam('Toutes'); setRule('Toutes'); setSev('Toutes'); }}
            className="text-xs text-gray-400 hover:text-gray-700 underline underline-offset-2 ml-auto"
          >
            Réinitialiser les filtres
          </button>
        )}
      </div>

      {/* Table */}
      <div className="fade-up fade-up-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="text-5xl mb-4">✓</div>
            <div className="text-base font-semibold text-green-700 mb-1">Aucune anomalie</div>
            <div className="text-sm text-gray-400">Tous les bugs correspondent aux règles de conformité.</div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/60 border-b border-gray-100">
                {['Bug & description', 'Équipe', 'Règle', 'Sévérité', 'Détecté le', ''].map((h, i) => (
                  <th
                    key={h + i}
                    className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(v => (
                <tr key={v.id} className="hover:bg-blue-50/25 group cursor-pointer">
                  <td className="px-5 py-3.5 max-w-xs">
                    <div className="font-mono text-[11px] font-semibold text-gray-400 mb-0.5">#{v.id}</div>
                    <div className="text-[13px] font-semibold text-[#0e1a38] truncate">{v.title}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{v.description}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-[11px] font-mono font-semibold text-gray-600 bg-gray-100 rounded-lg px-2.5 py-1 whitespace-nowrap">
                      {v.team}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-[11px] font-mono text-blue-700 bg-blue-50 rounded-lg px-2.5 py-1 whitespace-nowrap">
                      {v.rule}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <SeverityBadge severity={v.severity} />
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs text-gray-400 font-mono">{v.detected}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      to={`/conformity/${v.id}`}
                      className="text-xs font-semibold text-blue-600 opacity-0 group-hover:opacity-100 hover:text-blue-800 whitespace-nowrap"
                    >
                      Corriger →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
