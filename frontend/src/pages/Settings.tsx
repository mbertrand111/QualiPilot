import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import { MultiSelectDropdown } from '../components/MultiSelectDropdown';
import { SyncButton } from '../components/SyncButton';
import { useSyncAndEvaluate } from '../hooks/useSyncAndEvaluate';

const AUTO_RULE_CODES = new Set(['PRIORITY_CHECK', 'INTEGRATION_BUILD_NOT_EMPTIED']);

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

interface SprintCalendarEntry {
  id: number;
  piLabel: string;
  sprintLabel: string;
  startDate: string;
  endDate: string;
  active: boolean;
  sortOrder: number;
}

interface PiWindowConfig {
  key: string;
  label: string;
  start: string;
  end: string;
}

interface SprintCalendarSettingsResponse {
  entries: SprintCalendarEntry[];
  piWindows: PiWindowConfig[];
  updatedAt: string;
}

interface ConformityRuleSetting {
  id: number;
  code: string;
  description: string;
  severity: 'error' | 'warning';
  active: boolean;
  auto: boolean;
}

interface ConformityRuleSettingsResponse {
  rules: ConformityRuleSetting[];
  updatedAt: string;
}

interface HealthResponse {
  status?: string;
}

interface SprintPiGroup {
  piLabel: string;
  piOrder: number;
  startDate: string;
  endDate: string;
  rows: SprintCalendarEntry[];
}

interface SprintExerciseGroup {
  exercise: string;
  startDate: string;
  endDate: string;
  rowsCount: number;
  pis: SprintPiGroup[];
}

function normalizeDisplayVersion(version: string): string {
  if (version === 'Non concerne') return 'Non concerné';
  return version;
}

function parsePiLabel(piLabel: string): { exercise: string; piOrder: number } {
  const full = piLabel.match(/^(\d{2}-\d{2})\s+PI(\d+)$/i);
  if (full) {
    return {
      exercise: full[1],
      piOrder: Number(full[2]),
    };
  }

  const loose = piLabel.match(/PI(\d+)/i);
  return {
    exercise: 'Autre',
    piOrder: loose ? Number(loose[1]) : Number.MAX_SAFE_INTEGER,
  };
}

function formatIsoDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString('fr-FR');
}

export default function Settings() {
  const [releaseVersions, setReleaseVersions] = useState<ReleaseVersionSetting[]>([]);
  const [alwaysVisibleVersions, setAlwaysVisibleVersions] = useState<string[]>(['vide', 'Non concerne']);
  const [loadingReleaseVersions, setLoadingReleaseVersions] = useState(true);
  const [savingReleaseVersions, setSavingReleaseVersions] = useState(false);
  const [releaseVersionError, setReleaseVersionError] = useState<string | null>(null);
  const [sprintCalendarRows, setSprintCalendarRows] = useState<SprintCalendarEntry[]>([]);
  const [piWindows, setPiWindows] = useState<PiWindowConfig[]>([]);
  const [loadingSprintCalendar, setLoadingSprintCalendar] = useState(true);
  const [savingSprintCalendar, setSavingSprintCalendar] = useState(false);
  const [sprintCalendarError, setSprintCalendarError] = useState<string | null>(null);
  const [expandedExercises, setExpandedExercises] = useState<Record<string, boolean>>({});
  const [expandedPis, setExpandedPis] = useState<Record<string, boolean>>({});
  const [conformityRules, setConformityRules] = useState<ConformityRuleSetting[]>([]);
  const [loadingConformityRules, setLoadingConformityRules] = useState(true);
  const [conformityRulesError, setConformityRulesError] = useState<string | null>(null);
  const [savingRuleCode, setSavingRuleCode] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [connectionError, setConnectionError] = useState<string | null>(null);

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

  const loadSprintCalendar = useCallback(async () => {
    setLoadingSprintCalendar(true);
    setSprintCalendarError(null);
    try {
      const res = await fetch('/api/settings/sprint-calendar');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as SprintCalendarSettingsResponse;
      setSprintCalendarRows(Array.isArray(data.entries) ? data.entries : []);
      setPiWindows(Array.isArray(data.piWindows) ? data.piWindows : []);
    } catch (e) {
      setSprintCalendarError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoadingSprintCalendar(false);
    }
  }, []);

  useEffect(() => {
    loadSprintCalendar();
  }, [loadSprintCalendar]);

  const loadConformityRules = useCallback(async () => {
    setLoadingConformityRules(true);
    setConformityRulesError(null);
    try {
      const res = await fetch('/api/settings/conformity-rules');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as ConformityRuleSettingsResponse;
      setConformityRules(Array.isArray(data.rules) ? data.rules : []);
    } catch (e) {
      setConformityRulesError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoadingConformityRules(false);
    }
  }, []);

  useEffect(() => {
    loadConformityRules();
  }, [loadConformityRules]);

  const checkBackendConnection = useCallback(async () => {
    try {
      const res = await fetch('/api/health', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as HealthResponse;
      if (data?.status !== 'ok') throw new Error('Réponse inattendue');
      setConnectionState('connected');
      setConnectionError(null);
    } catch (e) {
      setConnectionState('disconnected');
      setConnectionError(e instanceof Error ? e.message : 'Erreur inconnue');
    }
  }, []);

  useEffect(() => {
    setConnectionState('checking');
    void checkBackendConnection();
    const intervalId = setInterval(() => {
      void checkBackendConnection();
    }, 15000);
    return () => clearInterval(intervalId);
  }, [checkBackendConnection]);

  const selectedReleaseVersions = useMemo(
    () => releaseVersions.filter((v) => v.selected).map((v) => v.version),
    [releaseVersions],
  );

  const connectionLabel = connectionState === 'connected'
    ? 'Connecté'
    : connectionState === 'checking'
      ? 'Vérification...'
      : 'Déconnecté';

  const connectionBadgeClass = connectionState === 'connected'
    ? 'border-green-100 bg-green-50 text-green-700'
    : connectionState === 'checking'
      ? 'border-amber-100 bg-amber-50 text-amber-700'
      : 'border-red-100 bg-red-50 text-red-700';

  const connectionDotClass = connectionState === 'connected'
    ? 'bg-green-500'
    : connectionState === 'checking'
      ? 'bg-amber-500'
      : 'bg-red-500';

  const connectionPingClass = connectionState === 'connected'
    ? 'bg-green-400'
    : 'bg-amber-400';

  const sprintCalendarGroups = useMemo<SprintExerciseGroup[]>(() => {
    const sortedRows = [...sprintCalendarRows].sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate);
      return a.id - b.id;
    });

    const byExercise = new Map<string, Map<string, SprintCalendarEntry[]>>();
    for (const row of sortedRows) {
      const parsed = parsePiLabel(row.piLabel);
      const piMap = byExercise.get(parsed.exercise) ?? new Map<string, SprintCalendarEntry[]>();
      const rows = piMap.get(row.piLabel) ?? [];
      rows.push(row);
      piMap.set(row.piLabel, rows);
      byExercise.set(parsed.exercise, piMap);
    }

    const groups: SprintExerciseGroup[] = [];
    for (const [exercise, piMap] of byExercise.entries()) {
      const pis: SprintPiGroup[] = [...piMap.entries()]
        .map(([piLabel, rows]) => {
          const parsed = parsePiLabel(piLabel);
          const orderedRows = [...rows].sort((a, b) => {
            if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
            return a.id - b.id;
          });
          const startDate = orderedRows.reduce((min, row) => (row.startDate < min ? row.startDate : min), orderedRows[0]?.startDate ?? '');
          const endDate = orderedRows.reduce((max, row) => (row.endDate > max ? row.endDate : max), orderedRows[0]?.endDate ?? '');
          return {
            piLabel,
            piOrder: parsed.piOrder,
            startDate,
            endDate,
            rows: orderedRows,
          };
        })
        .sort((a, b) => {
          if (a.piOrder !== b.piOrder) return a.piOrder - b.piOrder;
          if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate);
          return a.piLabel.localeCompare(b.piLabel);
        });

      groups.push({
        exercise,
        startDate: pis[0]?.startDate ?? '',
        endDate: pis[pis.length - 1]?.endDate ?? '',
        rowsCount: pis.reduce((acc, pi) => acc + pi.rows.length, 0),
        pis,
      });
    }

    return groups.sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [sprintCalendarRows]);

  useEffect(() => {
    if (sprintCalendarGroups.length === 0) return;

    const latestExercise = sprintCalendarGroups[sprintCalendarGroups.length - 1]?.exercise;
    setExpandedExercises((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const group of sprintCalendarGroups) {
        if (!(group.exercise in next)) {
          next[group.exercise] = group.exercise === latestExercise;
          changed = true;
        }
      }
      return changed ? next : prev;
    });

    setExpandedPis((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const group of sprintCalendarGroups) {
        for (const [idx, pi] of group.pis.entries()) {
          const key = `${group.exercise}::${pi.piLabel}`;
          if (!(key in next)) {
            next[key] = group.exercise === latestExercise && idx === 0;
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [sprintCalendarGroups]);

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

  function updateSprintRow(id: number, patch: Partial<SprintCalendarEntry>) {
    setSprintCalendarRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function toggleExercise(exercise: string) {
    setExpandedExercises((prev) => ({ ...prev, [exercise]: !prev[exercise] }));
  }

  function togglePi(exercise: string, piLabel: string) {
    const key = `${exercise}::${piLabel}`;
    setExpandedPis((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function saveSprintCalendar() {
    setSavingSprintCalendar(true);
    setSprintCalendarError(null);
    try {
      const payload = {
        entries: sprintCalendarRows.map((row) => ({
          id: row.id,
          startDate: row.startDate,
          endDate: row.endDate,
          active: row.active,
        })),
      };
      const res = await fetch('/api/settings/sprint-calendar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json() as SprintCalendarSettingsResponse;
      setSprintCalendarRows(Array.isArray(data.entries) ? data.entries : []);
      setPiWindows(Array.isArray(data.piWindows) ? data.piWindows : []);
    } catch (e) {
      setSprintCalendarError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setSavingSprintCalendar(false);
    }
  }

  async function toggleConformityRule(rule: ConformityRuleSetting) {
    if (savingRuleCode) return;
    setSavingRuleCode(rule.code);
    setConformityRulesError(null);
    try {
      const res = await fetch('/api/settings/conformity-rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: rule.code, active: !rule.active }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json() as ConformityRuleSettingsResponse;
      setConformityRules(Array.isArray(data.rules) ? data.rules : []);
    } catch (e) {
      setConformityRulesError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setSavingRuleCode(null);
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
    await Promise.all([loadReleaseVersions(), loadSprintCalendar(), loadConformityRules(), checkBackendConnection()]);
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
                <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${connectionBadgeClass}`}>
                  <span className="relative flex h-1.5 w-1.5">
                    {connectionState !== 'disconnected' && (
                      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${connectionPingClass}`} />
                    )}
                    <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${connectionDotClass}`} />
                  </span>
                  {connectionLabel}
                </div>
              </div>
              {connectionError && (
                <div className="pt-2 text-xs text-red-500">
                  Backend non joignable : {connectionError}
                </div>
              )}

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

          <div className="fade-up fade-up-3 relative z-30 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-bold text-[#0e1a38]">Calendrier PI/Sprint</h2>
                <p className="mt-0.5 text-[11px] text-gray-400">
                  Dates utilisées par les KPI (Defect Debt et Bugs fermés par PI). Modifiable en cas d'ajustement planning.
                </p>
              </div>
              <button
                type="button"
                onClick={saveSprintCalendar}
                disabled={savingSprintCalendar || loadingSprintCalendar || sprintCalendarRows.length === 0}
                className={[
                  'rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors',
                  savingSprintCalendar || loadingSprintCalendar || sprintCalendarRows.length === 0
                    ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300'
                    : 'border-[#1E63B6]/30 bg-white text-[#1E63B6] hover:border-[#1E63B6] hover:bg-blue-50',
                ].join(' ')}
              >
                {savingSprintCalendar ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>

            <div className="mb-3 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-[11px] text-blue-700">
              La case <strong>Pris en compte</strong> indique si le sprint est utilisé dans les calculs KPI par PI.
              Si décoché, la ligne reste visible dans le calendrier mais n'est plus incluse dans les agrégations.
            </div>

            <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/40 p-3">
              {loadingSprintCalendar && (
                <div className="rounded-xl border border-dashed border-gray-200 bg-white px-3 py-8 text-center text-sm text-gray-400">
                  Chargement...
                </div>
              )}

              {!loadingSprintCalendar && sprintCalendarRows.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-200 bg-white px-3 py-8 text-center text-sm text-gray-400">
                  Aucune ligne calendrier.
                </div>
              )}

              {!loadingSprintCalendar && sprintCalendarGroups.map((exerciseGroup) => {
                const exerciseExpanded = expandedExercises[exerciseGroup.exercise] ?? false;
                return (
                  <div key={exerciseGroup.exercise} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                    <button
                      type="button"
                      onClick={() => toggleExercise(exerciseGroup.exercise)}
                      className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50"
                    >
                      <span className={`text-sm text-gray-400 transition-transform ${exerciseExpanded ? 'rotate-90' : ''}`}>▶</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-[#0e1a38]">Exercice {exerciseGroup.exercise}</div>
                        <div className="mt-0.5 text-[11px] text-gray-500">
                          {formatIsoDate(exerciseGroup.startDate)} - {formatIsoDate(exerciseGroup.endDate)} - {exerciseGroup.rowsCount} sprint(s)
                        </div>
                      </div>
                    </button>

                    {exerciseExpanded && (
                      <div className="space-y-2 bg-white p-3">
                        {exerciseGroup.pis.map((piGroup) => {
                          const piKey = `${exerciseGroup.exercise}::${piGroup.piLabel}`;
                          const piExpanded = expandedPis[piKey] ?? false;
                          return (
                            <div key={piKey} className="overflow-hidden rounded-xl border border-gray-100 bg-gray-50/40">
                              <button
                                type="button"
                                onClick={() => togglePi(exerciseGroup.exercise, piGroup.piLabel)}
                                className="flex w-full items-center gap-3 border-b border-gray-100 px-3 py-2.5 text-left hover:bg-gray-50"
                              >
                                <span className={`text-xs text-gray-400 transition-transform ${piExpanded ? 'rotate-90' : ''}`}>▶</span>
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-semibold text-gray-700">{piGroup.piLabel}</div>
                                  <div className="mt-0.5 text-[11px] text-gray-500">
                                    {formatIsoDate(piGroup.startDate)} - {formatIsoDate(piGroup.endDate)} - {piGroup.rows.length} sprint(s)
                                  </div>
                                </div>
                              </button>

                              {piExpanded && (
                                <div className="space-y-2 px-3 py-3">
                                  {piGroup.rows.map((row) => (
                                    <div key={row.id} className="grid gap-2 rounded-lg border border-gray-200 bg-white p-3 md:grid-cols-[90px_1fr_1fr_auto] md:items-center">
                                      <div className="text-xs font-mono font-semibold text-gray-700">{row.sprintLabel}</div>
                                      <input
                                        type="date"
                                        value={row.startDate}
                                        onChange={(e) => updateSprintRow(row.id, { startDate: e.target.value })}
                                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#66D2DB]/40"
                                      />
                                      <input
                                        type="date"
                                        value={row.endDate}
                                        onChange={(e) => updateSprintRow(row.id, { endDate: e.target.value })}
                                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#66D2DB]/40"
                                      />
                                      <label className="inline-flex items-center gap-2 text-xs text-gray-600">
                                        <input
                                          type="checkbox"
                                          checked={row.active}
                                          onChange={(e) => updateSprintRow(row.id, { active: e.target.checked })}
                                          className="rounded border-gray-300 text-[#1E63B6] focus:ring-[#1E63B6]/30"
                                        />
                                        Pris en compte
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-[11px] text-blue-700">
              Fenêtres PI calculées automatiquement depuis ce calendrier : {piWindows.map((w) => `${w.label} (${w.start} -> ${w.end})`).join(' | ')}.
            </div>
            {sprintCalendarError && (
              <div className="mt-3 text-xs text-red-500">Erreur : {sprintCalendarError}</div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="fade-up fade-up-1 relative z-20 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-bold text-[#0e1a38]">Règles de conformité</h2>
                <p className="mt-0.5 text-[11px] text-gray-400">
                  {conformityRules.filter((r) => r.active).length} règle(s) activée(s) - cliquer sur le tag pour activer/désactiver.
                </p>
              </div>
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                Pilotage actif
              </span>
            </div>
            <div className="space-y-1">
              {loadingConformityRules && (
                <div className="rounded-xl border border-dashed border-gray-200 px-3 py-5 text-center text-sm text-gray-400">
                  Chargement des règles...
                </div>
              )}
              {!loadingConformityRules && conformityRules.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-200 px-3 py-5 text-center text-sm text-gray-400">
                  Aucune règle trouvée.
                </div>
              )}
              {!loadingConformityRules && conformityRules.map((r) => {
                const isSaving = savingRuleCode === r.code;
                const isAuto = r.auto || AUTO_RULE_CODES.has(r.code);
                const tagClasses = !r.active
                  ? 'border-gray-200 bg-gray-100 text-gray-500'
                  : isAuto
                    ? 'border-cyan-200 bg-cyan-50 text-cyan-700'
                    : 'border-green-200 bg-green-50 text-green-700';
                const tagLabel = !r.active ? 'Off' : isAuto ? 'Auto' : 'On';

                return (
                  <div key={r.code} className="group flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-gray-50">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${r.severity === 'error' ? 'bg-red-500' : 'bg-amber-400'}`} />
                    <span className="w-56 shrink-0 truncate font-mono text-[11px] font-semibold text-gray-600">{r.code}</span>
                    <span className="flex-1 truncate text-[12px] text-gray-500">{r.description}</span>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => toggleConformityRule(r)}
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors ${tagClasses} ${isSaving ? 'cursor-wait opacity-70' : 'hover:opacity-90'}`}
                      title={r.active ? 'Cliquer pour désactiver la règle' : 'Cliquer pour activer la règle'}
                    >
                      {isSaving ? '...' : tagLabel}
                    </button>
                  </div>
                );
              })}
            </div>
            {conformityRulesError && (
              <div className="mt-3 text-xs text-red-500">Erreur : {conformityRulesError}</div>
            )}
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
