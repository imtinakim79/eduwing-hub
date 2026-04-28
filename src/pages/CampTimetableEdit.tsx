// 캠프 시간표 편집 — Figma 529:5820
import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

export interface TimetableEditHandle { flush: () => void; }
import { CalendarRangeCell } from '../components/board/cells';

export interface SlotDef { key: string; label: string; time: string; height: number; }

const DEFAULT_SLOTS: SlotDef[] = [
  { key: 'Morning',   label: 'Morning',   time: '09:00~12:20', height: 80 },
  { key: 'Lunch',     label: 'Lunch',     time: '12:20~13:30', height: 52 },
  { key: 'Afternoon', label: 'Afternoon', time: '13:30~17:00', height: 80 },
  { key: 'Dinner',    label: 'Dinner',    time: '17:00~18:30', height: 52 },
  { key: 'Evening',   label: 'Evening',   time: '19:00~20:30', height: 52 },
];

const BG_COLORS   = ['#B2EDE4', '#BBF7D0', '#FDE68A', '#FEB3A3', '#BFDBFE', '#E2E8F0', '#FEF9C3'];
const FONT_COLORS = ['#0D9488', '#16A34A', '#92400E', '#991B1B', '#1D4ED8', '#475569', '#78350F'];
const DOW_KO = ['일', '월', '화', '수', '목', '금', '토'];

interface CellContent { title: string; content: string; bgColor: string; fontColor: string }
type TimetableData = Record<string, CellContent>;
interface MergeGroup { keys: string[]; master: string; }
interface StoredTimetable { data: TimetableData; merges: MergeGroup[]; }

function cellKey(wIdx: number, dIdx: number, slotKey: string) {
  return `w${wIdx}d${dIdx}s${slotKey}`;
}

function parseCellKey(key: string): { wIdx: number; dIdx: number; slotKey: string } | null {
  const m = key.match(/^w(\d+)d(\d+)s(.+)$/);
  if (!m) return null;
  return { wIdx: +m[1], dIdx: +m[2], slotKey: m[3] };
}

function computeDragSelection(
  drag: { wIdx: number; startD: number; startS: number; curD: number; curS: number },
  slots: SlotDef[],
): Set<string> {
  const { wIdx, startD, startS, curD, curS } = drag;
  const minD = Math.min(startD, curD), maxD = Math.max(startD, curD);
  const minS = Math.min(startS, curS), maxS = Math.max(startS, curS);
  const keys = new Set<string>();
  for (let d = minD; d <= maxD; d++)
    for (let s = minS; s <= maxS; s++)
      keys.add(cellKey(wIdx, d, slots[s].key));
  return keys;
}

function buildMergeMap(
  merges: MergeGroup[],
  weekIdx: number,
  slots: SlotDef[],
): Record<string, { hidden: boolean; rowSpan: number; colSpan: number }> {
  const map: Record<string, { hidden: boolean; rowSpan: number; colSpan: number }> = {};
  for (const mg of merges) {
    const parsed = mg.keys
      .map(parseCellKey)
      .filter((p): p is NonNullable<typeof p> => p !== null && p.wIdx === weekIdx);
    if (!parsed.length) continue;
    const dIdxs = parsed.map(p => p.dIdx);
    const sIdxs = parsed.map(p => slots.findIndex(s => s.key === p.slotKey));
    const minD = Math.min(...dIdxs), maxD = Math.max(...dIdxs);
    const minS = Math.min(...sIdxs), maxS = Math.max(...sIdxs);
    for (const p of parsed) {
      const sIdx = slots.findIndex(s => s.key === p.slotKey);
      const isMaster = p.dIdx === minD && sIdx === minS;
      map[cellKey(weekIdx, p.dIdx, p.slotKey)] = {
        hidden: !isMaster,
        rowSpan: isMaster ? maxS - minS + 1 : 1,
        colSpan: isMaster ? maxD - minD + 1 : 1,
      };
    }
  }
  return map;
}

function addDays(iso: string, n: number) {
  const d = new Date(iso); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10);
}

function countWeeks(start: string, end: string): number {
  if (!start || !end || start > end) return 0;
  let cur = start, count = 0;
  while (cur <= end) { count++; cur = addDays(cur, 7); }
  return count;
}

function generateWeeks(startDate: string, endDate: string) {
  if (!startDate || !endDate || startDate > endDate) return [];
  const weeks: { weekNum: number; days: string[] }[] = [];
  let cur = startDate, weekNum = 1;
  while (cur <= endDate) {
    weeks.push({
      weekNum,
      days: Array.from({ length: 7 }, (_, i) => { const d = addDays(cur, i); return d <= endDate ? d : ''; }),
    });
    cur = addDays(cur, 7); weekNum++;
  }
  return weeks;
}

// ── Storage helpers ───────────────────────────────────────────────────────────
function loadStored(id?: string): StoredTimetable {
  if (!id) return { data: {}, merges: [] };
  try {
    const r = localStorage.getItem(`ew-timetable-${id}`);
    if (!r) return { data: {}, merges: [] };
    const p = JSON.parse(r);
    if (p && typeof p === 'object' && 'data' in p && 'merges' in p) return p as StoredTimetable;
    return { data: p as TimetableData, merges: [] };
  } catch { return { data: {}, merges: [] }; }
}

function persistStored(id: string, stored: StoredTimetable) {
  try { localStorage.setItem(`ew-timetable-${id}`, JSON.stringify(stored)); } catch {}
}

function trimAndPersistData(id: string, newWeekCount: number) {
  const stored = loadStored(id);
  const trimmedData: TimetableData = {};
  for (const [key, val] of Object.entries(stored.data)) {
    const p = parseCellKey(key);
    if (p && p.wIdx < newWeekCount) trimmedData[key] = val;
  }
  const trimmedMerges = stored.merges.filter(mg =>
    mg.keys.every(k => { const p = parseCellKey(k); return p && p.wIdx < newWeekCount; })
  );
  persistStored(id, { data: trimmedData, merges: trimmedMerges });
}

function loadRange(id?: string): { start: string; end: string } {
  if (!id) return { start: '', end: '' };
  try { const r = localStorage.getItem(`ew-timetable-range-${id}`); return r ? JSON.parse(r) : { start: '', end: '' }; }
  catch { return { start: '', end: '' }; }
}

function persistRange(id: string, start: string, end: string) {
  try { localStorage.setItem(`ew-timetable-range-${id}`, JSON.stringify({ start, end })); } catch {}
}

function loadSlots(campId?: string): SlotDef[] {
  if (!campId) return DEFAULT_SLOTS;
  try {
    const r = localStorage.getItem(`ew-timetable-slots-${campId}`);
    return r ? JSON.parse(r) : DEFAULT_SLOTS;
  } catch { return DEFAULT_SLOTS; }
}

function persistSlots(campId: string, slots: SlotDef[]) {
  try { localStorage.setItem(`ew-timetable-slots-${campId}`, JSON.stringify(slots)); } catch {}
}

function loadClassIds(campId: string): string[] {
  try {
    const r = localStorage.getItem(`ew-classes-${campId}`);
    if (!r) return [];
    const classes = JSON.parse(r);
    return Array.isArray(classes) ? classes.map((c: { id: string }) => c.id) : [];
  } catch { return []; }
}

// ── Color picker ─────────────────────────────────────────────────────────────
function ColorPicker({ label, colors, value, onChange }: { label: string; colors: string[]; value: string; onChange: (c: string) => void }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--color-text-sub)', fontFamily: 'var(--font-ko)', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {colors.map(c => (
          <button key={c} onClick={() => onChange(c)}
            style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: value === c ? '2px solid #374151' : '2px solid #E5E7EB', cursor: 'pointer', padding: 0 }} />
        ))}
      </div>
    </div>
  );
}

// ── Editable grid ─────────────────────────────────────────────────────────────
interface GridProps {
  days: string[];
  weekIdx: number;
  slots: SlotDef[];
  data: TimetableData;
  merges: MergeGroup[];
  liveSelectedKeys: Set<string>;
  onMouseDown: (wIdx: number, dIdx: number, sIdx: number) => void;
  onMouseEnter: (wIdx: number, dIdx: number, sIdx: number) => void;
}

function EditableGrid({ days, weekIdx, slots, data, merges, liveSelectedKeys, onMouseDown, onMouseEnter }: GridProps) {
  const mergeMap = buildMergeMap(merges, weekIdx, slots);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `100px repeat(7, 1fr)`,
      gridTemplateRows: `auto ${slots.map(s => `${s.height}px`).join(' ')}`,
      border: '1px solid #C8D0D8',
      borderRadius: 4,
      overflow: 'hidden',
      userSelect: 'none',
    }}>
      <div style={{ gridRow: 1, gridColumn: 1, padding: '8px 12px', fontSize: 12, color: 'var(--color-text-sub)', textAlign: 'center', borderRight: '1px solid #C8D0D8', borderBottom: '1px solid #C8D0D8', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        시간대
      </div>

      {days.map((date, dIdx) => (
        <div key={`h${dIdx}`} style={{ gridRow: 1, gridColumn: dIdx + 2, padding: '6px 4px', textAlign: 'center', borderRight: dIdx < 6 ? '1px solid #C8D0D8' : 'none', borderBottom: '1px solid #C8D0D8', background: '#F9FAFB' }}>
          {date && (
            <>
              <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-ko)', color: 'var(--color-text-primary)' }}>Day {weekIdx * 7 + dIdx + 1}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-sub)', fontFamily: 'var(--font-ko)' }}>
                {(() => { const d = new Date(date); return `${d.getMonth()+1}월 ${d.getDate()}일(${DOW_KO[d.getDay()]})`; })()}
              </div>
            </>
          )}
        </div>
      ))}

      {slots.flatMap((slot, sIdx) => [
        <div key={`lbl-${slot.key}`} style={{ gridRow: sIdx + 2, gridColumn: 1, padding: '8px', borderRight: '1px solid #C8D0D8', borderBottom: sIdx < slots.length - 1 ? '1px solid #C8D0D8' : 'none', background: '#F9FAFB', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-en)', color: 'var(--color-text-primary)' }}>{slot.label}</span>
          <span style={{ fontSize: 10, fontFamily: 'var(--font-en)', color: 'var(--color-text-muted)' }}>{slot.time}</span>
        </div>,
        ...days.map((date, dIdx) => {
          const key = cellKey(weekIdx, dIdx, slot.key);
          const mi = mergeMap[key];
          if (mi?.hidden) return null;
          const isSelected = liveSelectedKeys.has(key);
          const isEmpty = !date;
          const cell = data[key];
          const rowSpan = mi?.rowSpan ?? 1;
          const colSpan = mi?.colSpan ?? 1;
          return (
            <div
              key={key}
              onMouseDown={e => { e.preventDefault(); if (!isEmpty) onMouseDown(weekIdx, dIdx, sIdx); }}
              onMouseEnter={() => { if (!isEmpty) onMouseEnter(weekIdx, dIdx, sIdx); }}
              style={{
                gridRow: `${sIdx + 2} / span ${rowSpan}`,
                gridColumn: `${dIdx + 2} / span ${colSpan}`,
                padding: '6px',
                borderRight: dIdx + colSpan - 1 < 6 ? '1px solid #C8D0D8' : 'none',
                borderBottom: sIdx + rowSpan - 1 < slots.length - 1 ? '1px solid #C8D0D8' : 'none',
                background: cell?.bgColor ?? (isSelected ? '#EEF3FD' : 'transparent'),
                cursor: isEmpty ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                outline: isSelected ? '2px solid var(--color-primary)' : 'none',
                outlineOffset: -2, boxSizing: 'border-box',
              }}
            >
              {cell ? (
                <span style={{ fontSize: 12, color: cell.fontColor, fontFamily: 'var(--font-en)', lineHeight: 1.4 }}>{cell.title}</span>
              ) : !isEmpty ? (
                <span style={{ fontSize: 20, color: '#D1D5DB', lineHeight: 1 }}>+</span>
              ) : null}
            </div>
          );
        }),
      ])}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
interface CampTimetableEditProps {
  campId?: string;
  classId?: string;
  startDate?: string;
  endDate?: string;
  onDateRangeChange?: (start: string, end: string) => void;
}

const CampTimetableEdit = forwardRef<TimetableEditHandle, CampTimetableEditProps>(
function CampTimetableEdit({ campId, classId, startDate: initStart, endDate: initEnd, onDateRangeChange }, ref) {
  const effectiveId = campId && classId ? `${campId}-${classId}` : campId;

  const [rangeStart, setRangeStart] = useState(() => loadRange(effectiveId).start || initStart || '');
  const [rangeEnd,   setRangeEnd]   = useState(() => loadRange(effectiveId).end   || initEnd   || '');
  const [openCell,   setOpenCell]   = useState<string | null>(null);

  const [data,   setData]   = useState<TimetableData>(() => loadStored(effectiveId).data);
  const [merges, setMerges] = useState<MergeGroup[]>(() => loadStored(effectiveId).merges);

  // Slot state — campId-level (shared across all classes)
  const [slots, setSlots] = useState<SlotDef[]>(() => loadSlots(campId));
  const [editingSlotKey, setEditingSlotKey] = useState<string | null>(null);
  const [editSlotLabel,  setEditSlotLabel]  = useState('');
  const [editSlotTime,   setEditSlotTime]   = useState('');

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [title,        setTitle]        = useState('');
  const [content,      setContent]      = useState('');
  const [bgColor,      setBgColor]      = useState(BG_COLORS[0]);
  const [fontColor,    setFontColor]    = useState(FONT_COLORS[0]);

  const dragRef = useRef<{ active: boolean; wIdx: number; startD: number; startS: number; curD: number; curS: number } | null>(null);
  const [dragVer, setDragVer] = useState(0);

  const editRef = useRef({ selectedKeys, title, content, bgColor, fontColor, data, merges, effectiveId });
  editRef.current = { selectedKeys, title, content, bgColor, fontColor, data, merges, effectiveId };

  useImperativeHandle(ref, () => ({
    flush() {
      const { selectedKeys: keys, title: t, content: c, bgColor: bg, fontColor: fc, data: d, merges: m, effectiveId: cid } = editRef.current;
      if (keys.size === 1 && cid) {
        const [key] = Array.from(keys);
        persistStored(cid, { data: { ...d, [key]: { title: t, content: c, bgColor: bg, fontColor: fc } }, merges: m });
      }
    },
  }));

  useEffect(() => {
    return () => {
      const { selectedKeys: keys, title: t, content: c, bgColor: bg, fontColor: fc, data: d, merges: m, effectiveId: cid } = editRef.current;
      if (keys.size === 1 && cid) {
        const [key] = Array.from(keys);
        persistStored(cid, { data: { ...d, [key]: { title: t, content: c, bgColor: bg, fontColor: fc } }, merges: m });
      }
    };
  }, []);

  const mouseUpRef = useRef<() => void>(() => {});
  mouseUpRef.current = () => {
    if (!dragRef.current?.active) return;
    const drag = dragRef.current;
    drag.active = false;
    const keys = computeDragSelection(drag, slots);
    setSelectedKeys(keys);
    if (keys.size === 1) {
      const [key] = Array.from(keys);
      const existing = data[key];
      if (existing) {
        setTitle(existing.title); setContent(existing.content);
        setBgColor(existing.bgColor); setFontColor(existing.fontColor);
      } else {
        setTitle(''); setContent(''); setBgColor(BG_COLORS[0]); setFontColor(FONT_COLORS[0]);
      }
    }
    setDragVer(v => v + 1);
  };
  useEffect(() => {
    const handler = () => mouseUpRef.current();
    document.addEventListener('mouseup', handler);
    return () => document.removeEventListener('mouseup', handler);
  }, []);

  const weeks = generateWeeks(rangeStart, rangeEnd);

  const liveSelectedKeys: Set<string> = (dragVer >= 0 && dragRef.current?.active)
    ? computeDragSelection(dragRef.current, slots)
    : selectedKeys;

  // ── Range change: apply to all classes ──────────────────────────────────────
  function handleRangeChange(s: string, e: string) {
    const oldWeekCount = countWeeks(rangeStart, rangeEnd);
    const newWeekCount = countWeeks(s, e);
    setRangeStart(s); setRangeEnd(e);

    if (!campId) return;
    const classIds = loadClassIds(campId);
    for (const cId of classIds) {
      const eid = `${campId}-${cId}`;
      persistRange(eid, s, e);
      if (newWeekCount < oldWeekCount) trimAndPersistData(eid, newWeekCount);
    }
    // Current class
    if (effectiveId) {
      persistRange(effectiveId, s, e);
      if (newWeekCount < oldWeekCount) {
        trimAndPersistData(effectiveId, newWeekCount);
        const refreshed = loadStored(effectiveId);
        setData(refreshed.data);
        setMerges(refreshed.merges);
      }
    }
    onDateRangeChange?.(s, e);
  }

  // ── Slot management ──────────────────────────────────────────────────────────
  function startEditSlot(slot: SlotDef) {
    setEditingSlotKey(slot.key);
    setEditSlotLabel(slot.label);
    setEditSlotTime(slot.time);
  }

  function handleSlotSave() {
    const updated = slots.map(s => s.key === editingSlotKey
      ? { ...s, label: editSlotLabel, time: editSlotTime }
      : s
    );
    setSlots(updated);
    if (campId) persistSlots(campId, updated);
    setEditingSlotKey(null);
  }

  function handleSlotDelete(key: string) {
    if (slots.length <= 1) return;
    const updated = slots.filter(s => s.key !== key);
    setSlots(updated);
    if (campId) persistSlots(campId, updated);
  }

  function handleSlotAdd() {
    const newSlot: SlotDef = { key: `slot-${Date.now()}`, label: 'New Slot', time: '00:00~00:00', height: 52 };
    const updated = [...slots, newSlot];
    setSlots(updated);
    if (campId) persistSlots(campId, updated);
    setEditingSlotKey(newSlot.key);
    setEditSlotLabel(newSlot.label);
    setEditSlotTime(newSlot.time);
  }

  // ── Cell interaction ─────────────────────────────────────────────────────────
  function handleMouseDown(wIdx: number, dIdx: number, sIdx: number) {
    if (selectedKeys.size === 1) {
      const [key] = Array.from(selectedKeys);
      const newData = { ...data, [key]: { title, content, bgColor, fontColor } };
      setData(newData);
      if (effectiveId) persistStored(effectiveId, { data: newData, merges });
    }
    dragRef.current = { active: true, wIdx, startD: dIdx, startS: sIdx, curD: dIdx, curS: sIdx };
    setSelectedKeys(new Set());
    setDragVer(v => v + 1);
  }

  function handleMouseEnter(wIdx: number, dIdx: number, sIdx: number) {
    if (!dragRef.current?.active || dragRef.current.wIdx !== wIdx) return;
    dragRef.current.curD = dIdx;
    dragRef.current.curS = sIdx;
    setDragVer(v => v + 1);
  }

  function handleSave() {
    if (selectedKeys.size !== 1) return;
    const [key] = Array.from(selectedKeys);
    const newData = { ...data, [key]: { title, content, bgColor, fontColor } };
    setData(newData);
    if (effectiveId) persistStored(effectiveId, { data: newData, merges });
    setSelectedKeys(new Set());
  }

  function handleCancel() {
    setSelectedKeys(new Set());
    setTitle(''); setContent('');
  }

  function handleMerge() {
    if (selectedKeys.size < 2) return;
    const parsed = Array.from(selectedKeys).map(parseCellKey).filter((p): p is NonNullable<typeof p> => p !== null);
    const wIdx = parsed[0].wIdx;
    if (!parsed.every(p => p.wIdx === wIdx)) return;

    const dIdxs = parsed.map(p => p.dIdx);
    const sIdxs = parsed.map(p => slots.findIndex(s => s.key === p.slotKey));
    const minD = Math.min(...dIdxs), maxD = Math.max(...dIdxs);
    const minS = Math.min(...sIdxs), maxS = Math.max(...sIdxs);

    const rectKeys: string[] = [];
    for (let d = minD; d <= maxD; d++)
      for (let s = minS; s <= maxS; s++)
        rectKeys.push(cellKey(wIdx, d, slots[s].key));

    const master = cellKey(wIdx, minD, slots[minS].key);
    const newMerge: MergeGroup = { keys: rectKeys, master };
    const newMerges = [...merges.filter(mg => !mg.keys.some(k => rectKeys.includes(k))), newMerge];

    setMerges(newMerges);
    if (effectiveId) persistStored(effectiveId, { data, merges: newMerges });

    setSelectedKeys(new Set([master]));
    const existing = data[master];
    if (existing) {
      setTitle(existing.title); setContent(existing.content);
      setBgColor(existing.bgColor); setFontColor(existing.fontColor);
    } else {
      setTitle(''); setContent(''); setBgColor(BG_COLORS[0]); setFontColor(FONT_COLORS[0]);
    }
  }

  const isSingleSel = selectedKeys.size === 1;
  const isMultiSel  = selectedKeys.size > 1;
  const panelMode   = selectedKeys.size === 0 ? 'slots' : isSingleSel ? 'editCell' : 'mergeCell';

  const selectedMerge = isSingleSel
    ? merges.find(mg => mg.master === Array.from(selectedKeys)[0])
    : undefined;

  function handleSplit() {
    if (!selectedMerge) return;
    const newData = { ...data };
    selectedMerge.keys.forEach(k => { if (k !== selectedMerge.master) delete newData[k]; });
    const newMerges = merges.filter(mg => mg.master !== selectedMerge.master);
    setData(newData);
    setMerges(newMerges);
    if (effectiveId) persistStored(effectiveId, { data: newData, merges: newMerges });
  }

  const slotInputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', border: '1px solid #D1D5DB',
    borderRadius: 4, padding: '4px 8px', fontSize: 12, fontFamily: 'var(--font-en)', outline: 'none',
  };

  return (
    <div style={{ display: 'flex', minHeight: 400 }}>

      {/* ── 좌측: 기간 입력 + 그리드 ── */}
      <div style={{ flex: 1, padding: '20px 24px', overflowX: 'auto', minWidth: 0 }}>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-ko)', marginBottom: 10 }}>캠프 기간 입력</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ height: 40, padding: '0 12px', border: '1px solid #D1D5DB', borderRadius: 6, background: '#fff', width: 280, position: 'relative', overflow: 'visible', display: 'flex', alignItems: 'center' }}>
              <CalendarRangeCell
                value={rangeStart && rangeEnd ? `${rangeStart}||${rangeEnd}` : ''}
                cellId="timetable-period"
                openCell={openCell}
                setOpenCell={setOpenCell}
                onSave={v => {
                  const [s, e] = v.split('||');
                  handleRangeChange(s ?? '', e ?? '');
                }}
                onCellClick={() => {}}
              />
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-ko)', lineHeight: 1.6 }}>
              ※ 캠프 기간을 입력하시면 시간표 세팅이 가능합니다.<br />한 주단위로 입력장이 생성됩니다.
            </div>
          </div>
        </div>

        {weeks.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-ko)' }}>시간표 입력</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-ko)' }}>※ 셀을 드래그하여 다중 선택 후 칸합치기가 가능합니다.</div>
            </div>

            {weeks.map((week, wIdx) => (
              <div key={wIdx} style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-en)', color: 'var(--color-text-primary)', marginBottom: 8 }}>
                  Week{wIdx + 1}  {rangeStart} ~ {rangeEnd}
                </div>
                <EditableGrid
                  days={week.days}
                  weekIdx={wIdx}
                  slots={slots}
                  data={data}
                  merges={merges}
                  liveSelectedKeys={liveSelectedKeys}
                  onMouseDown={handleMouseDown}
                  onMouseEnter={handleMouseEnter}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 우측: 편집 패널 (항상 표시) ── */}
      <div style={{ width: 210, borderLeft: '1px solid var(--color-border-table)', padding: '20px 16px', background: '#fff', display: 'flex', flexDirection: 'column', gap: 16, flexShrink: 0 }}>

        {/* ── 슬롯 관리 모드 ── */}
        {panelMode === 'slots' && (
          <>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-ko)' }}>슬롯 관리</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {slots.map(slot => (
                editingSlotKey === slot.key ? (
                  <div key={slot.key} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px', background: '#F9FAFB', borderRadius: 4, border: '1px solid #E5E7EB' }}>
                    <input
                      value={editSlotLabel}
                      onChange={e => setEditSlotLabel(e.target.value)}
                      placeholder="슬롯명"
                      style={slotInputStyle}
                    />
                    <input
                      value={editSlotTime}
                      onChange={e => setEditSlotTime(e.target.value)}
                      placeholder="00:00~00:00"
                      style={slotInputStyle}
                    />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="ew-btn ew-btn--primary ew-btn--sm" onClick={handleSlotSave} style={{ flex: 1 }}>저장</button>
                      <button className="ew-btn ew-btn--ghost ew-btn--sm" onClick={() => setEditingSlotKey(null)} style={{ flex: 1 }}>취소</button>
                    </div>
                  </div>
                ) : (
                  <div key={slot.key} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 4px', borderRadius: 4 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-en)', color: 'var(--color-text-primary)' }}>{slot.label}</div>
                      <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'var(--font-en)' }}>{slot.time}</div>
                    </div>
                    <button
                      onClick={() => startEditSlot(slot)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontSize: 12, color: 'var(--color-text-sub)' }}
                      title="수정"
                    >✏</button>
                    <button
                      onClick={() => handleSlotDelete(slot.key)}
                      disabled={slots.length <= 1}
                      style={{ background: 'none', border: 'none', cursor: slots.length <= 1 ? 'not-allowed' : 'pointer', padding: '2px 4px', fontSize: 12, color: slots.length <= 1 ? '#D1D5DB' : '#EF4444' }}
                      title="삭제"
                    >✕</button>
                  </div>
                )
              ))}
            </div>

            <button className="ew-btn ew-btn--ghost ew-btn--sm" onClick={handleSlotAdd} style={{ width: '100%' }}>
              + 슬롯 추가
            </button>

            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-ko)', textAlign: 'center', lineHeight: 1.5 }}>
              모든 클래스에 공통 적용됩니다
            </div>
          </>
        )}

        {/* ── 셀 편집 모드 ── */}
        {panelMode !== 'slots' && (
          <>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="ew-btn ew-btn--ghost ew-btn--sm" onClick={handleCancel} style={{ flex: 1 }}>취소</button>
              {isSingleSel && (
                <button className="ew-btn ew-btn--primary ew-btn--sm" onClick={handleSave} style={{ flex: 1 }}>저장</button>
              )}
              {isMultiSel && (
                <button className="ew-btn ew-btn--primary ew-btn--sm" onClick={handleMerge} style={{ flex: 1 }}>칸합치기</button>
              )}
            </div>
            {selectedMerge && (
              <button className="ew-btn ew-btn--ghost ew-btn--sm" onClick={handleSplit} style={{ width: '100%' }}>셀 분할</button>
            )}

            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-ko)' }}>
              {isMultiSel ? `셀 ${selectedKeys.size}개 선택` : '일정 추가'}
            </div>

            {isSingleSel && (
              <>
                <ColorPicker label="BG Color"   colors={BG_COLORS}   value={bgColor}   onChange={setBgColor} />
                <ColorPicker label="Font Color" colors={FONT_COLORS} value={fontColor} onChange={setFontColor} />

                <input
                  value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="제목 추가"
                  style={{ border: 'none', borderBottom: '1px solid #D1D5DB', outline: 'none', fontSize: 13, padding: '4px 0', fontFamily: 'var(--font-ko)', width: '100%', boxSizing: 'border-box' }}
                />

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-sub)', fontFamily: 'var(--font-ko)', marginBottom: 6 }}>내용</div>
                  <textarea
                    value={content} onChange={e => setContent(e.target.value)}
                    placeholder="활동 내용을 입력하세요.&#10;예) British boarding school presentation program"
                    style={{ width: '100%', minHeight: 90, border: '1px solid #E5E7EB', borderRadius: 4, padding: '8px', fontSize: 12, fontFamily: 'var(--font-ko)', resize: 'vertical', outline: 'none', boxSizing: 'border-box', color: 'var(--color-text-primary)' }}
                  />
                </div>
              </>
            )}

            {isMultiSel && (
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-ko)', lineHeight: 1.7 }}>
                선택된 셀을 하나로 합칩니다.<br />합쳐진 셀은 좌측 상단을 기준으로 내용이 표시됩니다.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});

export default CampTimetableEdit;
