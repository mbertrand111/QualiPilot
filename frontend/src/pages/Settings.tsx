import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import { MultiSelectDropdown } from '../components/MultiSelectDropdown';
import { SyncButton } from '../components/SyncButton';
import { useSyncAndEvaluate } from '../hooks/useSyncAndEvaluate';

const RULES = [
  { code: 'PRIORITY_CHECK', desc: 'Priority doit être 2', severity: 'error' as const, active: true },
  { code: 'INTEGRATION_BUILD_NOT_EMPTIED', desc: 'Bugs New/Active doivent avoir Integration Build vide', severity: 'error' as const, active: true },
  { code: 'TRIAGE_AREA_CHECK', desc: 'Cohérence zone triage : bugs fermés, sous-classement et produit correct', severity: 'error' as const, active: true },
  { code: 'BUGS_TRANSVERSE_AREA', desc: 'Bug non Closed dans zone transverse (États/GC/Hors-production/Maintenances/Performance/Sécurité/Tests auto)', severity: 'error' as const, active: true },
  { code: 'FAH_VERSION_REQUIRED', desc: 'Bugs LIVE (found_in >= 14.xx) doivent avoir version souhaitée avec FAH_', severity: 'error' as const, active: true },
  { code: 'CLOSED_BUG_COHERENCE', desc: 'Bug non-corrigé (Closed) -> version et build doivent être "-"', severity: 'error' as const, active: true },
  { code: 'VERSION_CHECK', desc: 'Format version souhaitée valide selon le type de bug (FAH_ / 12. / 13.8)', severity: 'error' as const, active: true },
  { code: 'BUILD_CHECK', desc: 'Bugs Closed/Resolved doivent avoir un build valide dans la liste connue', severity: 'error' as const, active: true },
  { code: 'VERSION_BUILD_COHERENCE', desc: 'Cohérence version souhaitée / build (Non concerné, format Patch)', severity: 'error' as const, active: true },
];

const ADO_CONFIG = [
  { label: 'Organisation ADO', value: 'isagri', env: 'ADO_ORG' },
  { label: 'Projet ADO', value: 'Isagri_Dev_GC_GestionCommerciale', env: 'ADO_PROJECT' },
  { label: 'Token PAT', value: '************************', env: 'ADO_PAT' },
  { label: 'Base URL', value: 'https://dev.azure.com', env: 'ADO_BASE_URL' },
];

const TEAMS = ['COCO', 'GO FAHST', 'JURASSIC BACK', 'MAGIC SYSTEM', 'MELI MELO', 'NULL.REF', 'PIXELS', 'LACE'];

interface ReleaseVersionSetting {
  version: string;
  selected: boolean;
}

interface ReleaseVersionSettingsResponse {
  versions: ReleaseVersionSetting[];
  alwaysVisible: string[];
}

function normalizeDisplayVersion(version: string): string {
  if (version === 'Non concerne') return 'Non concerné';
  return version;
}

export default function Settings() {
  const [releaseVersions, setReleaseVersions] = useState<ReleaseVersionSetting[]>([]);
  const [alwaysVisibleVersions, setAlwaysVisibleVersions] = useState<string[]>(['vide', 'Non concerne']);
  const [loadingReleaseVersions, setLoadingReleaseVersions] = useState(true);
  const [savingReleaseVersions, setSavingReleaseVersions] = useState(false);
  const [releaseVersionError, setReleaseVersionError] = useState<string | null>(null);

  const loadReleaseVersions = useCallback(async () => {
    setLoadingReleaseVersions(true);
    setReleaseVersionError(null);
    try {
      const res = await fetch('/api/settings/release-versions');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as ReleaseVersionSettingsResponse;
      setReleaseVersions(Array.isArray(data.versions) ? data.versions : []);
      setAlwaysVisibleVersions(Array.isArray(data.alwaysVisible) ? data.alwaysVisible : ['vide', 'Non concerne']);
    } catch (e) {
      setReleaseVersionError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoadingReleaseVersions(false);
    }
  }, []);

  useEffect(() => {
    loadReleaseVersions();
  }, [loadReleaseVersions]);

  const selectedReleaseVersions = useMemo(
    () => releaseVersions.filter((v) => v.selected).map((v) => v.version),
    [releaseVersions],
  );

  async function updateSelectedReleaseVersions(nextSelected: string[]) {
    setSavingReleaseVersions(true);
    setReleaseVersionError(null);
    try {
      const res = await fetch('/api/settings/release-versions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedVersions: nextSelected }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json() as ReleaseVersionSettingsResponse;
      setReleaseVersions(Array.isArray(data.versions) ? data.versions : []);
      setAlwaysVisibleVersions(Array.isArray(data.alwaysVisible) ? data.alwaysVisible : ['vide', 'Non concerne']);
    } catch (e) {
      setReleaseVersionError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setSavingReleaseVersions(false);
    }
  }

  const {
    step: syncStep,
    result: syncResult,
    error: syncError,
    run: runSync,
    clearResult: clearSyncResult,
    clearError: clearSyncError,
  } = useSyncAndEvaluate(async () => {
    await loadReleaseVersions();
  });

  return (
    <Layout title="Paramètres" actions={<SyncButton step={syncStep} onClick={runSync} />}>
      {syncResult && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-3 text-sm text-blue-700">
          <span>
            {'Synchronisation terminée — '}
            <strong>{syncResult.synced}</strong> {'bugs importés, '}
            <strong>{syncResult.checkedBugs}</strong> {'analysés, '}
            <strong className="text-red-600">{syncResult.newViolations}</strong> nouvelles anomalies,{' '}
            <strong className="text-green-700">{syncResult.resolvedViolations}</strong> {'résolues.'}
          </span>
          <button onClick={clearSyncResult} className="ml-auto text-lg leading-none text-blue-400 hover:text-blue-600">x</button>
        </div>
      )}

      {syncError && (
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-red-100 bg-red-50 px-5 py-3 text-sm text-red-600">
          <span>{'Erreur de synchronisation/évaluation : '}{syncError}</span>
          <button onClick={clearSyncError} className="text-red-400 hover:text-red-600">x</button>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
        <div className="space-y-5">
          <div className="fade-up rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-[15px] font-bold text-[#0e1a38]">Connexion Azure DevOps</h2>
            <div className="divide-y divide-gray-50">
              <div className="flex items-center justify-between pb-4">
                <div>
                  <div className="text-sm font-semibold text-gray-700">Statut de la connexion</div>
                  <div className="mt-0.5 text-xs text-gray-400">Authentification PAT - backend uniquement</div>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-green-100 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
                  </span>
                  Connecté
                </div>
              </div>

              {ADO_CONFIG.map(({ label, value, env }) => (
                <div key={label} className="flex items-center justify-between py-3.5">
                  <div>
                    <div className="text-sm font-semibold text-gray-700">{label}</div>
                    <div className="mt-0.5 text-xs font-mono text-gray-400">{env}</div>
                  </div>
                  <div className="max-w-[260px] truncate text-right font-mono text-[12px] text-gray-500">{value}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-[11px] leading-relaxed text-blue-700">
              Pour modifier ces paramètres, éditez <code className="rounded bg-blue-100 px-1 py-0.5 font-mono font-semibold">.env</code> à la racine du projet et redémarrez le serveur.
            </div>
          </div>

          <div className="fade-up fade-up-2 relative z-40 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-bold text-[#0e1a38]">KPI - Suivi par release</h2>
                <p className="mt-0.5 text-[11px] text-gray-400">
                  Versions majeures conservées dans les filtres de l'écran "Suivi par release".
                </p>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                savingReleaseVersions
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-green-200 bg-green-50 text-green-700'
              }`}>
                {savingReleaseVersions ? 'Enregistrement...' : 'Actif'}
              </span>
            </div>

            <MultiSelectDropdown
              options={releaseVersions.map((v) => ({ value: v.version, label: normalizeDisplayVersion(v.version) }))}
              selectedValues={selectedReleaseVersions}
              onChange={updateSelectedReleaseVersions}
              placeholder={loadingReleaseVersions ? 'Chargement...' : 'Sélectionner les versions'}
              className="w-full"
            />

            <div className="mt-3 text-[11px] text-gray-400">
              Les nouvelles versions détectées à la synchronisation sont cochées automatiquement.
            </div>
            <div className="mt-1 text-[11px] text-gray-400">
              Toujours visibles dans les filtres release : {alwaysVisibleVersions.map(normalizeDisplayVersion).join(', ')}.
            </div>
            {releaseVersionError && (
              <div className="mt-3 text-xs text-red-500">Erreur : {releaseVersionError}</div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="fade-up fade-up-1 relative z-20 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-bold text-[#0e1a38]">Règles de conformité</h2>
                <p className="mt-0.5 text-[11px] text-gray-400">
                  {RULES.filter((r) => r.active).length} règles actives - activation/désactivation disponible en V1
                </p>
              </div>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                Config V1
              </span>
            </div>
            <div className="space-y-1">
              {RULES.map((r) => (
                <div key={r.code} className="group flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-gray-50">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${r.severity === 'error' ? 'bg-red-500' : 'bg-amber-400'}`} />
                  <span className="w-56 shrink-0 truncate font-mono text-[11px] font-semibold text-gray-600">{r.code}</span>
                  <span className="flex-1 truncate text-[12px] text-gray-500">{r.desc}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    r.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {r.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="fade-up fade-up-3 relative z-10 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-bold text-[#0e1a38]">Équipes</h2>
                <p className="mt-0.5 text-[11px] text-gray-400">Ajout / modification depuis l'interface - V1</p>
              </div>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                Config V1
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {TEAMS.map((t) => (
                <span key={t} className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-1.5 font-mono text-[12px] font-semibold text-blue-700">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
