import { useEffect, useMemo, useRef, useState } from 'react';

type DropdownOption = { value: string; label: string };

type DropdownSelectProps = {
  value: string;
  options: Array<string | DropdownOption>;
  onChange: (value: string) => void;
  className?: string;
};

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(' ');
}

export function DropdownSelect({ value, options, onChange, className }: DropdownSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const normalized = useMemo<DropdownOption[]>(
    () =>
      options.map((opt) =>
        typeof opt === 'string'
          ? { value: opt, label: opt }
          : { value: opt.value, label: opt.label },
      ),
    [options],
  );

  const selected = normalized.find((opt) => opt.value === value) ?? normalized[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={rootRef} className={cx('relative inline-flex', className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cx(
          'h-9 w-full rounded-xl border border-slate-200 bg-white px-3 pr-9 text-left text-sm font-medium text-[#0e1a38] shadow-sm transition-all',
          'hover:border-slate-300 focus:outline-none focus:ring-4 focus:ring-[#1E63B6]/15',
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{selected?.label ?? ''}</span>
      </button>

      <svg
        className={cx(
          'pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 transition-transform',
          open && 'rotate-180',
        )}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.25}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
      </svg>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1.5 min-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            {normalized.map((opt) => {
              const isActive = opt.value === value;
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    className={cx(
                      'w-full px-3 py-2 text-left text-sm transition-colors',
                      isActive ? 'bg-[#1E63B6] text-white' : 'text-slate-700 hover:bg-slate-50',
                    )}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    role="option"
                    aria-selected={isActive}
                  >
                    {opt.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

