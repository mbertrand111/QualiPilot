import { forwardRef } from 'react';

type SelectTone = 'default' | 'inverse' | 'editing';
type SelectSize = 'sm' | 'md';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  tone?: SelectTone;
  uiSize?: SelectSize;
}

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(' ');
}

const toneClasses: Record<SelectTone, string> = {
  default: 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 focus:border-[#1E40AF]/55 focus:ring-[#1E40AF]/15',
  inverse: 'border-white/35 bg-white text-slate-800 hover:border-white/60 focus:border-[#66D2DB]/70 focus:ring-[#66D2DB]/25',
  editing: 'border-amber-300 bg-amber-50 text-amber-900 hover:border-amber-400 focus:border-amber-500 focus:ring-amber-200/80',
};

const sizeClasses: Record<SelectSize, string> = {
  sm: 'h-8 rounded-lg px-2.5 pr-8 text-xs',
  md: 'h-9 rounded-xl px-3 pr-9 text-sm',
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { tone = 'default', uiSize = 'md', className, children, ...props },
  ref
) {
  return (
    <div className="relative inline-flex w-full">
      <select
        ref={ref}
        className={cx(
          'w-full appearance-none border font-medium shadow-sm outline-none transition-all',
          'focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50',
          toneClasses[tone],
          sizeClasses[uiSize],
          className
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.25}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
      </svg>
    </div>
  );
});


