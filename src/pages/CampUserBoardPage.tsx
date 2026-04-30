// 캠프별 학생 리스트 페이지 — 학생명단 탭
import { useState, useMemo, useRef } from 'react';
import Pagination from '../components/Pagination';
import { avatarColor, initials, isoToDisplay, CalendarCell } from '../components/board/cells';
import type { Student } from './StudentBoardPage';
import { loadClasses, saveClasses } from './CampClassTab';
import type { ClassLevel } from './CampClassTab';
import { useUndoToast } from '../hooks/useUndoToast';


const TAG_COLORS = [
  { bg: 'var(--color-primary-light)', color: 'var(--color-primary)' },
  { bg: '#F0FDF4', color: '#22C55E' },
  { bg: '#FFF7ED', color: '#F59E0B' },
  { bg: '#FEF2F2', color: 'var(--color-error)' },
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

function TH({ children, colKey, onResizeStart }: {
  children: React.ReactNode;
  colKey?: string;
  onResizeStart?: (key: string, e: React.MouseEvent) => void;
}) {
  return (
    <th style={{ padding: 0, position: 'relative' }}>
      <div className="ew-cell--headline">{children}</div>
      {colKey && onResizeStart && (
        <div
          style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 5, cursor: 'col-resize', zIndex: 1, userSelect: 'none' }}
          onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onResizeStart(colKey, e); }}
        />
      )}
    </th>
  );
}

const BOARD_COLS = [
  { key: 'student',  defaultW: 172 },
  { key: 'adult',    defaultW: 140 },
  { key: 'agent',    defaultW: 107 },
  { key: 'family',   defaultW: 110 },
  { key: 'class',    defaultW: 94  },
  { key: 'hotel',    defaultW: 131 },
  { key: 'flight',   defaultW: 320 },
  { key: 'payment',  defaultW: 112 },
];
const LS_KEY = 'ew-col-widths-campboard';

function FlightPickupRow({ flightLabel, pickupLabel, flightNo, date, time, pickStatus, pickPlace }: {
  flightLabel: string; pickupLabel: string;
  flightNo: string; date: string; time: string;
  pickStatus: string; pickPlace?: string;
}) {
  const hasFlight = flightNo || date;
  const hasPickup = pickStatus && pickStatus !== '없음';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
      <span style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-primary)', whiteSpace: 'nowrap', minWidth: 28 }}>{flightLabel}</span>
      {hasFlight ? (
        <>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-sub)', whiteSpace: 'nowrap' }}>{flightNo}</span>
          {date && <><img src="/icon/Calendar.svg" alt="" style={{ width: 14, height: 14, flexShrink: 0 }} />
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-sub)', whiteSpace: 'nowrap' }}>{isoToDisplay(date)}</span></>}
          {time && <><div style={{ width: 1, height: 14, background: 'var(--color-border-table)', flexShrink: 0 }} />
          <img src="/icon/Clock.svg" alt="" style={{ width: 14, height: 14, flexShrink: 0 }} />
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-sub)', whiteSpace: 'nowrap' }}>{time}</span></>}
        </>
      ) : (
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-border-default)' }}>-</span>
      )}
      <div style={{ width: 1, height: 14, background: 'var(--color-border-table)', flexShrink: 0, marginLeft: 2 }} />
      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-sub)', whiteSpace: 'nowrap' }}>{pickupLabel}</span>
      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
        {hasPickup && pickPlace ? pickPlace : '-'}
      </span>
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
      <div style={{ background: 'var(--color-canvas)', borderRadius: 12, width: 480, maxHeight: '70vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--color-border-table)' }}>
          <span style={{ flex: 1, fontSize: 'var(--text-md)', fontWeight: 600, fontFamily: 'var(--font-ko)', color: 'var(--color-text-primary)' }}>학생 추가</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--text-xl)', color: 'var(--color-ink-mute)', lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--color-border-table)' }}>
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="이름 검색"
            style={{ width: '100%', height: 36, padding: '0 12px', border: '1px solid var(--color-border-default)', borderRadius: 6, fontSize: 'var(--text-base)', fontFamily: 'var(--font-ko)', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {candidates.length === 0 ? (
            q ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', fontSize: 'var(--text-base)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-ko)' }}>"{q}"에 해당하는 학생이 없습니다.</div>
            ) : (
              <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="19" stroke="#E5E7EB" strokeWidth="1.5"/><path d="M20 13v8M20 25v1.5" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/></svg>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-ko)', marginBottom: 8 }}>추가 가능한 학생이 없습니다.</div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-sub)', fontFamily: 'var(--font-ko)', lineHeight: 1.8 }}>
                    캠프 인원을 추가하려면 먼저<br /><strong style={{ color: 'var(--color-primary)' }}>학생 관리 탭</strong>에서 학생을 등록한 후<br />이 화면에서 캠프 인원으로 추가해 주세요.
                  </div>
                </div>
              </div>
            )
          ) : candidates.map(s => (
            <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-subtle)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <input type="checkbox" className="ew-checkbox" checked={sel.has(s.id)} onChange={() => toggle(s.id)} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 'var(--text-base)', fontFamily: 'var(--font-ko)', fontWeight: 500 }}>{s.name_ko}</span>
                <span style={{ fontSize: 'var(--text-2xs)', fontFamily: 'var(--font-en)', color: 'var(--color-text-sub)' }}>{s.name_en} · {s.age}세 · {s.gender}</span>
              </div>
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: '1px solid var(--color-border-table)' }}>
          <span style={{ flex: 1, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-ko)', lineHeight: '32px' }}>{sel.size > 0 ? `${sel.size}명 선택` : ''}</span>
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
  const { showUndo } = useUndoToast();
  const agentIdToName = useMemo(() => Object.fromEntries(agents.map(a => [a.id, a.name])), [agents]);
  const [campId] = useState(propCampId ?? '');
  const [query,      setQuery]     = useState('');
  const [selected,   setSelected]  = useState<Set<string>>(new Set());
  const [page,       setPage]      = useState(1);
  const [perPage,    setPerPage]   = useState(10);
  const [openCell,   setOpenCell]  = useState<string | null>(null);
  const [activeCell, setActiveCell]= useState<string | null>(null);
  const [showPicker, setShowPicker]= useState(false);

  // payment_deadline 인라인 편집 — Student.camp_records[campId].payment_deadline 영속화
  function setPaymentDeadline(student: Student, iso: string) {
    if (!onStudentUpdate) return;
    const prevStudent = student;
    const records = student.camp_records ?? [];
    const existing = records.find(r => r.camp_id === campId);
    const newRecord = { ...(existing ?? { camp_id: campId }), payment_deadline: iso };
    const newRecords = existing
      ? records.map(r => r.camp_id === campId ? newRecord : r)
      : [...records, newRecord];
    onStudentUpdate({ ...student, camp_records: newRecords });

    const displayName = student.name_ko || student.name_en || '학생';
    showUndo({
      message: `'${displayName}' Payment Deadline 변경됨`,
      onUndo: () => onStudentUpdate(prevStudent),
    });
  }

  const allStudentsSource = propStudents ?? [];

  // ── Column resize ─────────────────────────────────────────────────────────
  const colWidthsRef = useRef<Record<string, number>>({});
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    try { const s = JSON.parse(localStorage.getItem(LS_KEY) ?? '{}'); colWidthsRef.current = s; return s; } catch { return {}; }
  });
  function colW(key: string) { return colWidths[key] ?? BOARD_COLS.find(c => c.key === key)?.defaultW ?? 120; }
  function startResize(colKey: string, e: React.MouseEvent) {
    const startX = e.clientX;
    const startW = colWidthsRef.current[colKey] ?? BOARD_COLS.find(c => c.key === colKey)?.defaultW ?? 120;
    function onMove(ev: MouseEvent) {
      const newW = Math.max(60, startW + ev.clientX - startX);
      colWidthsRef.current = { ...colWidthsRef.current, [colKey]: newW };
      setColWidths({ ...colWidthsRef.current });
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      try { localStorage.setItem(LS_KEY, JSON.stringify(colWidthsRef.current)); } catch {}
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }
  // ──────────────────────────────────────────────────────────────────────────

  // localEdits/getEdit/setEdit 제거됨: 'pay' 셀만 사용했으나 영속화 경로가 없어 readonly로 변경됨.
  // 'agent' 컬럼은 fallback으로 직접 student.history.agent_id 참조.
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
    <div onClick={() => { setOpenCell(null); setActiveCell(null); }}>
      {showPicker && onStudentUpdate && (
        <StudentPickerModal campId={campId} allStudents={allStudentsSource} onAdd={handlePickerAdd} onClose={() => setShowPicker(false)} />
      )}
      <div className="ew-filter-bar ew-filter-bar--inline">
        <div className="ew-filter-input-wrap" style={{ width: 220 }}>
          <span className="search-icon"><SearchIcon /></span>
          <input type="text" placeholder="학생 이름 검색" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) var(--page-px)', background: 'var(--color-canvas)', justifyContent: 'flex-end' }}>
        <span style={{ flex: 1, fontSize: 'var(--text-sm)', color: 'var(--color-ink-soft)', lineHeight: '26px' }}>{selected.size > 0 ? `${selected.size}명 선택됨` : ''}</span>
        {onStudentUpdate && <button className="ew-btn ew-btn--primary ew-btn--xsm" onClick={() => setShowPicker(true)}>학생 추가</button>}
        {selected.size > 0 && onStudentUpdate && <button className="ew-btn ew-btn--danger ew-btn--xsm" onClick={handleRemoveStudents}>캠프에서 제거</button>}
        <button className="ew-btn ew-btn--secondary ew-btn--xsm">엑셀 업로드</button>
        <button className="ew-btn ew-btn--secondary ew-btn--xsm">엑셀 다운로드</button>
      </div>
      <div className="ew-board" style={{ borderRadius: 0, border: 'none', boxShadow: 'none' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="ew-table" style={{ minWidth: 39 + BOARD_COLS.reduce((s, c) => s + colW(c.key), 0) }}>
            <colgroup>
              <col style={{ width: 39 }} />
              {BOARD_COLS.map(c => <col key={c.key} style={{ width: colW(c.key) }} />)}
            </colgroup>
            <thead>
              <tr>
                <th style={{ padding: 0, textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 40 }}>
                    <input type="checkbox" className="ew-checkbox" checked={allChecked} onChange={e => toggleAll(e.target.checked)} />
                  </div>
                </th>
                {['Student','Adult','Agent','Family info','Class','Hotel info','Flight Info & Pick up·Drop','Payment Deadline'].map((label, i) => (
                  <TH key={label} colKey={BOARD_COLS[i].key} onResizeStart={startResize}>{label}</TH>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
                  {campStudents.length === 0 ? '이 캠프에 등록된 학생이 없습니다.' : '검색 결과가 없습니다.'}
                </td></tr>
              ) : pageData.map(s => {
                const isRowSel = selected.has(s.id);
                const agentVal = agentIdToName[s.history.agent_id] ?? s.history.agent_id;
                const payVal   = s.camp_records?.find(r => r.camp_id === campId)?.payment_deadline ?? '';
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
                        <div className="ew-avatar" style={{ background: avatarColor(s.name_en), width: 32, height: 32, fontSize: 'var(--text-sm)' }}>{initials(s.name_en)}</div>
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
                        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>보호자 : {s.guardian.name}({relLabel(s.guardian.relation)})</span>
                        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-sub)' }}>{s.guardian.contact}</span>
                        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>{s.guardian.email}</span>
                      </div>
                    </td>
                    <td style={TD_STYLE}>
                      <span style={{ fontSize: 'var(--text-base)', fontFamily: 'var(--font-en)' }}>{agentVal}</span>
                    </td>
                    <td style={TD_STYLE}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {familyMembers.length > 0
                          ? familyMembers.map((f, i) => (
                              <span key={i} className="ew-tag" style={{ background: TAG_COLORS[i % TAG_COLORS.length].bg, color: TAG_COLORS[i % TAG_COLORS.length].color }}>
                                {f.name}({f.relation === '기타' ? ((f as any).relationCustom || '기타') : f.relation})
                              </span>
                            ))
                          : <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-border-default)' }}>-</span>
                        }
                      </div>
                    </td>
                    <td style={TD_STYLE}>
                      {studentClass
                        ? <span className="ew-tag" style={{ background: 'var(--color-primary-bg)', color: 'var(--color-primary)' }}>{studentClass.name}</span>
                        : <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-border-default)' }}>-</span>}
                    </td>
                    <td style={TD_STYLE}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {rooms.length > 0
                          ? rooms.map((r, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span className="ew-tag ew-tag--blue" style={{ whiteSpace: 'nowrap' }}>{r.roomType || '(미입력)'}</span>
                                <span style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-sub)' }}>X1</span>
                              </div>
                            ))
                          : <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-border-default)' }}>-</span>
                        }
                      </div>
                    </td>
                    <td style={{ ...TD_STYLE, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <FlightPickupRow
                          flightLabel="출국" pickupLabel="Pick up"
                          flightNo={dep.flightNo ?? ''} date={dep.dateEntry ?? ''} time={dep.timeEntry ?? ''}
                          pickStatus={dep.pickDrop ?? ''} pickPlace={dep.pickDropPlace ?? ''}
                        />
                        <FlightPickupRow
                          flightLabel="귀국" pickupLabel="Drop"
                          flightNo={ret.flightNo ?? ''} date={ret.dateReturn ?? ret.dateEntry ?? ''} time={ret.timeReturn ?? ret.timeEntry ?? ''}
                          pickStatus={ret.pickDrop ?? ''} pickPlace={ret.pickDropPlace ?? ''}
                        />
                      </div>
                    </td>
                    <td className={tdCls(s.id, 'pay', 'ew-cell--interactive')} style={{ ...TD_STYLE, padding: '0 12px' }}>
                      <CalendarCell dateISO={payVal} displayDate={payVal ? isoToDisplay(payVal) : ''}
                        cellId={`${s.id}:pay`} openCell={openCell} setOpenCell={setOpenCell}
                        onDateChange={iso => setPaymentDeadline(s, iso)}
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
