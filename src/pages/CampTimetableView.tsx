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

function loadSaved(campId: string): TimetableData {
  try {
    const r = localStorage.getItem(`ew-timetable-${campId}`);
    if (!r) return {};
    const p = JSON.parse(r);
    if (p && typeof p === 'object' && 'data' in p) return p.data as TimetableData;
    return p as TimetableData;
  } catch { return {}; }
}

function loadRange(campId: string): { start: string; end: string } {
  try { const r = localStorage.getItem(`ew-timetable-range-${campId}`); return r ? JSON.parse(r) : { start: '', end: '' }; }
  catch { return { start: '', end: '' }; }
}

function cellKey(wIdx: number, dIdx: number, slot: TimeSlot) {
  return `w${wIdx}d${dIdx}s${slot}`;
}

// ── Grid ─────────────────────────────────────────────────────────────────────
function TimetableGrid({ days, weekIdx, getCell }: {
  days: string[];
  weekIdx: number;
  getCell: (dIdx: number, slot: TimeSlot) => CellContent | null;
}) {
  return (
    <div style={{ border: '1px solid #C8D0D8', borderRadius: 4, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', borderBottom: '1px solid #C8D0D8', background: '#F9FAFB' }}>
        <div style={{ width: 100, flexShrink: 0, padding: '8px 12px', fontSize: 12, color: 'var(--color-text-sub)', textAlign: 'center', borderRight: '1px solid #C8D0D8' }}>
          시간대
        </div>
        {days.map((date, dIdx) => (
          <div key={dIdx} style={{ flex: 1, padding: '6px 4px', textAlign: 'center', borderRight: dIdx < 6 ? '1px solid #C8D0D8' : 'none' }}>
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
      </div>

      {/* Slot rows */}
      {SLOTS.map(slot => (
        <div key={slot.key} style={{ display: 'flex', borderBottom: '1px solid #C8D0D8', minHeight: slot.height }}>
          <div style={{ width: 100, flexShrink: 0, padding: '8px', borderRight: '1px solid #C8D0D8', background: '#F9FAFB', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-en)', color: 'var(--color-text-primary)' }}>{slot.label}</span>
            <span style={{ fontSize: 10, fontFamily: 'var(--font-en)', color: 'var(--color-text-muted)' }}>{slot.time}</span>
          </div>
          {days.map((_, dIdx) => {
            const cell = getCell(dIdx, slot.key);
            return (
              <div key={dIdx} style={{ flex: 1, padding: '8px 6px', borderRight: dIdx < 6 ? '1px solid #C8D0D8' : 'none', background: cell?.bgColor ?? 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                {cell && (
                  <span style={{ fontSize: 12, color: cell.fontColor, fontFamily: 'var(--font-en)', lineHeight: 1.4 }}>
                    {cell.title}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function CampTimetableView({ campId, onEdit }: { campId: string; onEdit?: () => void }) {
  const { start: startDate, end: endDate } = loadRange(campId);

  if (!startDate || !endDate) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)', fontFamily: 'var(--font-ko)', fontSize: 14 }}>
        캠프 기간 정보가 없습니다.<br />
        <span style={{ fontSize: 12 }}>시간표 수정에서 캠프 기간을 먼저 입력해주세요.</span>
      </div>
    );
  }

  const weeks = generateWeeks(startDate, endDate);
  const saved = loadSaved(campId);

  function getCell(wIdx: number, dIdx: number, slot: TimeSlot): CellContent | null {
    const key = cellKey(wIdx, dIdx, slot);
    return saved[key] ?? null;
  }

  return (
    <div style={{ padding: '16px 24px' }}>
      {/* 우상단 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 20 }}>
        {onEdit && <button className="ew-btn ew-btn--ghost ew-btn--sm" onClick={onEdit}>수정</button>}
        <button className="ew-btn ew-btn--ghost ew-btn--sm">인쇄</button>
        <button className="ew-btn ew-btn--ghost ew-btn--sm">공유</button>
        <button className="ew-btn ew-btn--ghost ew-btn--sm">다운로드</button>
      </div>

      {weeks.map((week, wIdx) => (
        <div key={wIdx} style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-en)', color: 'var(--color-text-primary)', marginBottom: 8 }}>
            {wIdx + 1} Week
          </div>
          <TimetableGrid
            days={week.days}
            weekIdx={wIdx}
            getCell={(dIdx, slot) => getCell(wIdx, dIdx, slot)}
          />
        </div>
      ))}
    </div>
  );
}
