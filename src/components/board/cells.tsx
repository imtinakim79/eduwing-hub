import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';

// ── Avatar helpers ────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#EF4444','#10B981','#F27E44','var(--color-primary)','#8B5CF6','#EC4899','#14B8A6'];
export function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
export function initials(n: string) {
  const p = n.trim().split(' ');
  return (p[0]?.[0] ?? '') + (p[1]?.[0] ?? '');
}
export function isoToDisplay(iso: string) {
  return iso.length >= 10 ? iso.slice(2).replace(/-/g, '/') : iso;
}

// ── HeadlineCell ─────────────────────────────────────────────────────────────
export function HeadlineCell({ label, sortKey, activeSortKey, sortDir, onSort }: {
  label: string; sortKey?: string; activeSortKey: string | null;
  sortDir: 'asc' | 'desc'; onSort?: (k: string) => void;
}) {
  const isActive = !!(sortKey && activeSortKey === sortKey);
  return (
    <div
      className={`ew-cell--headline${isActive ? ' sorted' : ''}`}
      onClick={() => sortKey && onSort?.(sortKey)}
      style={sortKey ? { cursor: 'pointer' } : {}}
    >
      {label}
      {sortKey && (
        <span className="sort-arrow">{isActive ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
      )}
    </div>
  );
}

// ── TextCell ──────────────────────────────────────────────────────────────────
export function TextCell({ value, isActive, onSave }: {
  value: string; isActive: boolean; onSave: (v: string) => void;
}) {
  if (isActive) {
    return (
      <input
        autoFocus
        defaultValue={value}
        style={{
          width: '100%', border: 'none', outline: 'none', background: 'transparent',
          fontSize: 13, fontFamily: 'var(--font-en)', color: 'var(--color-text-primary)', padding: 0,
        }}
        onBlur={(e) => onSave(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur(); }}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }
  return <>{value}</>;
}

// ── SmartOverlay — portal + viewport-aware positioning ───────────────────────
function SmartOverlay({ triggerRef, children, onOutsideClick }: {
  triggerRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
  onOutsideClick?: () => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({
    position: 'fixed', top: -9999, left: -9999, zIndex: 9999, visibility: 'hidden',
  });

  useLayoutEffect(() => {
    const trigger = triggerRef.current;
    const wrapper = wrapperRef.current;
    if (!trigger || !wrapper) return;
    const tr = trigger.getBoundingClientRect();
    const wr = wrapper.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const goUp = wr.height > vh - tr.bottom - 8 && tr.top > wr.height + 8;
    let left = tr.left;
    if (left + wr.width > vw - 8) left = tr.right - wr.width;
    left = Math.max(8, left);
    setStyle({
      position: 'fixed',
      top: goUp ? tr.top - wr.height - 4 : tr.bottom + 4,
      left,
      zIndex: 9999,
      visibility: 'visible',
    });
  }, [triggerRef]);

  useEffect(() => {
    if (!onOutsideClick) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (wrapperRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      onOutsideClick!();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onOutsideClick!();
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onOutsideClick, triggerRef]);

  return createPortal(
    <div ref={wrapperRef} style={style} className="ew-smart-overlay-portal">
      {children}
    </div>,
    document.body
  );
}

// ── Dropdown item shared component ───────────────────────────────────────────
function DropdownItem({ label, selected, onClick }: {
  label: string; selected: boolean; onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      className={`ew-dropdown-item${selected ? ' selected' : ''}`}
      onClick={onClick}
    >
      {/* 표시 전용 체크박스 — ew-checkbox.is-checked로 디자인 시스템 통일 */}
      <span className={`ew-checkbox${selected ? ' is-checked' : ''}`} aria-hidden style={{ pointerEvents: 'none' }} />
      <span>{label}</span>
    </div>
  );
}

// ── DropdownCell ──────────────────────────────────────────────────────────────
export function DropdownCell({ value, options, cellId, openCell, setOpenCell, onChange, onCellClick, onEditDone }: {
  value: string; options: string[]; cellId: string;
  openCell: string | null; setOpenCell: (id: string | null) => void;
  onChange: (v: string) => void; onCellClick: () => void; onEditDone: () => void;
}) {
  const isOpen = openCell === cellId;
  const triggerRef = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={triggerRef}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)',
        width: '100%', height: '100%', cursor: 'pointer',
        background: isOpen ? 'var(--color-primary-bg)' : 'transparent',
        margin: '0 -12px', padding: '0 12px',
        transition: 'background var(--dur-fast) var(--ease-out)',
      }}
      onClick={(e) => { e.stopPropagation(); onCellClick(); setOpenCell(isOpen ? null : cellId); }}
    >
      <span style={{ fontSize: 'var(--text-base)', color: value ? 'var(--color-ink-strong)' : 'var(--color-ink-faint)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value || '선택'}
      </span>
      <img
        src={isOpen ? '/icon/arrowup.svg' : '/icon/arrowdown.svg'}
        alt="" style={{ width: 16, height: 16, flexShrink: 0, opacity: 0.65 }}
      />
      {isOpen && (
        <SmartOverlay triggerRef={triggerRef} onOutsideClick={() => setOpenCell(null)}>
          <div className="ew-dropdown-overlay" onClick={(e) => e.stopPropagation()}>
            {options.map(opt => (
              <DropdownItem
                key={opt} label={opt} selected={opt === value}
                onClick={(e) => { e.stopPropagation(); onChange(opt); setOpenCell(null); onEditDone(); }}
              />
            ))}
          </div>
        </SmartOverlay>
      )}
    </div>
  );
}

// ── MultiDropdownCell (DropdownMulti) ─────────────────────────────────────────
export function MultiDropdownCell({ values, options, cellId, openCell, setOpenCell, onChange, onCellClick }: {
  values: string[]; options: string[]; cellId: string;
  openCell: string | null; setOpenCell: (id: string | null) => void;
  onChange: (values: string[]) => void; onCellClick: () => void;
}) {
  const isOpen = openCell === cellId;
  const allSelected = options.length > 0 && options.every(o => values.includes(o));
  const triggerRef = useRef<HTMLDivElement>(null);

  function toggle(opt: string) {
    onChange(values.includes(opt) ? values.filter(v => v !== opt) : [...values, opt]);
  }
  function toggleAll() {
    onChange(allSelected ? [] : [...options]);
  }

  return (
    <div
      ref={triggerRef}
      style={{
        display: 'flex', alignItems: 'center', gap: 4, height: '100%', cursor: 'pointer',
        background: isOpen ? 'var(--color-primary-bg)' : 'transparent',
        borderBottom: isOpen ? '2px solid var(--color-primary)' : '2px solid transparent',
        margin: '0 -12px', padding: '0 12px',
        flexWrap: isOpen ? 'nowrap' : 'wrap',
      }}
      onClick={(e) => { e.stopPropagation(); onCellClick(); setOpenCell(isOpen ? null : cellId); }}
    >
      {values.length === 0 ? (
        <span style={{ fontSize: 13, color: 'var(--color-ink-faint)', flex: 1 }}>선택</span>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, flex: 1, overflow: 'hidden' }}>
          {values.map(v => (
            <span key={v} className="ew-tag ew-tag--blue" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)', whiteSpace: 'nowrap' }}>{v}</span>
          ))}
        </div>
      )}
      <img
        src={isOpen ? '/icon/arrowup.svg' : '/icon/arrowdown.svg'}
        alt="" style={{ width: 14, height: 14, flexShrink: 0 }}
      />
      {isOpen && (
        <SmartOverlay triggerRef={triggerRef} onOutsideClick={() => setOpenCell(null)}>
          <div className="ew-dropdown-multi-overlay" onClick={e => e.stopPropagation()}>
            <div className={`ew-dropdown-item${allSelected ? ' selected' : ''}`} onClick={e => { e.stopPropagation(); toggleAll(); }}>
              <span className={`ew-checkbox${allSelected ? ' is-checked' : ''}`} aria-hidden style={{ pointerEvents: 'none' }} />
              <span>All</span>
            </div>
            {options.map(opt => (
              <DropdownItem
                key={opt} label={opt} selected={values.includes(opt)}
                onClick={e => { e.stopPropagation(); toggle(opt); }}
              />
            ))}
          </div>
        </SmartOverlay>
      )}
    </div>
  );
}

// ── CalendarOverlay ───────────────────────────────────────────────────────────
const CAL_MONTHS       = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const CAL_MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── MonthYearPicker — 헤더 클릭 시 표시되는 년/월 선택 피커 ──────────────────
function MonthYearPicker({ yr, mo, onSelect, onClose }: {
  yr: number; mo: number;
  onSelect: (yr: number, mo: number) => void;
  onClose: () => void;
}) {
  const [pickYr, setPickYr] = useState(yr);
  const [showYearGrid, setShowYearGrid] = useState(false);
  const [yearRangeStart, setYearRangeStart] = useState(Math.floor(yr / 12) * 12);

  const navBtn: React.CSSProperties = {
    width: 28, height: 28, borderRadius: 6, background: 'var(--color-bg-subtle)',
    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', padding: 0, flexShrink: 0,
  };

  if (showYearGrid) {
    return (
      <div
        style={{ position: 'absolute', inset: 0, background: '#fff', zIndex: 10, display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', height: 48, padding: '0 8px', borderBottom: '1px solid var(--color-border-subtle)', flexShrink: 0 }}>
          <button style={navBtn} onClick={e => { e.stopPropagation(); setYearRangeStart(s => s - 12); }}>
            <img src="/icon/arrow_fill_left.svg" alt="" style={{ width: 12, height: 12 }} />
          </button>
          <span style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 600, color: 'var(--color-ink-strong)', fontFamily: 'var(--font-en)' }}>
            {yearRangeStart} – {yearRangeStart + 11}
          </span>
          <button style={navBtn} onClick={e => { e.stopPropagation(); setYearRangeStart(s => s + 12); }}>
            <img src="/icon/arrow_fill_right.svg" alt="" style={{ width: 12, height: 12 }} />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, padding: 8, flex: 1, alignContent: 'start' }}>
          {Array.from({ length: 12 }, (_, i) => yearRangeStart + i).map(y => {
            const isCur = y === pickYr;
            return (
              <button
                key={y}
                style={{
                  height: 36, borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: isCur ? 'var(--color-primary)' : 'transparent',
                  color: isCur ? '#fff' : 'var(--color-ink-strong)',
                  fontWeight: isCur ? 600 : 400,
                  fontSize: 13, fontFamily: 'var(--font-en)',
                }}
                onClick={e => { e.stopPropagation(); setPickYr(y); setShowYearGrid(false); }}
                onMouseEnter={e => { if (!isCur) (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)'; }}
                onMouseLeave={e => { if (!isCur) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                {y}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ position: 'absolute', inset: 0, background: '#fff', zIndex: 10, display: 'flex', flexDirection: 'column' }}
      onClick={e => e.stopPropagation()}
    >
      <div style={{ display: 'flex', alignItems: 'center', height: 48, padding: '0 8px', borderBottom: '1px solid var(--color-border-subtle)', flexShrink: 0 }}>
        <button style={navBtn} onClick={e => { e.stopPropagation(); setPickYr(y => y - 1); }}>
          <img src="/icon/arrow_fill_left.svg" alt="" style={{ width: 12, height: 12 }} />
        </button>
        <button
          style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: 'var(--color-ink-strong)', fontFamily: 'var(--font-en)', borderRadius: 4, padding: '0 4px' }}
          onClick={e => { e.stopPropagation(); setYearRangeStart(Math.floor(pickYr / 12) * 12); setShowYearGrid(true); }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
        >
          {pickYr}
        </button>
        <button style={navBtn} onClick={e => { e.stopPropagation(); setPickYr(y => y + 1); }}>
          <img src="/icon/arrow_fill_right.svg" alt="" style={{ width: 12, height: 12 }} />
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, padding: 8, flex: 1, alignContent: 'start' }}>
        {CAL_MONTHS_SHORT.map((m, i) => {
          const isCur = pickYr === yr && i === mo;
          return (
            <button
              key={m}
              style={{
                height: 36, borderRadius: 6, border: 'none', cursor: 'pointer',
                background: isCur ? 'var(--color-primary)' : 'transparent',
                color: isCur ? '#fff' : 'var(--color-ink-strong)',
                fontWeight: isCur ? 600 : 400,
                fontSize: 13, fontFamily: 'var(--font-en)',
              }}
              onClick={e => { e.stopPropagation(); onSelect(pickYr, i); onClose(); }}
              onMouseEnter={e => { if (!isCur) (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)'; }}
              onMouseLeave={e => { if (!isCur) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {m}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CalendarOverlay({ dateISO, onSelect, footer }: {
  dateISO: string; onSelect: (iso: string) => void;
  footer?: React.ReactNode;
}) {
  const init = dateISO ? new Date(dateISO + 'T00:00:00') : new Date();
  const [yr, setYr] = useState(init.getFullYear());
  const [mo, setMo] = useState(init.getMonth());
  const [showPicker, setShowPicker] = useState(false);
  const today = new Date();

  function prevMo() { if (mo === 0) { setYr(y => y - 1); setMo(11); } else setMo(m => m - 1); }
  function nextMo() { if (mo === 11) { setYr(y => y + 1); setMo(0); } else setMo(m => m + 1); }

  const daysInMonth = new Date(yr, mo + 1, 0).getDate();
  const firstDay    = new Date(yr, mo, 1).getDay();
  const cells: Array<number | null> = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selDate = dateISO ? new Date(dateISO + 'T00:00:00') : null;

  function pick(d: number) {
    onSelect(`${yr}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }

  const navBtnStyle: React.CSSProperties = {
    width: 28, height: 28, borderRadius: 6, background: 'var(--color-bg-subtle)',
    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 0, flexShrink: 0,
  };

  return (
    <div className="ew-calendar-overlay" onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 48, padding: '0 8px', borderBottom: '1px solid var(--color-border-subtle)' }}>
        <button style={navBtnStyle} onClick={(e) => { e.stopPropagation(); prevMo(); }}>
          <img src="/icon/arrow_fill_left.svg" alt="" style={{ width: 12, height: 12 }} />
        </button>
        <button
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 600, color: 'var(--color-ink-strong)', fontFamily: 'var(--font-en)', padding: '0 4px', borderRadius: 4 }}
          onClick={e => { e.stopPropagation(); setShowPicker(v => !v); }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
        >
          {CAL_MONTHS[mo]} {yr}
        </button>
        <button style={navBtnStyle} onClick={(e) => { e.stopPropagation(); nextMo(); }}>
          <img src="/icon/arrow_fill_right.svg" alt="" style={{ width: 12, height: 12 }} />
        </button>
      </div>
      {showPicker && (
        <MonthYearPicker
          yr={yr} mo={mo}
          onSelect={(y, m) => { setYr(y); setMo(m); }}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* Grid */}
      <div style={{ padding: '8px 8px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 36px)', marginBottom: 4 }}>
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
            <div key={d} style={{ height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, color: 'var(--color-ink-soft)', fontFamily: 'var(--font-en)' }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 36px)' }}>
          {cells.map((d, i) => {
            if (!d) return <div key={`e${i}`} style={{ width: 36, height: 36 }} />;
            const isToday = today.getFullYear() === yr && today.getMonth() === mo && today.getDate() === d;
            const isSel   = selDate && selDate.getFullYear() === yr && selDate.getMonth() === mo && selDate.getDate() === d;
            return (
              <div key={d} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button
                  style={{
                    width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer',
                    fontSize: 13, fontFamily: 'var(--font-en)',
                    background: isSel ? 'var(--color-primary)' : 'transparent',
                    color: isSel ? '#fff' : isToday ? 'var(--color-primary)' : 'var(--color-ink-strong)',
                    fontWeight: isSel ? 700 : isToday ? 600 : 400,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  onClick={(e) => { e.stopPropagation(); pick(d); }}
                  onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)'; }}
                  onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  {d}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Today button */}
      <button
        style={{
          margin: '8px 15px 12px', height: 32, width: 'calc(100% - 30px)',
          background: 'var(--color-bg-subtle)', border: 'none', borderRadius: 6, cursor: 'pointer',
          fontSize: 13, fontWeight: 500, color: 'var(--color-primary)', fontFamily: 'var(--font-en)',
        }}
        onClick={(e) => {
          e.stopPropagation();
          setYr(today.getFullYear()); setMo(today.getMonth());
          pick(today.getDate());
        }}
      >
        Today
      </button>
      {footer}
    </div>
  );
}

// ── CalendarTimeCell ───────────────────────────────────────────────────────────
export function CalendarTimeCell({ dateISO, time, cellId, openCell, setOpenCell, onDateChange, onTimeChange, onCellClick }: {
  dateISO: string; time: string; cellId: string;
  openCell: string | null; setOpenCell: (id: string | null) => void;
  onDateChange: (iso: string) => void;
  onTimeChange: (t: string) => void;
  onCellClick: () => void;
}) {
  const isOpen = openCell === cellId;
  const triggerRef = useRef<HTMLDivElement>(null);
  const [tempAmPm, setTempAmPm] = useState<'AM' | 'PM'>('AM');
  const [tempHH, setTempHH] = useState('');
  const [tempMM, setTempMM] = useState('');

  // Sync temp state each time overlay opens
  useEffect(() => {
    if (!isOpen) return;
    const [h24str, m24str] = (time || ':').split(':');
    const h24val = parseInt(h24str || '0', 10);
    if (!time) {
      setTempAmPm('AM'); setTempHH(''); setTempMM('');
    } else {
      setTempAmPm(h24val < 12 ? 'AM' : 'PM');
      const h12 = h24val === 0 ? 12 : h24val > 12 ? h24val - 12 : h24val;
      setTempHH(String(h12).padStart(2, '0'));
      setTempMM((m24str || '00').padStart(2, '0'));
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  function applyTime() {
    const h = parseInt(tempHH || '0', 10);
    let h24out: number;
    if (tempAmPm === 'AM') { h24out = h === 12 ? 0 : h; }
    else { h24out = h === 12 ? 12 : h + 12; }
    onTimeChange(`${String(h24out).padStart(2, '0')}:${(tempMM || '00').padStart(2, '0')}`);
    setOpenCell(null);
  }

  // Convert stored 24h time to display string (12h)
  const displayTime = (() => {
    if (!time) return '';
    const [h24str, m24str] = time.split(':');
    const h24val = parseInt(h24str || '0', 10);
    const ampm = h24val < 12 ? 'AM' : 'PM';
    const h12 = h24val === 0 ? 12 : h24val > 12 ? h24val - 12 : h24val;
    return `${String(h12).padStart(2, '0')}:${(m24str || '00').padStart(2, '0')} ${ampm}`;
  })();

  return (
    <div
      ref={triggerRef}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, height: '100%', cursor: 'pointer',
        background: isOpen ? 'var(--color-primary-bg)' : 'transparent',
        borderBottom: isOpen ? '2px solid var(--color-primary)' : '2px solid transparent',
        margin: '0 -12px', padding: '0 12px',
      }}
      onClick={(e) => { e.stopPropagation(); onCellClick(); setOpenCell(isOpen ? null : cellId); }}
    >
      <img src={isOpen ? '/icon/Calendar_selected.svg' : '/icon/Calendar.svg'} alt="" style={{ width: 14, height: 14, flexShrink: 0 }} />
      {dateISO ? (
        <>
          <span style={{ fontSize: 13, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>{isoToDisplay(dateISO)}</span>
          <div style={{ width: 1, height: 14, background: 'var(--color-border-default)', flexShrink: 0 }} />
          <img src="/icon/Clock_selected.svg" alt="" style={{ width: 14, height: 14, flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: 'var(--color-primary)', whiteSpace: 'nowrap' }}>{displayTime || '--:-- --'}</span>
        </>
      ) : (
        <span style={{ fontSize: 13, color: 'var(--color-ink-faint)', whiteSpace: 'nowrap' }}>날짜/시간 선택</span>
      )}
      {isOpen && (
        <SmartOverlay triggerRef={triggerRef} onOutsideClick={() => setOpenCell(null)}>
          <CalendarOverlay
            key={cellId + dateISO}
            dateISO={dateISO}
            onSelect={(iso) => { onDateChange(iso); }}
            footer={
              <div className="ew-calendar-time-row" onClick={e => e.stopPropagation()}>
                <span style={{ fontSize: 12, color: 'var(--color-ink-soft)', fontFamily: 'var(--font-en)', flexShrink: 0 }}>시간</span>
                <button
                  onClick={e => { e.stopPropagation(); setTempAmPm(p => p === 'AM' ? 'PM' : 'AM'); }}
                  style={{ width: 39, height: 32, border: '1px solid var(--color-border-subtle)', borderRadius: 6, background: 'var(--color-bg-subtle)', fontSize: 12, fontFamily: 'var(--font-en)', color: 'var(--color-ink-strong)', cursor: 'pointer', flexShrink: 0 }}
                >{tempAmPm}</button>
                <input
                  type="text" className="ew-time-input" style={{ width: 39 }} placeholder="09" maxLength={2} value={tempHH}
                  onClick={e => e.stopPropagation()}
                  onChange={e => setTempHH(e.target.value.replace(/\D/g, '').slice(0, 2))}
                />
                <span className="ew-time-separator">:</span>
                <input
                  type="text" className="ew-time-input" style={{ width: 34 }} placeholder="00" maxLength={2} value={tempMM}
                  onClick={e => e.stopPropagation()}
                  onChange={e => setTempMM(e.target.value.replace(/\D/g, '').slice(0, 2))}
                />
                <div style={{ flex: 1 }} />
                <button
                  onClick={e => { e.stopPropagation(); applyTime(); }}
                  style={{ width: 45, height: 32, background: 'var(--color-primary)', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-en)', flexShrink: 0 }}
                >Apply</button>
              </div>
            }
          />
        </SmartOverlay>
      )}
    </div>
  );
}

// ── CalendarCell ──────────────────────────────────────────────────────────────
export function CalendarCell({ dateISO, displayDate, cellId, openCell, setOpenCell, onDateChange, onCellClick, onEditDone }: {
  dateISO: string; displayDate: string; cellId: string;
  openCell: string | null; setOpenCell: (id: string | null) => void;
  onDateChange: (iso: string) => void; onCellClick: () => void; onEditDone: () => void;
}) {
  const isOpen = openCell === cellId;
  const triggerRef = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={triggerRef}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, height: '100%', cursor: 'pointer',
        background: isOpen ? 'var(--color-primary-bg)' : 'transparent',
        borderBottom: isOpen ? '2px solid var(--color-primary)' : '2px solid transparent',
        margin: '0 -12px', padding: '0 12px',
      }}
      onClick={(e) => { e.stopPropagation(); onCellClick(); setOpenCell(isOpen ? null : cellId); }}
    >
      <img src={isOpen ? '/icon/Calendar_selected.svg' : '/icon/Calendar.svg'} alt="" style={{ width: 14, height: 14, flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: displayDate ? 'var(--color-text-primary)' : 'var(--color-ink-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {displayDate || '날짜 선택'}
      </span>
      {isOpen && (
        <SmartOverlay triggerRef={triggerRef} onOutsideClick={() => setOpenCell(null)}>
          <CalendarOverlay
            key={cellId + dateISO}
            dateISO={dateISO}
            onSelect={(iso) => { onDateChange(iso); setOpenCell(null); onEditDone(); }}
          />
        </SmartOverlay>
      )}
    </div>
  );
}

// ── GenderCell ────────────────────────────────────────────────────────────────
const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say'];

export function GenderCell({ value, cellId, openCell, setOpenCell, onChange, onCellClick, onEditDone }: {
  value: string; cellId: string;
  openCell: string | null; setOpenCell: (id: string | null) => void;
  onChange: (v: string) => void; onCellClick: () => void; onEditDone: () => void;
}) {
  const isOpen = openCell === cellId;
  const triggerRef = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={triggerRef}
      style={{
        display: 'flex', alignItems: 'center', gap: 4, height: '100%', cursor: 'pointer',
        background: isOpen ? 'var(--color-primary-bg)' : 'transparent',
        borderBottom: isOpen ? '2px solid var(--color-primary)' : '2px solid transparent',
        margin: '0 -12px', padding: '0 12px',
      }}
      onClick={(e) => { e.stopPropagation(); onCellClick(); setOpenCell(isOpen ? null : cellId); }}
    >
      <span style={{ fontSize: 13, color: value ? 'var(--color-ink-mute)' : 'var(--color-ink-faint)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value || '선택'}
      </span>
      <img src={isOpen ? '/icon/arrowup.svg' : '/icon/arrowdown.svg'} alt="" style={{ width: 14, height: 14, flexShrink: 0 }} />
      {isOpen && (
        <SmartOverlay triggerRef={triggerRef} onOutsideClick={() => setOpenCell(null)}>
          <div className="ew-dropdown-overlay" onClick={(e) => e.stopPropagation()}>
            {GENDER_OPTIONS.map(opt => (
              <DropdownItem
                key={opt} label={opt} selected={opt === value}
                onClick={(e) => { e.stopPropagation(); onChange(opt); setOpenCell(null); onEditDone(); }}
              />
            ))}
          </div>
        </SmartOverlay>
      )}
    </div>
  );
}

// ── TagsCell ──────────────────────────────────────────────────────────────────
const TAG_BG = ['var(--color-primary-light)','#F0FDF4','#FFF7ED','#FEF2F2'];
const TAG_CL = ['var(--color-primary)','#22C55E','#F59E0B','#EF4444'];

export function TagsCell({ values }: { values: string[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {values.slice(0, 3).map((v, i) => (
        <span key={v} className="ew-tag" style={{ background: TAG_BG[i % 4], color: TAG_CL[i % 4] }}>{v}</span>
      ))}
      {values.length > 3 && (
        <span className="ew-tag" style={{ background: 'var(--color-bg-subtle)', color: 'var(--color-ink-soft)' }}>+{values.length - 3}</span>
      )}
    </div>
  );
}

// ── StatusCell ────────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  '진행중': { bg: 'var(--color-success-light)', color: 'var(--color-success)' },
  '준비중': { bg: 'var(--color-primary-bg)',                    color: 'var(--color-primary)' },
  '종료':   { bg: 'var(--color-bg-subtle)',                    color: 'var(--color-ink-soft)' },
};

export function StatusCell({ value, options, cellId, openCell, setOpenCell, onChange, onCellClick, onEditDone }: {
  value: string; options: string[]; cellId: string;
  openCell: string | null; setOpenCell: (id: string | null) => void;
  onChange: (v: string) => void; onCellClick: () => void; onEditDone: () => void;
}) {
  const isOpen = openCell === cellId;
  const style  = STATUS_STYLE[value] ?? { bg: 'var(--color-bg-subtle)', color: 'var(--color-ink-soft)' };
  const triggerRef = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={triggerRef}
      style={{ display: 'flex', alignItems: 'center', gap: 4, height: '100%', cursor: 'pointer' }}
      onClick={(e) => { e.stopPropagation(); onCellClick(); setOpenCell(isOpen ? null : cellId); }}
    >
      <span className="ew-tag" style={{ background: style.bg, color: style.color, fontFamily: 'var(--font-ko)' }}>{value}</span>
      <img src={isOpen ? '/icon/arrowup.svg' : '/icon/arrowdown.svg'} alt="" style={{ width: 14, height: 14 }} />
      {isOpen && (
        <SmartOverlay triggerRef={triggerRef} onOutsideClick={() => setOpenCell(null)}>
          <div className="ew-dropdown-overlay" onClick={(e) => e.stopPropagation()}>
            {options.map(opt => (
              <DropdownItem
                key={opt} label={opt} selected={opt === value}
                onClick={(e) => { e.stopPropagation(); onChange(opt); setOpenCell(null); onEditDone(); }}
              />
            ))}
          </div>
        </SmartOverlay>
      )}
    </div>
  );
}

// ── TagList ───────────────────────────────────────────────────────────────────
export function TagList({ items, color }: { items: string[]; color: string }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignContent: 'center' }}>
      {items.map(item => (
        <span key={item} className="ew-tag ew-tag--blue" style={{ background: 'var(--color-primary-light)', color }}>
          {item}
        </span>
      ))}
    </div>
  );
}

// ── CalendarRangeCell ─────────────────────────────────────────────────────────
function CalendarRangeOverlay({ startISO, endISO, onSelect }: {
  startISO: string; endISO: string;
  onSelect: (start: string, end: string) => void;
}) {
  const init = startISO ? new Date(startISO + 'T00:00:00') : new Date();
  const [yr, setYr] = useState(init.getFullYear());
  const [mo, setMo] = useState(init.getMonth());
  const [tempStart,  setTempStart]  = useState(startISO);
  const [tempEnd,    setTempEnd]    = useState(endISO);
  const [picking,    setPicking]    = useState<'start' | 'end'>('start');
  const [pickerSide, setPickerSide] = useState<'left' | 'right' | null>(null);

  const rightMo = mo === 11 ? 0  : mo + 1;
  const rightYr = mo === 11 ? yr + 1 : yr;

  function prevMo() { if (mo === 0) { setYr(y => y - 1); setMo(11); } else setMo(m => m - 1); }
  function nextMo() { if (mo === 11) { setYr(y => y + 1); setMo(0); } else setMo(m => m + 1); }

  function pick(iso: string) {
    if (picking === 'start') {
      setTempStart(iso); setTempEnd(''); setPicking('end');
    } else {
      const s = iso < tempStart ? iso : tempStart;
      const e = iso < tempStart ? tempStart : iso;
      setTempStart(s); setTempEnd(e); setPicking('start');
      // don't close — wait for Apply
    }
  }

  const navBtnStyle: React.CSSProperties = {
    width: 28, height: 28, borderRadius: 6, background: 'var(--color-bg-subtle)',
    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
  };

  function renderMonth(mYr: number, mMo: number) {
    const days  = new Date(mYr, mMo + 1, 0).getDate();
    const first = new Date(mYr, mMo, 1).getDay();
    const cells: Array<number | null> = [];
    for (let i = 0; i < first; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(d);

    return cells.map((d, i) => {
      if (!d) return <div key={`e${i}`} style={{ width: 36, height: 36 }} />;
      const iso     = `${mYr}-${String(mMo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isStart = iso === tempStart;
      const isEnd   = iso === tempEnd;
      const inRange = !!(tempStart && tempEnd && iso > tempStart && iso < tempEnd);

      // wrapper: shows the range rectangle background
      const wrapBg = isStart && tempEnd
        ? 'linear-gradient(to right, transparent 50%, var(--color-primary-light) 50%)'
        : isEnd
        ? 'linear-gradient(to right, var(--color-primary-light) 50%, transparent 50%)'
        : inRange ? 'var(--color-primary-light)' : 'transparent';

      // button: shows circle or transparent
      const btnBg    = (isStart || isEnd) ? 'var(--color-primary)' : 'transparent';
      const btnColor = (isStart || isEnd) ? '#fff' : 'var(--color-ink-strong)';
      const btnWeight = (isStart || isEnd) ? 700 : 400;

      return (
        <div key={d} style={{ width: 36, height: 36, background: wrapBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button
            style={{
              width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: btnBg, color: btnColor, fontWeight: btnWeight,
              fontSize: 13, fontFamily: 'var(--font-en)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', zIndex: 1,
            }}
            onClick={e => { e.stopPropagation(); pick(iso); }}
            onMouseEnter={e => { if (!isStart && !isEnd) (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)'; }}
            onMouseLeave={e => { if (!isStart && !isEnd) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            {d}
          </button>
        </div>
      );
    });
  }

  function renderMonthPanel(mYr: number, mMo: number) {
    return (
      <div style={{ minWidth: 284 }}>
        <div style={{ padding: '8px 8px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 36px)', marginBottom: 4 }}>
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
              <div key={d} style={{ height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, color: 'var(--color-ink-soft)', fontFamily: 'var(--font-en)' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 36px)' }}>
            {renderMonth(mYr, mMo)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ew-calendar-range-overlay" onClick={e => e.stopPropagation()}>
      {/* Two-month layout */}
      <div style={{ display: 'flex' }}>
        {/* Left panel */}
        <div style={{ minWidth: 284, position: 'relative' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', height: 48, padding: '0 8px', borderBottom: '1px solid var(--color-border-subtle)' }}>
            <button style={navBtnStyle} onClick={e => { e.stopPropagation(); prevMo(); }}>
              <img src="/icon/arrow_fill_left.svg" alt="" style={{ width: 12, height: 12 }} />
            </button>
            <button
              style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', fontSize: 14, fontWeight: 600, color: 'var(--color-ink-strong)', fontFamily: 'var(--font-en)', padding: '0 4px', borderRadius: 4 }}
              onClick={e => { e.stopPropagation(); setPickerSide(s => s === 'left' ? null : 'left'); }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
            >
              {CAL_MONTHS[mo]} {yr}
            </button>
            <div style={{ width: 28 }} />
          </div>
          {renderMonthPanel(yr, mo)}
          {pickerSide === 'left' && (
            <MonthYearPicker
              yr={yr} mo={mo}
              onSelect={(y, m) => { setYr(y); setMo(m); }}
              onClose={() => setPickerSide(null)}
            />
          )}
        </div>

        {/* Divider */}
        <div style={{ width: 1, background: 'var(--color-border-subtle)', margin: '15px 0' }} />

        {/* Right panel */}
        <div style={{ minWidth: 284, position: 'relative' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', height: 48, padding: '0 8px', borderBottom: '1px solid var(--color-border-subtle)' }}>
            <div style={{ width: 28 }} />
            <button
              style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', fontSize: 14, fontWeight: 600, color: 'var(--color-ink-strong)', fontFamily: 'var(--font-en)', padding: '0 4px', borderRadius: 4 }}
              onClick={e => { e.stopPropagation(); setPickerSide(s => s === 'right' ? null : 'right'); }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
            >
              {CAL_MONTHS[rightMo]} {rightYr}
            </button>
            <button style={navBtnStyle} onClick={e => { e.stopPropagation(); nextMo(); }}>
              <img src="/icon/arrow_fill_right.svg" alt="" style={{ width: 12, height: 12 }} />
            </button>
          </div>
          {renderMonthPanel(rightYr, rightMo)}
          {pickerSide === 'right' && (
            <MonthYearPicker
              yr={rightYr} mo={rightMo}
              onSelect={(y, m) => {
                // 오른쪽 패널이 선택된 월이 되도록 왼쪽(yr, mo)을 한 달 앞으로
                if (m === 0) { setYr(y - 1); setMo(11); }
                else { setYr(y); setMo(m - 1); }
              }}
              onClose={() => setPickerSide(null)}
            />
          )}
        </div>
      </div>

      {/* Apply button */}
      <div style={{ padding: '0 16px 17px' }}>
        <button
          style={{
            width: '100%', height: 32, background: 'var(--color-primary)', border: 'none', borderRadius: 6,
            color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-en)',
          }}
          onClick={e => {
            e.stopPropagation();
            if (tempStart && tempEnd) onSelect(tempStart, tempEnd);
          }}
        >
          Apply
        </button>
      </div>
    </div>
  );
}

export function CalendarRangeCell({ value, cellId, openCell, setOpenCell, onSave, onCellClick }: {
  value: string; cellId: string;
  openCell: string | null; setOpenCell: (id: string | null) => void;
  onSave: (v: string) => void; onCellClick: () => void;
}) {
  const isOpen = openCell === cellId;
  const triggerRef = useRef<HTMLDivElement>(null);
  const [startISO, endISO] = value.split('||');
  const display = startISO
    ? `${isoToDisplay(startISO)} ~ ${endISO ? endISO.slice(5).replace(/-/g, '/') : '?'}`
    : '날짜 선택';

  return (
    <div
      ref={triggerRef}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, height: '100%', cursor: 'pointer', position: 'relative',
        background: isOpen ? 'var(--color-primary-bg)' : 'transparent',
        borderBottom: isOpen ? '2px solid var(--color-primary)' : '2px solid transparent',
        margin: '0 -12px', padding: '0 12px',
      }}
      onClick={e => { e.stopPropagation(); onCellClick(); setOpenCell(isOpen ? null : cellId); }}
    >
      <img src={isOpen ? '/icon/Calendar_selected.svg' : '/icon/Calendar.svg'} alt="" style={{ width: 14, height: 14, flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: startISO ? 'var(--color-text-primary)' : 'var(--color-ink-faint)', whiteSpace: 'nowrap' }}>{display}</span>
      {isOpen && (
        <SmartOverlay triggerRef={triggerRef} onOutsideClick={() => setOpenCell(null)}>
          <CalendarRangeOverlay
            key={cellId + value}
            startISO={startISO ?? ''}
            endISO={endISO ?? ''}
            onSelect={(s, e) => { onSave(`${s}||${e}`); setOpenCell(null); }}
          />
        </SmartOverlay>
      )}
    </div>
  );
}

// ── ThumbnailCell (UserThumbnail) ─────────────────────────────────────────────
export function ThumbnailCell({ nameKo, nameEn, profileImgUrl }: {
  nameKo: string; nameEn: string; profileImgUrl?: string | null;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {profileImgUrl ? (
        <img src={profileImgUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div className="ew-avatar" style={{ background: avatarColor(nameEn), flexShrink: 0 }}>
          {initials(nameEn)}
        </div>
      )}
      <div style={{ overflow: 'hidden' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nameKo}</div>
        <div style={{ fontSize: 11, color: 'var(--color-text-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nameEn.toLowerCase()}</div>
      </div>
    </div>
  );
}
