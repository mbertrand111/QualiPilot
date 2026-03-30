import { useCallback, useState } from 'react';

export type SyncEvalStep = 'idle' | 'syncing' | 'evaluating';

export interface SyncEvalResult {
  synced: number;
  lastSyncAt: string;
  checkedBugs: number;
  newViolations: number;
  resolvedViolations: number;
}

export function useSyncAndEvaluate(onAfterSuccess?: () => void | Promise<void>) {
  const [step, setStep] = useState<SyncEvalStep>('idle');
  const [result, setResult] = useState<SyncEvalResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setStep('syncing');
    setResult(null);
    setError(null);

    try {
      const syncRes = await fetch('/api/sync', { method: 'POST' });
      if (!syncRes.ok) throw new Error(`Erreur sync ${syncRes.status}`);
      const syncData = await syncRes.json() as { synced?: number; lastSyncAt?: string };

      if (syncData.lastSyncAt) {
        window.dispatchEvent(new CustomEvent('qualipilot:synced', { detail: { lastSyncAt: syncData.lastSyncAt } }));
      }

      setStep('evaluating');
      const evalRes = await fetch('/api/conformity/run', { method: 'POST' });
      if (!evalRes.ok) throw new Error(`Erreur \u00E9valuation ${evalRes.status}`);
      const evalData = await evalRes.json() as {
        checkedBugs?: number;
        newViolations?: number;
        resolvedViolations?: number;
      };

      setResult({
        synced: syncData.synced ?? 0,
        lastSyncAt: syncData.lastSyncAt ?? '',
        checkedBugs: evalData.checkedBugs ?? 0,
        newViolations: evalData.newViolations ?? 0,
        resolvedViolations: evalData.resolvedViolations ?? 0,
      });

      if (onAfterSuccess) await onAfterSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setStep('idle');
    }
  }, [onAfterSuccess]);

  return {
    step,
    busy: step !== 'idle',
    result,
    error,
    run,
    clearResult: () => setResult(null),
    clearError: () => setError(null),
  };
}
