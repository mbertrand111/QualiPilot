import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_BUG = {
  id: 15234,
  title: 'Crash au démarrage sur FAH_26.20',
  state: 'Active',
  priority: 3,
  team: 'PIXELS',
  filiere: 'GC',
  areaPath: 'Isagri_Dev_GC_GestionCommerciale\\PIXELS',
  iterationPath: 'Isagri_Dev_GC_GestionCommerciale\\2025-2026\\PI5\\PI5-SP3',
  foundIn: 'FAH_26.19',
  integrationBuild: '',
  versionSouhaitee: 'FAH_26.20',
  resolvedReason: '',
  assignedTo: 'Jean Dupont',
  createdDate: '15/02/2026',
  resolvedDate: '—',
  changedDate: '20/03/2026',
};

const MOCK_VIOLATIONS = [
  {
    rule: 'PRIORITY_CHECK',
    severity: 'error' as const,
    description: 'La priorité est 3 — elle doit être 2 pour tous les bugs actifs.',
  },
];

const MOCK_AUDIT = [
  { date: '22/03/2026 14:30', field: 'Priority', oldValue: '2', newValue: '3', user: 'QM' },
];

const WHITELIST = [
  { key: 'priority',        label: 'Priorité',            initialValue: '3',         type: 'select' as const, options: ['1', '2', '3', '4'] },
  { key: 'integrationBuild', label: 'Integration Build',  initialValue: '',          type: 'text'   as const },
  { key: 'versionSouhaitee', label: 'Version souhaitée GC', initialValue: 'FAH_26.20', type: 'text' as const },
];

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

interface ConfirmState {
  fieldKey: string;
  label: string;
  oldValue: string;
  newValue: string;
}

interface Toast {
  type: 'success' | 'error';
  message: string;
}

export default function ConformityDetail() {
  const { bugId } = useParams<{ bugId: string }>();
  const bug = MOCK_BUG; // in prod: fetch by bugId

  const [fieldValues, setFieldValues] = useState<Record<string, string>>(
    Object.fromEntries(WHITELIST.map(f => [f.key, f.initialValue]))
  );
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [toast, setToast]     = useState<Toast | null>(null);
  const [saving, setSaving]   = useState(false);

  const showToast = (type: Toast['type'], message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const handleApply = (field: typeof WHITELIST[0]) => {
    setConfirm({
      fieldKey:  field.key,
      label:     field.label,
      oldValue:  field.initialValue,
      newValue:  fieldValues[field.key],
    });
  };

  const handleConfirm = () => {
    if (!confirm) return;
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setConfirm(null);
      showToast('success', `Champ "${confirm.label}" modifié avec succès dans Azure DevOps.`);
    }, 1600);
  };

  return (
    <Layout
      title={`Bug #${bugId ?? bug.id}`}
      actions={
        <Link to="/conformity" className="text-sm text-gray-500 hover:text-gray-700 font-medium">
          ← Retour aux anomalies
        </Link>
      }
    >

      {/* Toast notification */}
      {toast && (
        <div className={[
          'fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl text-sm font-semibold',
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white',
        ].join(' ')}>
          <span>{toast.type === 'success' ? '✓' : '✕'}</span>
          {toast.message}
        </div>
      )}

      {/* Confirmation modal */}
      {confirm && (
        <div className="fixed inset-0 bg-[#0e1a38]/55 flex items-center justify-center z-40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 fade-up">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0 text-amber-600 text-xl">⚠</div>
              <div>
                <h3 className="text-[15px] font-bold text-[#0e1a38] mb-1">Confirmer la modification</h3>
                <p className="text-sm text-gray-500">
                  Vous allez modifier le champ <strong className="text-gray-700">{confirm.label}</strong> du bug{' '}
                  <strong className="font-mono text-gray-700">#{bug.id}</strong> directement dans Azure DevOps.
                  Cette action est tracée dans l'audit log.
                </p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl px-4 py-3 mb-5 space-y-2 border border-gray-100">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Valeur actuelle</span>
                <span className="font-mono font-semibold text-red-600">{confirm.oldValue || '(vide)'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Nouvelle valeur</span>
                <span className="font-mono font-semibold text-green-600">{confirm.newValue}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirm}
                disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:bg-blue-300"
              >
                {saving ? 'Application…' : 'Confirmer dans ADO'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-5">

        {/* ── Left column ── */}
        <div className="col-span-2 space-y-5">

          {/* Bug header card */}
          <div className="fade-up bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="mb-5">
              <span className="font-mono text-xs font-semibold text-gray-400">#{bug.id}</span>
              <h2 className="text-[17px] font-bold text-[#0e1a38] mt-1">{bug.title}</h2>
              <div className="flex items-center flex-wrap gap-2 mt-3">
                <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">{bug.state}</span>
                <span className="text-xs font-semibold bg-red-100 text-red-700 px-2.5 py-1 rounded-full">Priorité {bug.priority}</span>
                <span className="text-xs font-mono font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">{bug.team}</span>
                <span className="text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">{bug.filiere}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-8">
              <InfoRow label="Assigned To"      value={bug.assignedTo}    />
              <InfoRow label="Found In"          value={bug.foundIn}       />
              <InfoRow label="Integration Build" value={bug.integrationBuild} />
              <InfoRow label="Version souhaitée" value={bug.versionSouhaitee} />
              <InfoRow label="Resolved Reason"   value={bug.resolvedReason}   />
              <InfoRow label="Créé le"           value={bug.createdDate}   />
              <InfoRow label="Résolu le"         value={bug.resolvedDate}  />
              <InfoRow label="Modifié le"        value={bug.changedDate}   />
            </div>
            <div className="mt-4 pt-4 border-t border-gray-50">
              <div className="text-xs text-gray-400 font-medium mb-1.5">Iteration Path</div>
              <div className="text-xs font-mono text-gray-600 bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-100">
                {bug.iterationPath}
              </div>
            </div>
          </div>

          {/* Violations */}
          <div className="fade-up fade-up-1 bg-white rounded-2xl shadow-sm border border-red-100 p-6">
            <h3 className="text-sm font-bold text-red-700 mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-red-100 inline-flex items-center justify-center text-red-600 text-xs font-bold">
                {MOCK_VIOLATIONS.length}
              </span>
              Anomalie{MOCK_VIOLATIONS.length > 1 ? 's' : ''} détectée{MOCK_VIOLATIONS.length > 1 ? 's' : ''}
            </h3>
            <div className="space-y-3">
              {MOCK_VIOLATIONS.map(v => (
                <div key={v.rule} className="bg-red-50 border border-red-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono font-semibold text-red-800">{v.rule}</span>
                    <span className={[
                      'text-[11px] font-semibold px-2.5 py-0.5 rounded-full',
                      v.severity === 'error' ? 'bg-red-200 text-red-900' : 'bg-amber-200 text-amber-900',
                    ].join(' ')}>
                      {v.severity === 'error' ? 'Erreur' : 'Avertissement'}
                    </span>
                  </div>
                  <p className="text-xs text-red-700">{v.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Audit trail */}
          {MOCK_AUDIT.length > 0 && (
            <div className="fade-up fade-up-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-bold text-gray-700 mb-4">Historique des modifications ADO</h3>
              <div className="space-y-2">
                {MOCK_AUDIT.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2.5 text-xs border border-gray-100">
                    <span className="font-mono text-gray-400 shrink-0">{a.date}</span>
                    <span className="text-gray-200">·</span>
                    <span className="font-semibold text-gray-700 shrink-0">{a.field}</span>
                    <span className="text-gray-200">·</span>
                    <span className="font-mono line-through text-red-400">{a.oldValue}</span>
                    <span className="text-gray-400">→</span>
                    <span className="font-mono text-green-600 font-semibold">{a.newValue}</span>
                    <span className="ml-auto text-gray-400 shrink-0">par {a.user}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right column: correction form ── */}
        <div>
          <div className="fade-up fade-up-1 bg-white rounded-2xl shadow-sm border border-blue-100 p-5 sticky top-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <h3 className="text-sm font-bold text-[#0e1a38]">Corriger dans ADO</h3>
            </div>
            <p className="text-[11px] text-gray-400 mb-5 leading-relaxed">
              Modifications appliquées directement dans Azure DevOps et tracées dans l'audit log.
              Champs autorisés uniquement.
            </p>
            <div className="space-y-5">
              {WHITELIST.map(field => (
                <div key={field.key}>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">{field.label}</label>
                  <div className="text-[11px] text-gray-400 mb-2">
                    Actuel :{' '}
                    <span className="font-mono font-semibold text-gray-600">
                      {field.initialValue || '(vide)'}
                    </span>
                  </div>
                  {field.type === 'select' ? (
                    <select
                      value={fieldValues[field.key]}
                      onChange={e => setFieldValues(v => ({ ...v, [field.key]: e.target.value }))}
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    >
                      {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={fieldValues[field.key]}
                      onChange={e => setFieldValues(v => ({ ...v, [field.key]: e.target.value }))}
                      placeholder="Nouvelle valeur…"
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  )}
                  <button
                    onClick={() => handleApply(field)}
                    disabled={!fieldValues[field.key] || fieldValues[field.key] === field.initialValue}
                    className="mt-2 w-full text-xs font-semibold px-3 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    Appliquer
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-5 pt-4 border-t border-gray-100 text-[11px] text-gray-400 leading-relaxed">
              Seuls les champs de la whitelist peuvent être modifiés. Chaque écriture est tracée.
            </p>
          </div>
        </div>

      </div>
    </Layout>
  );
}
