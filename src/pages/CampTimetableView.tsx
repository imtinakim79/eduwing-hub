// 캠프 시간표 보기 — Figma 511:3204
type TimeSlot = 'Morning' | 'Lunch' | 'Afternoon' | 'Dinner' | 'Evening';

const SLOTS: { key: TimeSlot; label: string; time: string; height: number }[] = [
  { key: 'Morning',   label: 'Morning',   time: '09:00~12:20', height: 80 },
  { key: 'Lunch',     label: 'Lunch',     time: '12:20~13:30', height: 52 },
  { key: 'Afternoon', label: 'Afternoon', time: '13:30~17:00', height: 80 },
  { key: 'Dinner',    label: 'Dinner',    time: '17:00~18:30', height: 52 },
  { key: 'Evening',   label: 'Evening',   time: '19:00~20:30', height: 52 },
];

const DOW_KO = ['일', '월', '화', '수', '목', '금', '토'];

interface CellContent { title: string; content: string; bgColor: string; fontColor: string }
type TimetableData = Record<string, CellContent>;
interface MergeGroup { keys: string[]; master: string; }
interface StoredTimetable { data: TimetableData; merges: MergeGroup[]; }

function cellKey(wIdx: number, dIdx: number, slot: TimeSlot) {
  return `w${wIdx}d${dIdx}s${slot}`;
}

function parseCellKey(key: string): { wIdx: number; dIdx: number; slot: TimeSlot } | null {
  const m = key.match(/^w(\d+)d(\d+)s(.+)$/);
  if (!m) return null;
  return { wIdx: +m[1], dIdx: +m[2], slot: m[3] as TimeSlot };
}

function buildMergeMap(merges: MergeGroup[], weekIdx: number): Record<string, { hidden: boolean; rowSpan: number; colSpan: number }> {
  const map: Record<string, { hidden: boolean; rowSpan: number; colSpan: number }> = {};
  for (const mg of merges) {
    const parsed = mg.keys
      .map(parseCellKey)
      .filter((p): p is NonNullable<typeof p> => p !== null && p.wIdx === weekIdx);
    if (!parsed.length) continue;
    const dIdxs = parsed.map(p => p.dIdx);
    const sIdxs = parsed.map(p => SLOTS.findIndex(s => s.key === p.slot));
    const minD = Math.min(...dIdxs), maxD = Math.max(...dIdxs);
    const minS = Math.min(...sIdxs), maxS = Math.max(...sIdxs);
    for (const p of parsed) {
      const sIdx = SLOTS.findIndex(s => s.key === p.slot);
      const isMaster = p.dIdx === minD && sIdx === minS;
      map[cellKey(weekIdx, p.dIdx, p.slot)] = {
        hidden: !isMaster,
        rowSpan: isMaster ? maxS - minS + 1 : 1,
        colSpan: isMaster ? maxD - minD + 1 : 1,
      };
    }
  }
  return map;
}

function addDays(iso: string, n: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function generateWeeks(startDate: string, endDate: string) {
  const weeks: { weekNum: number; days: string[] }[] = [];
  let cur = startDate;
  let weekNum = 1;
  while (cur <= endDate) {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(cur, i);
      return d <= endDate ? d : '';
    });
    weeks.push({ weekNum, days });
    cur = addDays(cur, 7);
    weekNum++;
  }
  return weeks;
}

function loadStored(campId: string): StoredTimetable {
  try {
    const r = localStorage.getItem(`ew-timetable-${campId}`);
    if (!r) return { data: {}, merges: [] };
    const p = JSON.parse(r);
    if (p && typeof p === 'object' && 'data' in p && 'merges' in p) return p as StoredTimetable;
    return { data: p as TimetableData, merges: [] };
  } catch { return { data: {}, merges: [] }; }
}

function loadRange(campId: string): { start: string; end: string } {
  try { const r = localStorage.getItem(`ew-timetable-range-${campId}`); return r ? JSON.parse(r) : { start: '', end: '' }; }
  catch { return { start: '', end: '' }; }
}

// ── Grid ─────────────────────────────────────────────────────────────────────
function TimetableGrid({ days, weekIdx, data, merges }: {
  days: string[];
  weekIdx: number;
  data: TimetableData;
  merges: MergeGroup[];
}) {
  const mergeMap = buildMergeMap(merges, weekIdx);

  const gridTemplateColumns = `100px repeat(7, 1fr)`;
  const gridTemplateRows = `auto ${SLOTS.map(s => `${s.height}px`).join(' ')}`;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns,
      gridTemplateRows,
      border: '1px solid #C8D0D8',
      borderRadius: 4,
      overflow: 'hidden',
    }}>
      {/* Header row: time-label cell */}
      <div style={{ gridRow: 1, gridColumn: 1, padding: '8px 12px', fontSize: 12, color: 'var(--color-text-sub)', textAlign: 'center', borderRight: '1px solid #C8D0D8', borderBottom: '1px solid #C8D0D8', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        시간대
      </div>

      {/* Header row: day columns */}
      {days.map((date, dIdx) => (
        <div key={`h${dIdx}`} style={{ gridRow: 1, gridColumn: dIdx + 2, padding: '6px 4px', textAlign: 'center', borderRight: dIdx < 6 ? '1px solid #C8D0D8' : 'none', borderBottom: '1px solid #C8D0D8', background: '#F9FAFB' }}>
          {date && (
            <>
              <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-ko)', color: 'var(--color-text-primary)' }}>
                Day {weekIdx * 7 + dIdx + 1}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-sub)', fontFamily: 'var(--font-ko)' }}>
                {(() => { const d = new Date(date); return `${d.getMonth()+1}월 ${d.getDate()}일(${DOW_KO[d.getDay()]})`; })()}
              </div>
            </>
          )}
        </div>
      ))}

      {/* Slot label cells */}
      {SLOTS.map((slot, sIdx) => (
        <div key={`lbl-${slot.key}`} style={{ gridRow: sIdx + 2, gridColumn: 1, padding: '8px', borderRight: '1px solid #C8D0D8', borderBottom: sIdx < SLOTS.length - 1 ? '1px solid #C8D0D8' : 'none', background: '#F9FAFB', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-en)', color: 'var(--color-text-primary)' }}>{slot.label}</span>
          <span style={{ fontSize: 10, fontFamily: 'var(--font-en)', color: 'var(--color-text-muted)' }}>{slot.time}</span>
        </div>
      ))}

      {/* Data cells */}
      {SLOTS.map((slot, sIdx) =>
        days.map((_, dIdx) => {
          const key = cellKey(weekIdx, dIdx, slot.key);
          const merge = mergeMap[key];
          if (merge?.hidden) return null;

          const rowSpan = merge?.rowSpan ?? 1;
          const colSpan = merge?.colSpan ?? 1;
          const cell = data[key] ?? null;

          const isLastRow = sIdx + rowSpan - 1 >= SLOTS.length - 1;
          const isLastCol = dIdx + colSpan - 1 >= 6;

          return (
            <div
              key={key}
              style={{
                gridRow: `${sIdx + 2} / span ${rowSpan}`,
                gridColumn: `${dIdx + 2} / span ${colSpan}`,
                borderRight: isLastCol ? 'none' : '1px solid #C8D0D8',
                borderBottom: isLastRow ? 'none' : '1px solid #C8D0D8',
                background: cell?.bgColor ?? 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '8px 6px', textAlign: 'center',
              }}
            >
              {cell && (
                <span style={{ fontSize: 12, color: cell.fontColor, fontFamily: 'var(--font-en)', lineHeight: 1.4 }}>
                  {cell.title}
                </span>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function CampTimetableView({ campId, classId }: { campId: string; classId?: string }) {
  const effectiveId = classId ? `${campId}-${classId}` : campId;
  const { start: startDate, end: endDate } = loadRange(effectiveId);

  if (!startDate || !endDate) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)', fontFamily: 'var(--font-ko)', fontSize: 14 }}>
        캠프 기간 정보가 없습니다.<br />
        <span style={{ fontSize: 12 }}>시간표 수정에서 캠프 기간을 먼저 입력해주세요.</span>
      </div>
    );
  }

  const weeks = generateWeeks(startDate, endDate);
  const { data, merges } = loadStored(effectiveId);

  return (
    <div style={{ padding: '16px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 20 }}>
        <button className="ew-btn ew-btn--ghost ew-btn--sm">인쇄</button>
        <button className="ew-btn ew-btn--ghost ew-btn--sm">공유</button>
        <button className="ew-btn ew-btn--ghost ew-btn--sm">다운로드</button>
      </div>

      {weeks.map((week, wIdx) => (
        <div key={wIdx} style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-en)', color: 'var(--color-text-primary)', marginBottom: 8 }}>
            {wIdx + 1} Week
          </div>
          <TimetableGrid days={week.days} weekIdx={wIdx} data={data} merges={merges} />
        </div>
      ))}
    </div>
  );
}
