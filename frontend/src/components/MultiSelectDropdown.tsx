import { useEffect, useMemo, useRef, useState } from 'react';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectDropdownProps {
  options: MultiSelectOption[];
  selectedValues: string[];
  onChange: (nextValues: string[]) => void;
  placeholder?: string;
  className?: string;
}

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(' ');
}

export function MultiSelectDropdown({
  options,
  selectedValues,
  onChange,
  placeholder = 'Sélectionner...',
  className,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedCount = selectedValues.length;
  const label = selectedCount === 0
    ? placeholder
    : selectedCount === options.length
      ? `Tous (${selectedCount})`
      : `${selectedCount} sélectionné${selectedCount > 1 ? 's' : ''}`;

  function toggleValue(value: string) {
    if (selectedSet.has(value)) {
      onChange(selectedValues.filter((v) => v !== value));
      return;
    }
    onChange([...selectedValues, value]);
  }

  return (
    <div ref={rootRef} className={cx('relative inline-flex', open ? 'z-[120]' : 'z-10', className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cx(
          'h-9 w-full rounded-xl border border-slate-200 bg-white px-3 pr-9 text-left text-sm font-medium text-[#0e1a38] shadow-sm transition-all',
          'hover:border-slate-300 focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/15',
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{label}</span>
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
        <div className="absolute left-0 top-full z-[130] mt-1.5 min-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <button
              type="button"
              className="text-[11px] text-blue-600 hover:text-blue-700"
              onClick={() => onChange(options.map((opt) => opt.value))}
            >
              Tout cocher
            </button>
            <button
              type="button"
              className="text-[11px] text-gray-500 hover:text-gray-700"
              onClick={() => onChange([])}
            >
              Tout décocher
            </button>
          </div>

          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            {options.map((opt) => {
              const checked = selectedSet.has(opt.value);
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => toggleValue(opt.value)}
                    role="option"
                    aria-selected={checked}
                  >
                    <span
                      className={cx(
                        'inline-flex h-4 w-4 items-center justify-center rounded border',
                        checked ? 'border-[#1E40AF] bg-[#1E40AF] text-white' : 'border-slate-300 bg-white text-transparent',
                      )}
                    >
                      <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.25 7.25a1 1 0 01-1.415 0l-3.25-3.25a1 1 0 011.415-1.42l2.542 2.543 6.543-6.544a1 1 0 011.415 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span className="truncate">{opt.label}</span>
                  </button>
                </li>
              );
            })}
            {options.length === 0 && (
              <li className="px-3 py-3 text-sm text-gray-400">Aucune option</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
