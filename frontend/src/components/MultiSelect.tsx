import { useState, useRef, useEffect } from 'react';

interface MultiSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  renderOption?: (value: string) => React.ReactNode;
  /** Si fourni, groupe les options avec des titres non-cliquables.
   *  Retourne { group: string, itemLabel: string } pour chaque valeur. */
  groupBy?: (value: string) => { group: string; itemLabel: string };
}

export function MultiSelect({ label, options, selected, onChange, renderOption, groupBy }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value]);
  }

  const hasSelection = selected.length > 0;

  // Construit les groupes si groupBy est fourni
  const groups: { label: string; items: { value: string; itemLabel: string }[] }[] = [];
  if (groupBy) {
    const groupMap = new Map<string, { value: string; itemLabel: string }[]>();
    for (const opt of options) {
      const { group, itemLabel } = groupBy(opt);
      if (!groupMap.has(group)) groupMap.set(group, []);
      groupMap.get(group)!.push({ value: opt, itemLabel });
    }
    for (const [groupLabel, items] of groupMap) {
      groups.push({ label: groupLabel, items });
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={[
          'flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-all',
          hasSelection
            ? 'border-[#1E63B6] bg-[#1E63B6]/5 text-[#1E63B6]'
            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300',
          open ? 'ring-2 ring-[#66D2DB]/40' : '',
        ].join(' ')}
      >
        <span className="font-medium">{label}</span>
        {hasSelection && (
          <span className="bg-[#1E63B6] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shrink-0">
            {selected.length}
          </span>
        )}
        <svg className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-30 mt-1.5 bg-white border border-gray-150 rounded-2xl shadow-xl min-w-[200px] max-w-[280px] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</span>
            {hasSelection ? (
              <button
                onClick={() => onChange([])}
                className="text-[11px] text-gray-400 hover:text-gray-600 hover:underline font-medium"
              >
                Réinitialiser
              </button>
            ) : (
              <button
                onClick={() => onChange([...options])}
                className="text-[11px] text-[#1E63B6] hover:underline font-medium"
              >
                Tout sélectionner
              </button>
            )}
          </div>

          {/* Options â€” avec ou sans groupes */}
          <ul className="max-h-64 overflow-y-auto py-1">
            {groupBy ? (
              groups.map(({ label: groupLabel, items }) => (
                <li key={groupLabel}>
                  {/* Titre de groupe non-cliquable */}
                  <div className="px-3 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 select-none">
                    {groupLabel}
                  </div>
                  <ul>
                    {items.map(({ value, itemLabel }) => {
                      const checked = selected.includes(value);
                      return (
                        <li key={value}>
                          <label className={`flex items-center gap-2.5 pl-5 pr-3 py-2 cursor-pointer transition-colors ${checked ? 'bg-[#1E63B6]/5' : 'hover:bg-gray-50'}`}>
                            <span className={[
                              'w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors',
                              checked ? 'bg-[#1E63B6] border-[#1E63B6]' : 'border-gray-300',
                            ].join(' ')}>
                              {checked && (
                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                              )}
                            </span>
                            <span className="text-sm text-[#2B2B2B] truncate">{itemLabel}</span>
                            <input type="checkbox" checked={checked} onChange={() => toggle(value)} className="sr-only" />
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))
            ) : (
              options.map(opt => {
                const checked = selected.includes(opt);
                return (
                  <li key={opt}>
                    <label className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${checked ? 'bg-[#1E63B6]/5' : 'hover:bg-gray-50'}`}>
                      <span className={[
                        'w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors',
                        checked ? 'bg-[#1E63B6] border-[#1E63B6]' : 'border-gray-300',
                      ].join(' ')}>
                        {checked && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </span>
                      <span className="text-sm text-[#2B2B2B] truncate">
                        {renderOption ? renderOption(opt) : opt}
                      </span>
                      <input type="checkbox" checked={checked} onChange={() => toggle(opt)} className="sr-only" />
                    </label>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

