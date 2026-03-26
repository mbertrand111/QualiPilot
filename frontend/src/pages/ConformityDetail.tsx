import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { ConfirmModal } from '../components/ConfirmModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Bug {
  id: number;
  title: string | null;
  state: string | null;
  priority: number | null;
  team: string | null;
  filiere: string | null;
  area_path: string | null;
  iteration_path: string | null;
  sprint: string | null;
  sprint_done: string | null;
  found_in: string | null;
  integration_build: string | null;
  version_souhaitee: string | null;
  resolved_reason: string | null;
  raison_origine: string | null;
  assigned_to: string | null;
  created_date: string | null;
  resolved_date: string | null;
  changed_date: string | null;
  last_synced_at: string | null;
}

interface Violation {
  id: number;
  rule_code: string;
  rule_description: string;
  severity: 'error' | 'warning';
  detected_at: string;
}

interface AuditEntry {
  id: number;
  field: string;
  old_value: string | null;
  new_value: string | null;
  performed_at: string;
}

interface ConfirmState {
  field: 'priority' | 'version_souhaitee' | 'integration_build';
  label: string;
  oldValue: string;
  newValue: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: string | null | undefined): string {
  return v?.trim() ? v.trim() : '—';
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function fmtDateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch {
    return iso;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline py-2 border-b border-gray-50 last:border-0 gap-4">
      <span className="text-xs text-gray-400 font-medium shrink-0">{label}</span>
      <span className="text-xs font-mono font-semibold text-gray-700 text-right truncate max-w-[210px]">{value || '—'}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const EDITABLE_FIELDS = [
  { key: 'priority'          as const, label: 'Priorité',              type: 'select' as const, options: ['1', '2', '3', '4'] },
  { key: 'integration_build' as const, label: 'Integration Build',     type: 'text'   as const },
  { key: 'version_souhaitee' as const, label: 'Version souhaitée GC',  type: 'text'   as const },
];

export default function ConformityDetail() {
  const { bugId } = useParams<{ bugId: string }>();

  const [bug, setBug]               = useState<Bug | null>(null);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [audit, setAudit]           = useState<AuditEntry[]>([]);
  const [loadingBug, setLoadingBug] = useState(true);
  const [bugError, setBugError]     = useState<string | null>(null);

  // Valeurs dans le formulaire de correction
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  // Confirmation modale
  const [confirm, setConfirm]   = useState<ConfirmState | null>(null);
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ─── Chargement initial ────────────────────────────────────────────────────

  useEffect(() => {
    if (!bugId) return;
    const id = parseInt(bugId, 10);
    if (isNaN(id)) { setBugError('ID de bug invalide'); setLoadingBug(false); return; }

    Promise.all([
      fetch(`/api/bugs/${id}`).then(r => r.json()),
      fetch(`/api/conformity/violations?bug_id=${id}&limit=50`).then(r => r.json()),
      fetch(`/api/bugs/${id}/audit`).then(r => r.json()),
    ]).then(([bugData, violationsData, auditData]) => {
      if (bugData.error) { setBugError(bugData.error); return; }
      setBug(bugData as Bug);
      setViolations((violationsData.violations ?? []) as Violation[]);
      setAudit((Array.isArray(auditData) ? auditData : []) as AuditEntry[]);
      setFieldValues({
        priority:          String(bugData.priority ?? ''),
        integration_build: bugData.integration_build ?? '',
        version_souhaitee: bugData.version_souhaitee ?? '',
      });
    }).catch(e => {
      setBugError(e instanceof Error ? e.message : 'Erreur de chargement');
    }).finally(() => setLoadingBug(false));
  }, [bugId]);

  // ─── Rechargement après écriture ──────────────────────────────────────────

  function reload() {
    if (!bugId) return;
    const id = parseInt(bugId, 10);
    Promise.all([
      fetch(`/api/bugs/${id}`).then(r => r.json()),
      fetch(`/api/conformity/violations?bug_id=${id}&limit=50`).then(r => r.json()),
      fetch(`/api/bugs/${id}/audit`).then(r => r.json()),
    ]).then(([bugData, violationsData, auditData]) => {
      if (bugData.error) return;
      setBug(bugData as Bug);
      setViolations((violationsData.violations ?? []) as Violation[]);
      setAudit((Array.isArray(auditData) ? auditData : []) as AuditEntry[]);
      setFieldValues({
        priority:          String(bugData.priority ?? ''),
        integration_build: bugData.integration_build ?? '',
        version_souhaitee: bugData.version_souhaitee ?? '',
      });
    }).catch(() => {});
  }

  // ─── Soumission d'une modification ────────────────────────────────────────

  function handleApply(field: ConfirmState['field'], label: string) {
    if (!bug) return;
    const currentRaw = field === 'priority'
      ? String(bug.priority ?? '')
      : field === 'integration_build' ? (bug.integration_build ?? '') : (bug.version_souhaitee ?? '');
    setConfirm({
      field,
      label,
      oldValue: currentRaw,
      newValue: fieldValues[field] ?? '',
    });
    setSaveError(null);
  }

  async function handleConfirm() {
    if (!confirm || !bug) return;
    setSaving(true);
    try {
      const value = confirm.field === 'priority'
        ? parseInt(confirm.newValue, 10)
        : confirm.newValue;
      const res = await fetch(`/api/bugs/${bug.id}/fields`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: confirm.field, value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Erreur ${res.status}`);
      setConfirm(null);
      reload();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Erreur inconnue');
      setConfirm(null);
    } finally {
      setSaving(false);
    }
  }

  // ─── Rendu ────────────────────────────────────────────────────────────────

  if (loadingBug) {
    return (
      <Layout title={`Bug #${bugId}`} actions={<Link to="/conformity" className="text-sm text-gray-500 hover:text-gray-700 font-medium">← Retour</Link>}>
        <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Chargement…</div>
      </Layout>
    );
  }

  if (bugError || !bug) {
    return (
      <Layout title={`Bug #${bugId}`} actions={<Link to="/conformity" className="text-sm text-gray-500 hover:text-gray-700 font-medium">← Retour</Link>}>
        <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-4 text-sm text-red-600">{bugError ?? 'Bug introuvable'}</div>
      </Layout>
    );
  }

  return (
    <Layout
      title={`Bug #${bug.id}`}
      actions={
        <Link to="/conformity" className="text-sm text-gray-500 hover:text-gray-700 font-medium">
          ← Retour aux anomalies
        </Link>
      }
    >

      {saveError && (
        <div className="mb-4 bg-red-50 border border-red-100 rounded-2xl px-5 py-3 text-sm text-red-600 flex items-center justify-between">
          <span>Erreur : {saveError}</span>
          <button onClick={() => setSaveError(null)} className="text-red-400 hover:text-red-600">×</button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-5">

        {/* ── Left column ── */}
        <div className="col-span-2 space-y-5">

          {/* Bug header */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="mb-5">
              <span className="font-mono text-xs font-semibold text-gray-400">#{bug.id}</span>
              <h2 className="text-[17px] font-bold text-[#0e1a38] mt-1">{bug.title ?? '—'}</h2>
              <div className="flex items-center flex-wrap gap-2 mt-3">
                {bug.state && (
                  <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">{bug.state}</span>
                )}
                {bug.priority !== null && (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${bug.priority !== 2 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    Priorité {bug.priority}
                  </span>
                )}
                {bug.team && (
                  <span className="text-xs font-mono font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">{bug.team}</span>
                )}
                {bug.sprint && (
                  <span className="text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">{bug.sprint}</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-8">
              <InfoRow label="Assigned To"        value={fmt(bug.assigned_to)}       />
              <InfoRow label="Found In"            value={fmt(bug.found_in)}          />
              <InfoRow label="Integration Build"   value={fmt(bug.integration_build)} />
              <InfoRow label="Version souhaitée"   value={fmt(bug.version_souhaitee)} />
              <InfoRow label="Resolved Reason"     value={fmt(bug.resolved_reason)}   />
              <InfoRow label="Raison d'origine"    value={fmt(bug.raison_origine)}    />
              <InfoRow label="Créé le"             value={fmtDateShort(bug.created_date)}  />
              <InfoRow label="Résolu le"           value={fmtDateShort(bug.resolved_date)} />
              <InfoRow label="Modifié le"          value={fmtDateShort(bug.changed_date)}  />
              <InfoRow label="Synchronisé le"      value={fmtDateShort(bug.last_synced_at)} />
            </div>
            {bug.iteration_path && (
              <div className="mt-4 pt-4 border-t border-gray-50">
                <div className="text-xs text-gray-400 font-medium mb-1.5">Iteration Path</div>
                <div className="text-xs font-mono text-gray-600 bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-100">
                  {bug.iteration_path}
                </div>
              </div>
            )}
          </div>

          {/* Anomalies */}
          <div className={`bg-white rounded-2xl shadow-sm border p-6 ${violations.length > 0 ? 'border-red-100' : 'border-gray-100'}`}>
            <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${violations.length > 0 ? 'text-red-700' : 'text-green-700'}`}>
              <span className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-xs font-bold ${violations.length > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                {violations.length > 0 ? violations.length : '✓'}
              </span>
              {violations.length > 0
                ? `${violations.length} anomalie${violations.length > 1 ? 's' : ''} détectée${violations.length > 1 ? 's' : ''}`
                : 'Aucune anomalie active'}
            </h3>
            {violations.length > 0 && (
              <div className="space-y-3">
                {violations.map(v => (
                  <div key={v.id} className="bg-red-50 border border-red-100 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-mono font-semibold text-red-800">{v.rule_code}</span>
                      <div className="flex items-center gap-2">
                        <span className={[
                          'text-[11px] font-semibold px-2.5 py-0.5 rounded-full',
                          v.severity === 'error' ? 'bg-red-200 text-red-900' : 'bg-amber-200 text-amber-900',
                        ].join(' ')}>
                          {v.severity === 'error' ? 'Erreur' : 'Avertissement'}
                        </span>
                        <span className="text-[11px] text-gray-400 font-mono">{fmtDateShort(v.detected_at)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-red-700">{v.rule_description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audit trail */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-bold text-gray-700 mb-4">Historique des modifications ADO</h3>
            {audit.length === 0 ? (
              <p className="text-xs text-gray-400">Aucune modification effectuée via QualiPilot.</p>
            ) : (
              <div className="space-y-2">
                {audit.map(a => (
                  <div key={a.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2.5 text-xs border border-gray-100 flex-wrap">
                    <span className="font-mono text-gray-400 shrink-0">{fmtDate(a.performed_at)}</span>
                    <span className="text-gray-200">·</span>
                    <span className="font-semibold text-gray-700 shrink-0">{a.field}</span>
                    <span className="text-gray-200">·</span>
                    <span className="font-mono line-through text-red-400">{a.old_value ?? '(vide)'}</span>
                    <span className="text-gray-400">→</span>
                    <span className="font-mono text-green-600 font-semibold">{a.new_value ?? '(vide)'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right column: correction form ── */}
        <div>
          <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-5 sticky top-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <h3 className="text-sm font-bold text-[#0e1a38]">Corriger dans ADO</h3>
            </div>
            <p className="text-[11px] text-gray-400 mb-5 leading-relaxed">
              Modifications appliquées directement dans Azure DevOps et tracées dans l'audit log.
              Champs autorisés uniquement.
            </p>
            <div className="space-y-5">
              {EDITABLE_FIELDS.map(field => {
                const currentRaw = field.key === 'priority'
                  ? String(bug.priority ?? '')
                  : bug[field.key] ?? '';
                const hasChanged = (fieldValues[field.key] ?? '') !== currentRaw && (fieldValues[field.key] ?? '') !== '';

                return (
                  <div key={field.key}>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">{field.label}</label>
                    <div className="text-[11px] text-gray-400 mb-2">
                      Actuel :{' '}
                      <span className="font-mono font-semibold text-gray-600">
                        {currentRaw || '(vide)'}
                      </span>
                    </div>
                    {field.type === 'select' ? (
                      <select
                        value={fieldValues[field.key] ?? ''}
                        onChange={e => setFieldValues(v => ({ ...v, [field.key]: e.target.value }))}
                        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      >
                        {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={fieldValues[field.key] ?? ''}
                        onChange={e => setFieldValues(v => ({ ...v, [field.key]: e.target.value }))}
                        placeholder="Nouvelle valeur…"
                        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    )}
                    <button
                      onClick={() => handleApply(field.key, field.label)}
                      disabled={!hasChanged}
                      className="mt-2 w-full text-xs font-semibold px-3 py-2 rounded-xl bg-[#1E63B6] text-white hover:bg-[#0F3E8A] disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      Appliquer
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="mt-5 pt-4 border-t border-gray-100 text-[11px] text-gray-400 leading-relaxed">
              Seuls les champs de la whitelist peuvent être modifiés. Chaque écriture est tracée.
            </p>
          </div>
        </div>

      </div>

      {/* Modale de confirmation */}
      {confirm && (
        <ConfirmModal
          title="Confirmer la modification ADO"
          message={`Champ : ${confirm.label}\nValeur actuelle : ${confirm.oldValue || '(vide)'}\nNouvelle valeur : ${confirm.newValue}\n\nCette action est tracée dans l'audit log.`}
          confirmLabel="Confirmer dans ADO"
          loading={saving}
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </Layout>
  );
}
