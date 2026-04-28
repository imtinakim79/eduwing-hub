// 캠프별 학생 리스트 페이지 — 학생명단 탭
import { useState, useMemo } from 'react';
import rawStudents from '../data/students.json';
import rawCamps from '../data/camps.json';
import Pagination from '../components/Pagination';
import { avatarColor, initials, isoToDisplay, CalendarCell } from '../components/board/cells';
import { FilterPill } from '../components/FilterPill';
import type { Student } from './StudentBoardPage';
import { loadClasses, saveClasses } from './CampClassTab';
import type { ClassLevel } from './CampClassTab';

interface Camp { id: string; name: string; staff: string[]; }

const rawStudentsArr = rawStudents as unknown as Student[];
const allCamps = rawCamps as Camp[];

const TAG_COLORS = [
  { bg: '#E0E9FE', color: '#3B82F6' },
  { bg: '#F0FDF4', color: '#22C55E' },
  { bg: '#FFF7ED', color: '#F59E0B' },
  { bg: '#FEF2F2', color: '#EF4444' },
];

function relLabel(r: string) {
  if (r === 'Father' || r === '아빠') return '아빠';
  if (r === 'Mother' || r === '엄마') return '엄마';
  if (r === 'Etc'   || r === '기타') return '기타';
  return r || '기타';
}

// ── 학생 데이터 헬퍼 ──────────────────────────────────────────────────────────
const EMPTY_FLIGHT = { flightNo: '', dateEntry: '', timeEntry: '', dateReturn: '', timeReturn: '', pickDrop: '', pickDropPlace: '' };

function getCampRecord(s: Student, campId: string) {
  return s.camp_records?.find(r => r.camp_id === campId);
}
function loadStudentFamily(sid: string) {
  try { const r = localStorage.getItem(`ew-family-${sid}`); return r ? JSON.parse(r) : null; }
  catch { return null; }
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="9" cy="9" r="6" stroke="#9CA3AF" strokeWidth="1.5" />
      <path d="M13.5 13.5L17 17" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function TH({ children, width, minWidth }: { children: React.ReactNode; width?: number; minWidth?: number }) {
  return (
    <th style={{ padding: 0, width: width, minWidth: minWidth }}>
      <div className="ew-cell--headline">{children}</div>
    </th>
  );
}

function FlightRow({ label, flightNo, date, time }: { label: string; flightNo: string; date: string; time: string }) {
  if (!flightNo && !date) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ fontSize: 13, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontSize: 12, color: '#D1D5DB' }}>-</span>
    </div>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ fontSize: 13, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontSize: 12, color: 'var(--color-text-sub)', whiteSpace: 'nowrap' }}>{flightNo}</span>
      {date && <><img src="/icon/Calendar.svg" alt="" style={{ width: 14, height: 14, flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: 'var(--color-text-sub)', whiteSpace: 'nowrap' }}>{isoToDisplay(date)}</span></>}
      {time && <><div style={{ width: 1, height: 14, background: 'var(--color-border-table)', flexShrink: 0 }} />
      <img src="/icon/Clock.svg" alt="" style={{ width: 14, height: 14, flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: 'var(--color-text-sub)', whiteSpace: 'nowrap' }}>{time}</span></>}
    </div>
  );
}

function PickupRow({ label, status, place }: { label: string; status: string; place?: string }) {
  const hasPickup = status && status !== '없음';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ fontSize: 13, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ width: 1, height: 14, background: 'var(--color-border-table)', flexShrink: 0 }} />
      {hasPickup && place
        ? <span style={{ fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{place}</span>
        : <span style={{ fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>-</span>
      }
    </div>
  );
}

// ── Completed read-only board ─────────────────────────────────────────────────
export function CampUserBoardCompleted({ campId, students, agents = [] }: { campId: string; students: Student[]; agents?: { id: string; name: string }[] }) {
  const agentIdToName = Object.fromEntries(agents.map(a => [a.id, a.name]));
  const [query, setQuery] = useState('');
  const classes: ClassLevel[] = useMemo(() => loadClasses(campId), [campId]);
  function getStudentClass(studentId: string) { return classes.find(c => c.studentIds.includes(studentId)); }
  const allCampStudents = students.filter(s => s.history.current_camp_id === campId);
  const campStudents = query
    ? allCampStudents.filter(s => s.name_ko.includes(query) || s.name_en.toLowerCase().includes(query.toLowerCase()))
    : allCampStudents;

  const TD: React.CSSProperties = {
    borderRight: '1px solid var(--color-border-table)',
    borderBottom: '1px solid var(--color-border-table)',
    padding: '10px 16px',
    verticalAlign: 'middle',
    height: 103,
    whiteSpace: 'nowrap',
    position: 'relative',
  };

  return (
    <div>
      <div className="ew-filter-bar">
        <div className="ew-filter-input-wrap" style={{ width: 220 }}>
          <span className="search-icon"><SearchIcon /></span>
          <input type="text" placeholder="학생 이름 검색" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
      </div>

      {allCampStudents.length === 0 ? (
        <div style={{ padding: 24, color: 'var(--color-text-muted)', fontSize: 13, fontFamily: 'var(--font-ko)' }}>
          등록된 학생이 없습니다.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="ew-table" style={{ minWidth: 1280 }}>
            <colgroup>
              <col style={{ width: 172 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 107 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 94 }} />
              <col style={{ width: 131 }} />
              <col style={{ width: 242 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 112 }} />
            </colgroup>
            <thead>
              <tr>
                <TH>Student</TH>
                <TH>Adult</TH>
                <TH>Agent</TH>
                <TH>Family info</TH>
                <TH>Class</TH>
                <TH>Hotel info</TH>
                <TH>Flight Info</TH>
                <TH>Pick up&amp;Drop</TH>
                <TH>Payment Deadline</TH>
              </tr>
            </thead>
            <tbody>
              {campStudents.map(s => {
                const rec = getCampRecord(s, campId);
                const familyRaw = loadStudentFamily(s.id);
                const familyMembers: { name: string; relation: string }[] = familyRaw
                  ?? [{ name: s.guardian.name, relation: relLabel(s.guardian.relation) }];
                const rooms: { roomType: string }[] = rec?.stay?.rooms ?? [];
                const dep = rec?.flight?.departure ?? EMPTY_FLIGHT;
                const ret = rec?.flight?.return    ?? EMPTY_FLIGHT;
                return (
                  <tr key={s.id} style={{ height: 103 }}>
                    <td style={{ ...TD, padding: '0 16px' }}>
                      <div className="ew-camp-thumbnail-card">
                        <div className="ew-avatar" style={{ background: avatarColor(s.name_en), width: 32, height: 32, fontSize: 12 }}>{initials(s.name_en)}</div>
                        <div className="ew-camp-thumbnail-info">
                          <div className="ew-camp-thumbnail-name-row">
                            <span className="ew-camp-thumbnail-name-en">{s.name_en}</span>
                            <span className="ew-camp-thumbnail-name-ko">{s.name_ko}</span>
                          </div>
                          <div className="ew-camp-thumbnail-meta-row">
                            <span>{s.age}세</span><span className="ew-camp-thumbnail-meta-dot">·</span><span>{s.gender}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={TD}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 12, color: 'var(--color-text-primary)' }}>보호자 : {s.guardian.name}({relLabel(s.guardian.relation)})</span>
                        <span style={{ fontSize: 12, color: 'var(--color-text-sub)' }}>{s.guardian.contact}</span>
                        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{s.guardian.email}</span>
                      </div>
                    </td>
                    <td style={TD}><span style={{ fontSize: 13, fontFamily: 'var(--font-en)' }}>{agentIdToName[s.history.agent_id] ?? s.history.agent_id}</span></td>
                    <td style={TD}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {familyMembers.length > 0
                          ? familyMembers.map((f, i) => (
                              <span key={i} className="ew-tag" style={{ background: TAG_COLORS[i % TAG_COLORS.length].bg, color: TAG_COLORS[i % TAG_COLORS.length].color }}>
                                {f.name}({f.relation === '기타' ? ((f as any).relationCustom || '기타') : f.relation})
                              </span>
                            ))
                          : <span style={{ fontSize: 12, color: '#D1D5DB' }}>-</span>
                        }
                      </div>
                    </td>
                    <td style={TD}>
                      {(() => { const cls = getStudentClass(s.id); return cls
                        ? <span className="ew-tag" style={{ background: '#EEF3FD', color: '#2F6FED' }}>{cls.name}</span>
                        : <span style={{ fontSize: 12, color: '#D1D5DB' }}>-</span>; })()}
                    </td>
                    <td style={TD}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {rooms.length > 0
                          ? rooms.map((r, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span className="ew-tag ew-tag--blue">{r.roomType || '(미입력)'}</span>
                                <span style={{ fontSize: 13, color: 'var(--color-text-sub)' }}>X1</span>
                              </div>
                            ))
                          : <span style={{ fontSize: 12, color: '#D1D5DB' }}>-</span>
                        }
                      </div>
                    </td>
                    <td style={TD}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <FlightRow label="출국" flightNo={dep.flightNo ?? ''} date={dep.dateEntry ?? ''} time={dep.timeEntry ?? ''} />
                        <FlightRow label="귀국" flightNo={ret.flightNo ?? ''} date={ret.dateReturn ?? ret.dateEntry ?? ''} time={ret.timeReturn ?? ret.timeEntry ?? ''} />
                      </div>
                    </td>
                    <td style={TD}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <PickupRow label="Pick up" status={dep.pickDrop ?? ''} place={dep.pickDropPlace ?? ''} />
                        <PickupRow label="Drop"    status={ret.pickDrop ?? ''} place={ret.pickDropPlace ?? ''} />
                      </div>
                    </td>
                    <td style={TD}><span style={{ fontSize: 12, color: '#D1D5DB' }}>-</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Student picker modal ──────────────────────────────────────────────────────
function StudentPickerModal({ campId, allStudents, onAdd, onClose }: {
  campId: string; allStudents: Student[]; onAdd: (s: Student[]) => void; onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const basePool   = useMemo(() => allStudents.filter(s => s.history.current_camp_id !== campId), [allStudents, campId]);
  const candidates = useMemo(() => {
    if (!q) return basePool;
    const lq = q.toLowerCase();
    return basePool.filter(s => s.name_ko.includes(lq) || s.name_en.toLowerCase().includes(lq));
  }, [basePool, q]);

  function toggle(id: string) {
    setSel(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, width: 480, maxHeight: '70vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--color-border-table)' }}>
          <span style={{ flex: 1, fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-ko)', color: 'var(--color-text-primary)' }}>학생 추가</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#9CA3AF', lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--color-border-table)' }}>
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="이름 검색"
            style={{ width: '100%', height: 36, padding: '0 12px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, fontFamily: 'var(--font-ko)', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {candidates.length === 0 ? (
            q ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', fontSize: 13, color: 'var(--color-text-muted)', fontFamily: 'var(--font-ko)' }}>"{q}"에 해당하는 학생이 없습니다.</div>
            ) : (
              <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="19" stroke="#E5E7EB" strokeWidth="1.5"/><path d="M20 13v8M20 25v1.5" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/></svg>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-ko)', marginBottom: 8 }}>추가 가능한 학생이 없습니다.</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-sub)', fontFamily: 'var(--font-ko)', lineHeight: 1.8 }}>
                    캠프 인원을 추가하려면 먼저<br /><strong style={{ color: 'var(--color-primary)' }}>학생 관리 탭</strong>에서 학생을 등록한 후<br />이 화면에서 캠프 인원으로 추가해 주세요.
                  </div>
                </div>
              </div>
            )
          ) : candidates.map(s => (
            <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <input type="checkbox" className="ew-checkbox" checked={sel.has(s.id)} onChange={() => toggle(s.id)} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 13, fontFamily: 'var(--font-ko)', fontWeight: 500 }}>{s.name_ko}</span>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-en)', color: 'var(--color-text-sub)' }}>{s.name_en} · {s.age}세 · {s.gender}</span>
              </div>
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: '1px solid var(--color-border-table)' }}>
          <span style={{ flex: 1, fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-ko)', lineHeight: '32px' }}>{sel.size > 0 ? `${sel.size}명 선택` : ''}</span>
          <button className="ew-btn ew-btn--ghost ew-btn--sm" onClick={onClose}>취소</button>
          <button className="ew-btn ew-btn--primary ew-btn--sm" onClick={() => onAdd(candidates.filter(s => sel.has(s.id)))} disabled={sel.size === 0}>추가</button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CampUserBoardPage({ campId: propCampId, students: propStudents, onStudentUpdate, onStudentClick, agents = [] }: {
  campId?: string; students?: Student[]; onStudentUpdate?: (s: Student) => void;
  onStudentClick?: (studentId: string) => void;
  agents?: { id: string; name: string }[];
}) {
  const agentIdToName = useMemo(() => Object.fromEntries(agents.map(a => [a.id, a.name])), [agents]);
  const [campId,     setCampId]    = useState(propCampId ?? allCamps[0]?.id ?? '');
  const [query,      setQuery]     = useState('');
  const [selected,   setSelected]  = useState<Set<string>>(new Set());
  const [page,       setPage]      = useState(1);
  const [perPage,    setPerPage]   = useState(10);
  const [openCell,   setOpenCell]  = useState<string | null>(null);
  const [activeCell, setActiveCell]= useState<string | null>(null);
  const [localEdits, setLocalEdits]= useState<Record<string, Record<string, string>>>({});
  const [showPicker, setShowPicker]= useState(false);

  const allStudentsSource = propStudents ?? rawStudentsArr;

  function getEdit(id: string, field: string, fallback: string) { return localEdits[id]?.[field] ?? fallback; }
  function setEdit(id: string, field: string, val: string) {
    setLocalEdits(p => ({ ...p, [id]: { ...(p[id] ?? {}), [field]: val } }));
  }
  function tdCls(id: string, key: string, extra?: string) {
    const sel = activeCell === `${id}:${key}` ? 'ew-cell--selected' : '';
    return [sel, extra].filter(Boolean).join(' ') || undefined;
  }

  const classes: ClassLevel[] = useMemo(() => loadClasses(campId), [campId]);
  function getStudentClass(studentId: string) { return classes.find(c => c.studentIds.includes(studentId)); }

  const campStudents = useMemo(() => {
    let list = allStudentsSource.filter(s => s.history.current_camp_id === campId);
    if (query) { const q = query.toLowerCase(); list = list.filter(s => s.name_ko.includes(q) || s.name_en.toLowerCase().includes(q)); }
    return list;
  }, [allStudentsSource, campId, query]);

  const pageData   = campStudents.slice((page - 1) * perPage, page * perPage);
  const allChecked = pageData.length > 0 && pageData.every(s => selected.has(s.id));

  function handlePickerAdd(picked: Student[]) {
    if (!onStudentUpdate) return;
    picked.forEach(s => onStudentUpdate({ ...s, history: { ...s.history, current_camp_id: campId } }));
    setShowPicker(false);
  }

  function handleRemoveStudents() {
    if (!onStudentUpdate || selected.size === 0) return;
    const targets = campStudents.filter(s => selected.has(s.id));
    const names = targets.map(s => s.name_ko).join(', ');
    const ok = window.confirm(
      `[${names}] 총 ${targets.length}명을 캠프에서 제거합니다.\n\n항공편, 숙소, 클래스 배정, 동반 가족 정보가 모두 삭제됩니다.\n계속하시겠습니까?`
    );
    if (!ok) return;

    // 클래스 배정에서 제거
    const updatedClasses = loadClasses(campId).map(c => ({
      ...c,
      studentIds: c.studentIds.filter(id => !selected.has(id)),
    }));
    saveClasses(campId, updatedClasses);

    // 각 학생 데이터 정리
    targets.forEach(s => {
      try { localStorage.removeItem(`ew-family-${s.id}`); } catch {}
      const updatedRecords = (s.camp_records ?? []).filter(r => r.camp_id !== campId);
      const updatedHistory = s.history.current_camp_id === campId
        ? { ...s.history, current_camp_id: '' }
        : s.history;
      onStudentUpdate({ ...s, camp_records: updatedRecords, history: updatedHistory });
    });
    setSelected(new Set());
  }

  function toggleAll(checked: boolean) { setSelected(checked ? new Set(pageData.map(s => s.id)) : new Set()); }
  function toggleRow(id: string) { const n = new Set(selected); n.has(id) ? n.delete(id) : n.add(id); setSelected(n); }

  const TD_STYLE: React.CSSProperties = {
    borderRight: '1px solid var(--color-border-table)', borderBottom: '1px solid var(--color-border-table)',
    padding: '10px 16px', verticalAlign: 'middle', height: 103, whiteSpace: 'nowrap', position: 'relative',
  };

  return (
    <div style={{ minWidth: 1440, overflowX: 'auto' }} onClick={() => { setOpenCell(null); setActiveCell(null); }}>
      {showPicker && onStudentUpdate && (
        <StudentPickerModal campId={campId} allStudents={allStudentsSource} onAdd={handlePickerAdd} onClose={() => setShowPicker(false)} />
      )}
      <div className="ew-filter-bar">
        {!propCampId && (
          <div style={{ fontFamily: 'var(--font-ko)', fontWeight: 500, fontSize: 20, letterSpacing: '-0.8px', color: 'var(--color-text-medium)', width: 174, flexShrink: 0, textAlign: 'center' }}>캠프 학생</div>
        )}
        {!propCampId && (
          <FilterPill label="캠프 선택" values={campId ? [campId] : []} options={allCamps.map(c => c.id)}
            getLabel={id => allCamps.find(c => c.id === id)?.name ?? id}
            onChange={vs => { if (vs[0]) { setCampId(vs[0]); setPage(1); setSelected(new Set()); } }} width={220} />
        )}
        <div className="ew-filter-input-wrap" style={{ width: 220 }}>
          <span className="search-icon"><SearchIcon /></span>
          <input type="text" placeholder="학생 이름 검색" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 30px', border: '1px solid #E5E7EB', background: '#fff', justifyContent: 'flex-end', minWidth: 1440 }}>
        <span style={{ flex: 1, fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-ko)', lineHeight: '26px' }}>{selected.size > 0 ? `${selected.size}명 선택됨` : ''}</span>
        {onStudentUpdate && <button className="ew-btn ew-btn--primary ew-btn--xsm" onClick={() => setShowPicker(true)}>학생 추가</button>}
        {selected.size > 0 && onStudentUpdate && <button className="ew-btn ew-btn--danger ew-btn--xsm" onClick={handleRemoveStudents}>캠프에서 제거</button>}
        <button className="ew-btn ew-btn--secondary ew-btn--xsm">엑셀 업로드</button>
        <button className="ew-btn ew-btn--secondary ew-btn--xsm">엑셀 다운로드</button>
      </div>
      <div className="ew-board" style={{ borderRadius: 0, border: 'none', borderTop: '1px solid var(--color-border-table)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="ew-table" style={{ minWidth: 1360 }}>
            <colgroup>
              <col style={{ width: 39 }} />
              <col style={{ width: 172 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 107 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 94 }} />
              <col style={{ width: 131 }} />
              <col style={{ width: 242 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 112 }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ padding: 0, textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 40 }}>
                    <input type="checkbox" className="ew-checkbox" checked={allChecked} onChange={e => toggleAll(e.target.checked)} />
                  </div>
                </th>
                <TH>Student</TH><TH>Adult</TH><TH>Agent</TH>
                <TH>Family info</TH><TH>Class</TH><TH>Hotel info</TH>
                <TH>Flight Info</TH><TH>Pick up&amp;Drop</TH><TH>Payment Deadline</TH>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
                  {campStudents.length === 0 ? '이 캠프에 등록된 학생이 없습니다.' : '검색 결과가 없습니다.'}
                </td></tr>
              ) : pageData.map(s => {
                const isRowSel = selected.has(s.id);
                const agentVal = agentIdToName[getEdit(s.id, 'agent', s.history.agent_id)] ?? getEdit(s.id, 'agent', s.history.agent_id);
                const payVal   = getEdit(s.id, 'pay',   '');
                const studentClass = getStudentClass(s.id);

                const rec = getCampRecord(s, campId);
                const familyRaw = loadStudentFamily(s.id);
                const familyMembers: { name: string; relation: string }[] = familyRaw
                  ?? [{ name: s.guardian.name, relation: relLabel(s.guardian.relation) }];
                const rooms: { roomType: string }[] = rec?.stay?.rooms ?? [];
                const dep = rec?.flight?.departure ?? EMPTY_FLIGHT;
                const ret = rec?.flight?.return    ?? EMPTY_FLIGHT;

                return (
                  <tr key={s.id} className={isRowSel ? 'row-selected' : ''} style={{ height: 103 }}>
                    <td style={{ ...TD_STYLE, textAlign: 'center', padding: '0 12px' }} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" className="ew-checkbox" checked={isRowSel} onChange={() => toggleRow(s.id)} />
                    </td>
                    <td style={{ ...TD_STYLE, padding: '0 16px', cursor: onStudentClick ? 'pointer' : 'default' }}
                        onClick={onStudentClick ? () => onStudentClick(s.id) : undefined}>
                      <div className="ew-camp-thumbnail-card">
                        <div className="ew-avatar" style={{ background: avatarColor(s.name_en), width: 32, height: 32, fontSize: 12 }}>{initials(s.name_en)}</div>
                        <div className="ew-camp-thumbnail-info">
                          <div className="ew-camp-thumbnail-name-row">
                            <span className="ew-camp-thumbnail-name-en" style={{ color: onStudentClick ? 'var(--color-primary)' : undefined }}>{s.name_en}</span>
                            <span className="ew-camp-thumbnail-name-ko">{s.name_ko}</span>
                          </div>
                          <div className="ew-camp-thumbnail-meta-row">
                            <span>{s.age}세</span><span className="ew-camp-thumbnail-meta-dot">·</span><span>{s.gender}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={TD_STYLE}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 12, color: 'var(--color-text-primary)' }}>보호자 : {s.guardian.name}({relLabel(s.guardian.relation)})</span>
                        <span style={{ fontSize: 12, color: 'var(--color-text-sub)' }}>{s.guardian.contact}</span>
                        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{s.guardian.email}</span>
                      </div>
                    </td>
                    <td style={TD_STYLE}>
                      <span style={{ fontSize: 13, fontFamily: 'var(--font-en)' }}>{agentVal}</span>
                    </td>
                    <td style={TD_STYLE}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {familyMembers.length > 0
                          ? familyMembers.map((f, i) => (
                              <span key={i} className="ew-tag" style={{ background: TAG_COLORS[i % TAG_COLORS.length].bg, color: TAG_COLORS[i % TAG_COLORS.length].color }}>
                                {f.name}({f.relation === '기타' ? ((f as any).relationCustom || '기타') : f.relation})
                              </span>
                            ))
                          : <span style={{ fontSize: 12, color: '#D1D5DB' }}>-</span>
                        }
                      </div>
                    </td>
                    <td style={TD_STYLE}>
                      {studentClass
                        ? <span className="ew-tag" style={{ background: '#EEF3FD', color: '#2F6FED' }}>{studentClass.name}</span>
                        : <span style={{ fontSize: 12, color: '#D1D5DB' }}>-</span>}
                    </td>
                    <td style={TD_STYLE}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {rooms.length > 0
                          ? rooms.map((r, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span className="ew-tag ew-tag--blue" style={{ whiteSpace: 'nowrap' }}>{r.roomType || '(미입력)'}</span>
                                <span style={{ fontSize: 13, color: 'var(--color-text-sub)' }}>X1</span>
                              </div>
                            ))
                          : <span style={{ fontSize: 12, color: '#D1D5DB' }}>-</span>
                        }
                      </div>
                    </td>
                    <td style={TD_STYLE}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <FlightRow label="출국" flightNo={dep.flightNo ?? ''} date={dep.dateEntry ?? ''} time={dep.timeEntry ?? ''} />
                        <FlightRow label="귀국" flightNo={ret.flightNo ?? ''} date={ret.dateReturn ?? ret.dateEntry ?? ''} time={ret.timeReturn ?? ret.timeEntry ?? ''} />
                      </div>
                    </td>
                    <td style={TD_STYLE}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <PickupRow label="Pick up" status={dep.pickDrop ?? ''} place={dep.pickDropPlace ?? ''} />
                        <PickupRow label="Drop"    status={ret.pickDrop ?? ''} place={ret.pickDropPlace ?? ''} />
                      </div>
                    </td>
                    <td className={tdCls(s.id, 'pay', 'ew-cell--interactive')} style={{ ...TD_STYLE, padding: '0 12px' }}>
                      <CalendarCell dateISO={payVal} displayDate={payVal ? isoToDisplay(payVal) : ''}
                        cellId={`${s.id}:pay`} openCell={openCell} setOpenCell={setOpenCell}
                        onDateChange={iso => setEdit(s.id, 'pay', iso)}
                        onCellClick={() => setActiveCell(`${s.id}:pay`)} onEditDone={() => setActiveCell(null)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination total={campStudents.length} page={page} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />
      </div>
    </div>
  );
}
