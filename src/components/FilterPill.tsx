import { useState, useRef, useEffect } from 'react';

// ── FilterItem ────────────────────────────────────────────────────────────────
function FilterItem({ label, selected, withCheckbox, onClick }: {
  label: string; selected: boolean; withCheckbox: boolean; onClick: () => void;
}) {
  return (
    <div
      className={`ew-filter-pill-item${selected ? ' selected' : ''}`}
      style={{
        paddingLeft:  withCheckbox ? 4 : 12,
        paddingRight: withCheckbox ? 4 : 12,
      }}
      onClick={onClick}
    >
      {withCheckbox && (
        <div style={{
          width: 24, height: 24, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <input
            type="checkbox"
            className="ew-checkbox"
            checked={selected}
            readOnly
            style={{ pointerEvents: 'none' }}
          />
        </div>
      )}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
    </div>
  );
}

// ── FilterPill ────────────────────────────────────────────────────────────────
// values: currently selected option values (always array)
// onChange: called with new array of selected values
// multi: false(default) = single-select (auto-close after pick)
//        true           = multi-select  (toggle, stay open)
// withCheckbox: show checkbox visual inside dropdown items
// getLabel: map option value → display string
export function FilterPill({
  label,
  values,
  options,
  onChange,
  width = 180,
  multi = false,
  withCheckbox = false,
  getLabel,
}: {
  label: string;
  values: string[];
  options: string[];
  onChange: (vs: string[]) => void;
  width?: number;
  multi?: boolean;
  withCheckbox?: boolean;
  getLabel?: (v: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  // Display label in pill button
  const displayLabel = (() => {
    if (values.length === 0) return label;
    if (values.length === 1) return getLabel ? getLabel(values[0]) : values[0];
    return `${label} (${values.length})`;
  })();

  function handleAllClick() {
    onChange([]);
    if (!multi) setOpen(false);
  }

  function handleItemClick(opt: string) {
    if (multi) {
      // toggle
      const next = values.includes(opt)
        ? values.filter(v => v !== opt)
        : [...values, opt];
      onChange(next);
    } else {
      // single-select: replace or deselect
      onChange(values[0] === opt ? [] : [opt]);
      setOpen(false);
    }
  }

  const allSelected = values.length === 0;

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        className={`ew-filter-pill${open ? ' open' : ''}`}
        style={{ width }}
        onClick={() => setOpen(o => !o)}
        type="button"
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayLabel}
        </span>
        <img src="/icon/arrowup.svg" alt="" width={16} height={16} style={{ flexShrink: 0 }} />
      </button>

      {open && (
        <div
          className="ew-filter-pill-list"
          style={{ minWidth: width }}
          onClick={e => e.stopPropagation()}
        >
          {/* All — clears selection */}
          <FilterItem
            label="All"
            selected={allSelected}
            withCheckbox={withCheckbox}
            onClick={handleAllClick}
          />
          {options.map(opt => (
            <FilterItem
              key={opt}
              label={getLabel ? getLabel(opt) : opt}
              selected={values.includes(opt)}
              withCheckbox={withCheckbox}
              onClick={() => handleItemClick(opt)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
