import type { SyncEvalStep } from '../hooks/useSyncAndEvaluate';

interface SyncButtonProps {
  step: SyncEvalStep;
  onClick: () => void;
  disabled?: boolean;
}

function SyncIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${spinning ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}

export function SyncButton({ step, onClick, disabled = false }: SyncButtonProps) {
  const busy = step !== 'idle';
  const isDisabled = disabled || busy;

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={[
        'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border',
        isDisabled
          ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-wait'
          : 'bg-white text-gray-600 border-gray-200 hover:border-[#1E40AF] hover:text-[#1E40AF] hover:bg-blue-50',
      ].join(' ')}
    >
      <SyncIcon spinning={busy} />
      {step === 'syncing' ? 'Synchronisation\u2026' : step === 'evaluating' ? '\u00C9valuation\u2026' : 'Synchroniser'}
    </button>
  );
}
