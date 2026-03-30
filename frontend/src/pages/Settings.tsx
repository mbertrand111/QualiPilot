import { Layout } from '../components/Layout';

const RULES = [
  { code: 'PRIORITY_CHECK',                desc: 'Priority doit être 2',                                                      severity: 'error' as const, active: true },
  { code: 'INTEGRATION_BUILD_NOT_EMPTIED', desc: 'Bugs New/Active doivent avoir Integration Build vide',                      severity: 'error' as const, active: true },
  { code: 'TRIAGE_AREA_CHECK',             desc: 'Cohérence zone triage : bugs fermés, sous-classement et produit correct',   severity: 'error' as const, active: true },
  { code: 'BUGS_TRANSVERSE_AREA',          desc: 'Bug non Closed dans zone transverse (Etats/GC/Hors-production/Maintenances/Performance/Securite/Tests auto)', severity: 'error' as const, active: true },
  { code: 'FAH_VERSION_REQUIRED',          desc: 'Bugs LIVE (found_in ≥ 14.xx) doivent avoir version souhaitée avec FAH_',   severity: 'error' as const, active: true },
  { code: 'CLOSED_BUG_COHERENCE',          desc: 'Bug non-corrigé (Closed) → version & build doivent être "-"',              severity: 'error' as const, active: true },
  { code: 'VERSION_CHECK',                 desc: 'Format version souhaitée valide selon le type de bug (FAH_ / 12. / 13.8)', severity: 'error' as const, active: true },
  { code: 'BUILD_CHECK',                   desc: 'Bugs Closed/Resolved doivent avoir un build valide dans la liste connue',   severity: 'error' as const, active: true },
  { code: 'VERSION_BUILD_COHERENCE',       desc: 'Cohérence version souhaitée / build (Non concerné, format Patch)',         severity: 'error' as const, active: true },
];

const ADO_CONFIG = [
  { label: 'Organisation ADO',  value: 'isagri',                              env: 'ADO_ORG'      },
  { label: 'Projet ADO',        value: 'Isagri_Dev_GC_GestionCommerciale',    env: 'ADO_PROJECT'  },
  { label: 'Token PAT',         value: '••••••••••••••••••••••••',             env: 'ADO_PAT'      },
  { label: 'Base URL',          value: 'https://dev.azure.com',               env: 'ADO_BASE_URL' },
];

const TEAMS = ['COCO', 'GO FAHST', 'JURASSIC BACK', 'MAGIC SYSTEM', 'MELI MELO', 'NULL.REF', 'PIXELS', 'LACE'];

export default function Settings() {
  return (
    <Layout title="Paramètres">
      <div className="max-w-2xl space-y-5">

        {/* ADO Connection */}
        <div className="fade-up bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-[15px] font-bold text-[#0e1a38] mb-5">Connexion Azure DevOps</h2>
          <div className="divide-y divide-gray-50">

            {/* Status */}
            <div className="flex items-center justify-between pb-4">
              <div>
                <div className="text-sm font-semibold text-gray-700">Statut de la connexion</div>
                <div className="text-xs text-gray-400 mt-0.5">Authentification PAT — backend uniquement</div>
              </div>
              <div className="flex items-center gap-2 bg-green-50 border border-green-100 text-green-700 px-3 py-1.5 rounded-full text-xs font-semibold">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                </span>
                Connecté
              </div>
            </div>

            {/* Config rows */}
            {ADO_CONFIG.map(({ label, value, env }) => (
              <div key={label} className="flex items-center justify-between py-3.5">
                <div>
                  <div className="text-sm font-semibold text-gray-700">{label}</div>
                  <div className="text-xs font-mono text-gray-400 mt-0.5">{env}</div>
                </div>
                <div className="text-[12px] font-mono text-gray-500 max-w-[260px] truncate text-right">{value}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 bg-blue-50/60 border border-blue-100 rounded-xl px-4 py-3 text-[11px] text-blue-700 leading-relaxed">
            Pour modifier ces paramètres, éditez{' '}
            <code className="font-mono font-semibold bg-blue-100 px-1 py-0.5 rounded">.env</code>{' '}
            à la racine du projet et redémarrez le serveur.
          </div>
        </div>

        {/* Conformity rules */}
        <div className="fade-up fade-up-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[15px] font-bold text-[#0e1a38]">Règles de conformité</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {RULES.filter(r => r.active).length} règles actives — activation/désactivation disponible en V1
              </p>
            </div>
            <span className="text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full">
              Config V1
            </span>
          </div>
          <div className="space-y-1">
            {RULES.map(r => (
              <div key={r.code} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 group">
                <span className={`w-2 h-2 rounded-full shrink-0 ${r.severity === 'error' ? 'bg-red-500' : 'bg-amber-400'}`} />
                <span className="text-[11px] font-mono font-semibold text-gray-600 w-56 shrink-0 truncate">{r.code}</span>
                <span className="text-[12px] text-gray-500 flex-1 truncate">{r.desc}</span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                  r.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'
                }`}>
                  {r.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Teams */}
        <div className="fade-up fade-up-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[15px] font-bold text-[#0e1a38]">Équipes</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">Ajout / modification depuis l'interface — V1</p>
            </div>
            <span className="text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full">
              Config V1
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {TEAMS.map(t => (
              <span key={t} className="text-[12px] font-mono font-semibold bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1.5 rounded-xl">
                {t}
              </span>
            ))}
          </div>
        </div>

      </div>
    </Layout>
  );
}
