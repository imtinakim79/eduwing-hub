// 학생관리 리스트 페이지
// 피그마 node 49:5613 기반 + FieldCell Library (167:1305) 반영
import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import rawStudents from '../data/students.json';
import rawCamps from '../data/camps.json';
import type { Agent } from './AgentBoardPage';
import Pagination from '../components/Pagination';
import BoardTable from '../components/board/BoardTable';
import { ThumbnailCell, CalendarRangeOverlay, CalendarRangeCell } from '../components/board/cells';
import { FilterPill } from '../components/FilterPill';
import type { ColumnDef } from '../components/board/types';
import { useUndoToast } from '../hooks/useUndoToast';

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="9" r="6" stroke="#9CA3AF" strokeWidth="1.5" />
      <path d="M13.5 13.5L17 17" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export interface CampRecord {
  camp_id: string;
  stay?: {
    checkIn: string; checkOut: string; invoiceName: string;
    rooms: Array<{ id: string; roomType: string; extraBed: string }>;
  };
  flight?: {
    passportNo: string; passportName: string;
    departure: { flightNo: string; dateEntry: string; timeEntry: string; dateReturn: string; timeReturn: string; pickDrop: string; pickDropPlace: string };
    return: { flightNo: string; dateEntry: string; timeEntry: string; dateReturn: string; timeReturn: string; pickDrop: string; pickDropPlace: string };
  };
  payment_deadline?: string;  // ISO yyyy-mm-dd
}

export interface Student {
  id: string; profile_img_url: string | null;
  name_ko: string; name_en: string; gender: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  birth_date: string; age: number; grade?: string;
  program_start?: string; program_end?: string;
  guardian: { name: string; relation: string; contact: string; email: string };
  history: { joined_date: string; agent_id: string; current_camp_id: string };
  camp_records: CampRecord[];
  duplicate_suspect?: boolean;
}
interface Camp { id: string; name: string; location: string; country: string; accommodation: string; capacity: number; status: string; start_date: string; end_date: string; staff: string[]; enrolledCount?: number; }

export const defaultStudents = rawStudents as Student[];
const allCamps = rawCamps as Camp[];
const campMap  = Object.fromEntries(allCamps.map(c => [c.id, c]));

function relLabel(r: string) {
  if (r === 'Father' || r === '아빠') return '아빠';
  if (r === 'Mother' || r === '엄마') return '엄마';
  if (r === 'Etc'   || r === '기타') return '기타';
  return r || '기타';
}

// ── Column Config ─────────────────────────────────────────────────────────────
const studentColumns: ColumnDef<Student>[] = [
  {
    key: 'name', label: '학생', width: 160, sortKey: 'name', type: 'custom' as const,
    getValue: (r, e) => e['name_ko'] ?? r.name_ko,
    render: ({ row }: { row: Student }) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
        <ThumbnailCell nameKo={row.name_ko} nameEn={row.name_en} profileImgUrl={row.profile_img_url} />
        {row.duplicate_suspect && (
          <span title="중복 의심" style={{ fontSize: 13, color: '#B45309', flexShrink: 0 }}>⚠</span>
        )}
      </div>
    ),
  },
  {
    key: 'gender', label: '성별', width: 100, sortKey: 'gender', type: 'gender',
    getValue: (r, e) => e['gender'] ?? r.gender,
    setValue: (_, v) => ({ field: 'gender', value: v }),
  },
  {
    key: 'age', label: '나이', width: 86, sortKey: 'age', type: 'dropdown',
    options: Array.from({ length: 20 }, (_, i) => `${i + 1}세`),
    getValue: (r, e) => e['age'] ?? `${r.age}세`,
    setValue: (_, v) => ({ field: 'age', value: v }),
  },
  {
    key: 'grade', label: '학년', width: 100, type: 'text',
    getValue: (r, e) => e['grade'] ?? r.grade ?? '',
    setValue: (_, v) => ({ field: 'grade', value: v }),
  },
  {
    key: 'birth_date', label: '생일', width: 109, sortKey: 'birth', type: 'calendar',
    getValue: (r, e) => e['birth_date'] ?? r.birth_date,
    setValue: (_, v) => ({ field: 'birth_date', value: v }),
  },
  {
    key: 'guardian', label: '보호자', width: 120, type: 'readonly',
    getValue: (r, e) => {
      const name = e['guardian_name'] ?? r.guardian.name;
      const rel  = e['guardian_relation'] ?? r.guardian.relation;
      return `${name}(${relLabel(rel)})`;
    },
  },
  {
    key: 'contact', label: '연락처', width: 135, type: 'text',
    getValue: (r, e) => e['contact'] ?? r.guardian.contact,
    setValue: (_, v) => ({ field: 'contact', value: v }),
  },
  {
    key: 'email', label: 'Email', width: 160, type: 'text',
    getValue: (r, e) => e['email'] ?? r.guardian.email,
    setValue: (_, v) => ({ field: 'email', value: v }),
  },
  {
    key: 'joined_date', label: '가입일', width: 109, sortKey: 'joined', type: 'calendar',
    getValue: (r, e) => e['joined_date'] ?? r.history.joined_date,
    setValue: (_, v) => ({ field: 'joined_date', value: v }),
  },
  {
    key: 'agent_id', label: 'Agent', width: 130, type: 'dropdown',
    options: [],
    getValue: (r, e) => e['agent_id'] ?? r.history.agent_id,
    setValue: (_, v) => ({ field: 'agent_id', value: v }),
  },
  {
    key: 'current_camp_id', label: '참여중인 캠프', width: 155, type: 'readonly',
    getValue: (r, e) => {
      const id = e['current_camp_id'] ?? r.history.current_camp_id;
      return campMap[id]?.name ?? id;
    },
  },
  {
    key: 'camp_period', label: '참여 캠프 기간', width: 200, sortKey: 'camp_period', type: 'readonly',
    getValue: (r, e) => {
      const campId = e['current_camp_id'] ?? r.history.current_camp_id;
      const camp = campMap[campId] as Camp | undefined;
      if (!camp?.start_date || !camp?.end_date) return '';
      const fmt = (iso: string) => iso.length >= 10 ? iso.slice(2).replace(/-/g, '/') : iso;
      return `${fmt(camp.start_date)} ~ ${camp.end_date.slice(5).replace(/-/g, '/')}`;
    },
  },
];

// ── Apply localEdits back to a Student object ─────────────────────────────────
function applyEditsToStudent(s: Student, edits: Record<string, string>): Student {
  const result: Student = {
    ...s,
    guardian: { ...s.guardian },
    history:  { ...s.history },
    camp_records: s.camp_records,
  };
  for (const [field, value] of Object.entries(edits)) {
    switch (field) {
      case 'gender':       result.gender = value as Student['gender']; break;
      case 'age':          result.age = parseInt(value, 10) || s.age; break;
      case 'birth_date':   result.birth_date = value; break;
      case 'grade':        result.grade = value; break;
      case 'guardian_name':     result.guardian.name = value; break;
      case 'guardian_relation': result.guardian.relation = value; break;
      case 'contact':           result.guardian.contact = value; break;
      case 'email':             result.guardian.email = value; break;
      case 'joined_date':  result.history.joined_date = value; break;
      case 'agent_id':     result.history.agent_id = value; break;
      case 'current_camp_id': result.history.current_camp_id = value; break;
      case 'program_period': {
        const [s, e] = value.split('||');
        result.program_start = s || undefined;
        result.program_end   = e || undefined;
        break;
      }
    }
  }
  return result;
}

// ── Excel helpers ─────────────────────────────────────────────────────────────
function studentsToRows(list: Student[], agentIdToName: Record<string, string> = {}) {
  return list.map(s => ({
    'ID':             s.id,
    '이름(한글)':      s.name_ko,
    '이름(영문)':      s.name_en,
    '성별':           s.gender,
    '나이':           s.age,
    '학년':           s.grade ?? '',
    '생일':           s.birth_date,
    '프로그램 시작일': s.program_start ?? '',
    '프로그램 종료일': s.program_end ?? '',
    '보호자 이름':     s.guardian.name,
    '보호자 관계':     s.guardian.relation,
    '연락처':         s.guardian.contact,
    'Email':          s.guardian.email,
    '가입일':         s.history.joined_date,
    'Agent':          agentIdToName[s.history.agent_id] ?? s.history.agent_id,
    '참여중인 캠프 ID': s.history.current_camp_id,
    '참여중인 캠프':   campMap[s.history.current_camp_id]?.name ?? s.history.current_camp_id,
  }));
}

function rowsToStudents(rows: Record<string, string>[]): Student[] {
  const toStr = (v: unknown) => (v == null ? '' : String(v).trim());
  return rows
    .filter(r => toStr(r['이름(한글)']) || toStr(r['이름(영문)']))
    .map(r => ({
      id:              toStr(r['ID']) || `STU-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      profile_img_url: null,
      name_ko:         toStr(r['이름(한글)']),
      name_en:         toStr(r['이름(영문)']),
      gender:          (toStr(r['성별']) === 'Female' ? 'Female' : 'Male') as Student['gender'],
      age:             parseInt(toStr(r['나이']), 10) || 0,
      grade:           toStr(r['학년']),
      birth_date:      toStr(r['생일']),
      program_start:   toStr(r['프로그램 시작일']),
      program_end:     toStr(r['프로그램 종료일']),
      guardian: {
        name:     toStr(r['보호자 이름']),
        relation: toStr(r['보호자 관계']),
        contact:  toStr(r['연락처']),
        email:    toStr(r['Email']),
      },
      history: {
        joined_date:     toStr(r['가입일']),
        agent_id:        toStr(r['Agent']),
        current_camp_id: toStr(r['참여중인 캠프 ID']),
      },
      camp_records: [],
    }));
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function StudentBoardPage({
  students = defaultStudents,
  agents = [],
  camps: campsProp = [],
  onAdd,
  onStudentSelect,
  onStudentsImport,
  onStudentUpdate,
  onStudentDelete,
  onCampCreate,
  onClassCreate,
}: {
  students?: Student[];
  agents?: Agent[];
  camps?: Camp[];
  onAdd?: () => void;
  onStudentSelect?: (id: string) => void;
  onStudentsImport?: (imported: Student[]) => void;
  onStudentUpdate?: (updated: Student) => void;
  onStudentDelete?: (ids: string[]) => void;
  onCampCreate?: (camp: Camp, className: string, studentIds: string[]) => void;
  onClassCreate?: (campId: string, className: string, studentIds: string[]) => void;
}) {
  const { showUndo } = useUndoToast();
  const [query,        setQuery]        = useState('');
  const [agentFilter,  setAgentFilter]  = useState('');
  const [campFilter,   setCampFilter]   = useState<string[]>([]);
  const [dupFilter,       setDupFilter]       = useState(false);
  const [campStatusFilter, setCampStatusFilter] = useState('');
  const [periodFilter,    setPeriodFilter]    = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [periodOpen,      setPeriodOpen]      = useState(false);
  const [periodPos,       setPeriodPos]       = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const periodRef = useRef<HTMLButtonElement>(null);
  const [addingRow,  setAddingRow]  = useState(false);
  const [newEdits,   setNewEdits]   = useState<Record<string, string>>({});
  const [selected,     setSelected]     = useState<Set<string>>(new Set());
  const [page,         setPage]         = useState(1);
  const [perPage,      setPerPage]      = useState(10);
  const [sortKey,      setSortKey]      = useState<string | null>('camp_period');
  const [sortDir,      setSortDir]      = useState<'asc' | 'desc'>('desc');
  const [localEdits,   setLocalEdits]   = useState<Record<string, Record<string, string>>>({});
  const [uploadSummary, setUploadSummary] = useState<{ added: number; updated: number; duplicate: number } | null>(null);
  const [classModal, setClassModal] = useState<{
    step: 1 | 2;
    className: string;
    campTab: 'existing' | 'new';
    existingCampId: string;
    newCampName: string;
    newCampCode: string;
    newLocation: string;
    newCapacity: string;
    newStatus: string;
    newStartDate: string;
    newEndDate: string;
  } | null>(null);
  const [newPeriodOpen, setNewPeriodOpen] = useState(false);
  const [newPeriodPos, setNewPeriodPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const newPeriodRef = useRef<HTMLButtonElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  function handleDownload() {
    const ws = XLSX.utils.json_to_sheet(studentsToRows(students, agentIdToName));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '학생목록');
    XLSX.writeFile(wb, '학생목록.xlsx');
  }

  function handleUploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = ev => {
      const data = new Uint8Array(ev.target!.result as ArrayBuffer);
      const wb   = XLSX.read(data, { type: 'array', cellDates: true });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { raw: false });
      const rawImported = rowsToStudents(rows);
      if (rawImported.length === 0) return;

      const existingById = new Map(students.map(s => [s.id, s]));
      let added = 0, updated = 0, duplicate = 0;

      const processed = rawImported.map(s => {
        if (s.id && existingById.has(s.id)) { updated++; return s; }
        const nameMatch = s.name_ko && s.birth_date
          ? students.find(e => e.name_ko === s.name_ko && e.birth_date === s.birth_date)
          : null;
        if (nameMatch) {
          duplicate++;
          return { ...s, id: nameMatch.id, duplicate_suspect: true };
        }
        added++;
        return s;
      });

      onStudentsImport?.(processed);
      setUploadSummary({ added, updated, duplicate });
    };
    reader.readAsArrayBuffer(file);
  }

  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoSnapshotRef = useRef<{ rowId: string; prevStudent: Student; prevEdits: Record<string, string> | undefined } | null>(null);

  useEffect(() => () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current); }, []);

  function handleEdit(rowId: string, field: string, value: string) {
    const prevStudent = students.find(s => s.id === rowId);

    // 편집 세션 시작 시점의 원본 상태를 한 번만 캡처
    if (!undoTimerRef.current) {
      undoSnapshotRef.current = { rowId, prevStudent: prevStudent!, prevEdits: localEdits[rowId] };
    }

    setLocalEdits(p => ({ ...p, [rowId]: { ...(p[rowId] ?? {}), [field]: value } }));

    if (onStudentUpdate && prevStudent) {
      const mergedEdits = { ...(localEdits[rowId] ?? {}), [field]: value };
      onStudentUpdate(applyEditsToStudent(prevStudent, mergedEdits));

      // 타이핑이 멈춘 뒤 800ms 후 토스트를 한 번만 표시
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => {
        undoTimerRef.current = null;
        const snap = undoSnapshotRef.current;
        if (!snap) return;
        undoSnapshotRef.current = null;
        const displayName = snap.prevStudent.name_ko || snap.prevStudent.name_en || '학생';
        showUndo({
          message: `'${displayName}' 변경됨`,
          onUndo: () => {
            onStudentUpdate(snap.prevStudent);
            setLocalEdits(p => {
              const next = { ...p };
              if (snap.prevEdits) next[snap.rowId] = snap.prevEdits;
              else delete next[snap.rowId];
              return next;
            });
          },
        });
      }, 800);
    }
  }

  function toggleSort(k: string) {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('asc'); }
  }

  function handleSaveNewRow() {
    const name_ko = newEdits.name_ko?.trim() ?? '';
    if (!name_ko) return;
    const newStudent: Student = {
      id: `STU-${Date.now()}`,
      profile_img_url: null,
      name_ko,
      name_en: newEdits.name_en?.trim() ?? '',
      gender: (newEdits.gender as Student['gender']) || 'Male',
      age: parseInt((newEdits.age ?? '').replace('세', ''), 10) || 0,
      grade: newEdits.grade ?? '',
      birth_date: newEdits.birth_date ?? '',
      guardian: {
        name: newEdits.guardian_name?.trim() ?? '',
        relation: newEdits.guardian_relation || 'Mother',
        contact: newEdits.contact?.trim() ?? '',
        email: newEdits.email?.trim() ?? '',
      },
      history: {
        joined_date: newEdits.joined_date || new Date().toISOString().slice(0, 10),
        agent_id: newEdits.agent_id || '',
        current_camp_id: '',
      },
      camp_records: [],
    };
    onStudentsImport?.([newStudent]);
    setAddingRow(false);
    setNewEdits({});
  }

  const agentOpts     = useMemo(() => agents.map(a => a.name), [agents]);
  const agentNameToId = useMemo(() => Object.fromEntries(agents.map(a => [a.name, a.id])), [agents]);
  const agentIdToName = useMemo(() => Object.fromEntries(agents.map(a => [a.id, a.name])), [agents]);

  const liveCampMap = useMemo(() =>
    Object.fromEntries([...allCamps, ...campsProp].map(c => [c.id, c])),
  [campsProp]);

  const CAMP_BADGE: Record<string, { bg: string; color: string }> = {
    '진행중': { bg: 'var(--color-success-light)', color: 'var(--color-success)' },
    '준비중': { bg: '#EEF3FD', color: '#2F6FED' },
  };

  const isEffectivelyUnassigned = (s: Student) => {
    if (!s.history.current_camp_id) return true;
    const camp = liveCampMap[s.history.current_camp_id];
    return !camp || !CAMP_BADGE[camp.status ?? ''];
  };

  const columns = useMemo(() => studentColumns.map(col => {
    if (col.key === 'name') return {
      ...col,
      render: ({ row }: { row: Student }) => (
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', cursor: onStudentSelect ? 'pointer' : 'default', width: '100%' }}
          onClick={onStudentSelect ? e => { e.stopPropagation(); onStudentSelect(row.id); } : undefined}
        >
          <ThumbnailCell nameKo={row.name_ko} nameEn={row.name_en} profileImgUrl={row.profile_img_url} />
          {row.duplicate_suspect && (
            <span title="중복 의심" style={{ fontSize: 13, color: '#B45309', flexShrink: 0 }}>⚠</span>
          )}
        </div>
      ),
    };
    if (col.key === 'agent_id') return {
      ...col,
      options: agentOpts,
      getValue: (r: Student, e: Record<string, string>) => {
        const id = e['agent_id'] ?? r.history.agent_id;
        return agentIdToName[id] ?? id;
      },
      setValue: (_: Student, v: string) => ({ field: 'agent_id', value: agentNameToId[v] ?? v }),
    };
    if (col.key === 'guardian') return {
      ...col,
      type: 'custom' as const,
      render: ({ row, cellId, openCell, setOpenCell, onCellClick }: {
        row: Student; cellId: string;
        openCell: string | null; setOpenCell: (id: string | null) => void;
        onCellClick: () => void;
      }) => {
        const edits = localEdits[row.id] ?? {};
        const name = edits['guardian_name'] ?? row.guardian.name;
        const rel  = edits['guardian_relation'] ?? row.guardian.relation;
        const isEditing = openCell === cellId;
        const lineStyle: React.CSSProperties = {
          width: '100%', border: 'none', borderBottom: '1px solid var(--color-border-subtle)',
          background: 'transparent', fontSize: 12, fontFamily: 'var(--font-ko)',
          color: 'var(--color-ink-strong)', outline: 'none', padding: '1px 2px',
        };
        const isCustomRel = rel !== 'Father' && rel !== 'Mother';
        if (isEditing) return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '4px 0' }} onClick={e => e.stopPropagation()}>
            <input autoFocus value={name} placeholder="보호자 이름"
              onChange={e => handleEdit(row.id, 'guardian_name', e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape' || e.key === 'Enter') setOpenCell(null); }}
              style={lineStyle} />
            <select value={isCustomRel ? 'Etc' : rel} onChange={e => handleEdit(row.id, 'guardian_relation', e.target.value)} style={{ ...lineStyle, cursor: 'pointer' }}>
              <option value="Father">아빠</option>
              <option value="Mother">엄마</option>
              <option value="Etc">기타</option>
            </select>
            {isCustomRel && (
              <input
                placeholder="관계 입력 (예: 할머니)"
                value={rel !== 'Etc' ? rel : ''}
                onChange={e => handleEdit(row.id, 'guardian_relation', e.target.value || 'Etc')}
                style={lineStyle}
              />
            )}
          </div>
        );
        return (
          <div onClick={e => { e.stopPropagation(); onCellClick(); setOpenCell(cellId); }}
            style={{ height: '100%', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', overflow: 'hidden' }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name || '–'}</span>
            <span style={{ fontSize: 11, color: 'var(--color-ink-mute)', flexShrink: 0 }}>({relLabel(rel)})</span>
          </div>
        );
      },
    };
    if (col.key === 'camp_period') return {
      ...col,
      type: 'custom' as const,
      getValue: (r: Student, e: Record<string, string>) => {
        if (isEffectivelyUnassigned(r)) {
          return e['program_period'] ?? `${r.program_start ?? ''}||${r.program_end ?? ''}`;
        }
        const campId = e['current_camp_id'] ?? r.history.current_camp_id;
        const camp = liveCampMap[campId] as Camp | undefined;
        if (!camp?.start_date || !camp?.end_date) return '';
        const fmt = (iso: string) => iso.length >= 10 ? iso.slice(2).replace(/-/g, '/') : iso;
        return `${fmt(camp.start_date)} ~ ${camp.end_date.slice(5).replace(/-/g, '/')}`;
      },
      setValue: (_: Student, v: string) => ({ field: 'program_period', value: v }),
      render: ({ row, value, cellId, openCell, setOpenCell, onCellClick, onSave }: {
        row: Student; value: string; cellId: string;
        openCell: string | null; setOpenCell: (id: string | null) => void;
        onCellClick: () => void; onSave: (v: string) => void;
      }) => {
        if (isEffectivelyUnassigned(row)) {
          return (
            <CalendarRangeCell
              value={value}
              cellId={cellId}
              openCell={openCell}
              setOpenCell={setOpenCell}
              onSave={onSave}
              onCellClick={onCellClick}
            />
          );
        }
        return (
          <span style={{ fontSize: 13, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
            {value}
          </span>
        );
      },
    };
    if (col.key === 'current_camp_id') return {
      ...col,
      type: 'custom' as const,
      getValue: (r: Student, e: Record<string, string>) => e['current_camp_id'] ?? r.history.current_camp_id,
      render: ({ row, value }: { row: Student; value: string }) => {
        const campId = value || row.history.current_camp_id;
        const camp = liveCampMap[campId];
        const badge = camp?.status ? CAMP_BADGE[camp.status] : undefined;
        if (!camp || !badge) {
          return <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-mute)', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-pill)', padding: '2px 8px' }}>미배정</span>;
        }
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>{camp.name}</span>
            <span style={{ fontSize: 11, ...badge, borderRadius: 10, padding: '1px 7px', alignSelf: 'flex-start' }}>{camp.status}</span>
          </div>
        );
      },
    };
    return col;
  }), [agentOpts, agentIdToName, agentNameToId, liveCampMap]);
  const campOpts = useMemo(() => [...new Set<string>(students.map(s => s.history.current_camp_id))], [students]);

  const filtered = useMemo(() => {
    let list = students.filter(s => s.name_ko || s.name_en);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(s =>
        s.name_ko.includes(q) || s.name_en.toLowerCase().includes(q) ||
        s.guardian.email.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
      );
    }
    if (agentFilter) list = list.filter(s => s.history.agent_id === agentFilter);
    if (campFilter.length > 0) list = list.filter(s => campFilter.includes(s.history.current_camp_id));
    if (dupFilter) list = list.filter(s => s.duplicate_suspect);
    if (campStatusFilter) {
      list = campStatusFilter === '미배정'
        ? list.filter(s => isEffectivelyUnassigned(s))
        : list.filter(s => liveCampMap[s.history.current_camp_id]?.status === campStatusFilter);
    }
    if (periodFilter.start || periodFilter.end) {
      list = list.filter(s => {
        const camp = liveCampMap[s.history.current_camp_id];
        if (!camp?.start_date) return false;
        if (periodFilter.start && camp.start_date < periodFilter.start) return false;
        if (periodFilter.end && camp.start_date > periodFilter.end) return false;
        return true;
      });
    }
    if (sortKey) {
      list.sort((a, b) => {
        const va = sortKey==='name' ? a.name_ko : sortKey==='age' ? String(a.age)
          : sortKey==='joined' ? a.history.joined_date : sortKey==='birth' ? a.birth_date
          : sortKey==='gender' ? a.gender
          : sortKey==='camp_period' ? (liveCampMap[a.history.current_camp_id]?.start_date ?? '')
          : '';
        const vb = sortKey==='name' ? b.name_ko : sortKey==='age' ? String(b.age)
          : sortKey==='joined' ? b.history.joined_date : sortKey==='birth' ? b.birth_date
          : sortKey==='gender' ? b.gender
          : sortKey==='camp_period' ? (liveCampMap[b.history.current_camp_id]?.start_date ?? '')
          : '';
        return (sortDir === 'asc' ? 1 : -1) * va.localeCompare(vb);
      });
    }
    return list;
  }, [students, query, agentFilter, campFilter, dupFilter, campStatusFilter, periodFilter, sortKey, sortDir, liveCampMap]);

  const pageData = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div>

      {/* Filter Bar */}
      <div className="ew-filter-bar">
        <h1 className="ew-filter-bar__title">학생관리</h1>
        <div className="ew-filter-bar__group">
          <div className="ew-filter-input-wrap" style={{ width: 280 }}>
            <span className="search-icon"><SearchIcon /></span>
            <input type="text" placeholder="이름·이메일·ID 검색" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} />
          </div>
          <FilterPill
            label="Agent"
            values={agentFilter ? [agentIdToName[agentFilter] ?? agentFilter] : []}
            options={agentOpts}
            withCheckbox
            onChange={vs => { setAgentFilter(agentNameToId[vs[0]] ?? vs[0] ?? ''); setPage(1); }}
          />
          <FilterPill
            label="Camp"
            values={campFilter}
            options={campOpts}
            getLabel={id => campMap[id]?.name ?? id}
            multi
            withCheckbox
            onChange={vs => { setCampFilter(vs); setPage(1); }}
          />
          <FilterPill
            label="캠프 상태"
            values={campStatusFilter ? [campStatusFilter] : []}
            options={['준비중', '진행중', '미배정']}
            withCheckbox
            onChange={vs => { setCampStatusFilter(vs[0] ?? ''); setPage(1); }}
          />
          {students.some(s => s.duplicate_suspect) && (
            <button
              className={`ew-filter-pill${dupFilter ? ' open' : ''}`}
              onClick={() => { setDupFilter(v => !v); setPage(1); }}
            >⚠ 중복의심 {students.filter(s => s.duplicate_suspect).length}</button>
          )}
          <button
            ref={periodRef}
            className={`ew-filter-pill${(periodFilter.start || periodFilter.end || periodOpen) ? ' open' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => {
              if (!periodOpen) {
                const rect = periodRef.current?.getBoundingClientRect();
                if (rect) setPeriodPos({ top: rect.bottom + 6, left: rect.left });
              }
              setPeriodOpen(v => !v);
            }}
          >
            <img src={(periodFilter.start || periodFilter.end || periodOpen) ? '/icon/Calendar_selected.svg' : '/icon/Calendar.svg'} alt="" style={{ width: 14, height: 14, flexShrink: 0 }} />
            <span style={{ whiteSpace: 'nowrap' }}>
              {periodFilter.start || periodFilter.end
                ? `${periodFilter.start ? periodFilter.start.slice(2).replace(/-/g, '/') : '?'} ~ ${periodFilter.end ? periodFilter.end.slice(5).replace(/-/g, '/') : '?'}`
                : '날짜 선택'}
            </span>
            {(periodFilter.start || periodFilter.end) && (
              <span
                style={{ marginLeft: 2, opacity: 0.5, fontSize: 15, lineHeight: 1 }}
                onClick={e => { e.stopPropagation(); setPeriodFilter({ start: '', end: '' }); setPage(1); }}
              >×</span>
            )}
          </button>
          {periodOpen && createPortal(
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setPeriodOpen(false)} />
              <div className="ew-smart-overlay-portal" style={{ position: 'fixed', top: periodPos.top, left: periodPos.left, zIndex: 200 }}>
                <CalendarRangeOverlay
                  key={`${periodFilter.start}||${periodFilter.end}`}
                  startISO={periodFilter.start}
                  endISO={periodFilter.end}
                  onSelect={(start, end) => { setPeriodFilter({ start, end }); setPage(1); setPeriodOpen(false); }}
                />
              </div>
            </>,
            document.body
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '0 var(--page-px)' }}>

      {/* Action bar */}
      <div style={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)', justifyContent: 'flex-end'}}>
        <span style={{ flex: 1, fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-ko)', lineHeight: '26px' }}>
          {selected.size > 0 ? `${selected.size}명 선택됨` : ''}
        </span>
        <button className="ew-btn ew-btn--primary ew-btn--xsm" onClick={() => { setAddingRow(true); setNewEdits({}); setPage(1); }}>학생 추가</button>
        {/* 클래스 생성: 2명 이상 선택 + 모두 미배정인 경우 */}
        {selected.size >= 2 && [...selected].every(id => {
          const s = students.find(x => x.id === id);
          return s && isEffectivelyUnassigned(s);
        }) && (onCampCreate || onClassCreate) && (
          <button className="ew-btn ew-btn--primary ew-btn--xsm" onClick={() => {
            const selStudents = students.filter(s => selected.has(s.id));
            const dates = selStudents.map(s => ({ start: s.program_start ?? '', end: s.program_end ?? '' }));
            const sameStart = dates.every(d => d.start === dates[0].start);
            const sameEnd   = dates.every(d => d.end === dates[0].end);
            setClassModal({
              step: 1,
              className: '',
              campTab: 'existing',
              existingCampId: '',
              newCampName: '',
              newCampCode: '',
              newLocation: '',
              newCapacity: '',
              newStatus: '준비중',
              newStartDate: sameStart ? dates[0].start : '',
              newEndDate:   sameEnd   ? dates[0].end   : '',
            });
          }}>클래스 생성</button>
        )}
        {/* 플래그 해제: 선택 중 중복의심 있을 때 */}
        {selected.size > 0 && [...selected].some(id => students.find(s => s.id === id)?.duplicate_suspect) && onStudentUpdate && (
          <button className="ew-btn ew-btn--secondary ew-btn--xsm" onClick={() => {
            [...selected].forEach(id => {
              const s = students.find(x => x.id === id);
              if (s?.duplicate_suspect) onStudentUpdate({ ...s, duplicate_suspect: false });
            });
            setSelected(new Set());
          }}>⚠ 플래그 해제</button>
        )}
        {selected.size > 0 && onStudentDelete && (
          <button className="ew-btn ew-btn--danger ew-btn--xsm" onClick={() => {
            const targets = students.filter(s => selected.has(s.id));
            const campNames = [...new Set(
              targets.flatMap(s => s.camp_records?.map(r => campMap[r.camp_id]?.name ?? r.camp_id) ?? [])
            )].filter(Boolean);
            const campLine = campNames.length > 0 ? `\n\n참여 캠프: ${campNames.join(', ')}\n위 캠프에서도 자동으로 제외됩니다.` : '';
            if (window.confirm(`학생 ${targets.length}명을 삭제합니다.${campLine}\n\n계속하시겠습니까?`)) {
              onStudentDelete(Array.from(selected));
              setSelected(new Set());
            }
          }}>삭제</button>
        )}
        <button className="ew-btn ew-btn--secondary ew-btn--xsm" onClick={() => uploadRef.current?.click()}>엑셀 업로드</button>
        <button className="ew-btn ew-btn--secondary ew-btn--xsm" onClick={handleDownload}>엑셀 다운로드</button>
        <input ref={uploadRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleUploadFile} />
      </div>

      {/* Table */}
      <div className="ew-board" style={{ borderRadius: 0, border: 'none', borderTop: '1px solid var(--color-border-table)' }}>
        {addingRow && <div style={{ padding: '6px 12px 4px', fontSize: 12, color: 'var(--color-primary)', fontFamily: 'var(--font-ko)', background: 'var(--color-primary-bg)', borderBottom: '1px solid var(--color-border-faint)' }}>
          이름(한글)을 입력하면 저장 버튼이 활성화됩니다. <span style={{ color: 'var(--color-ink-mute)' }}>Tab으로 다음 필드로 이동</span>
        </div>}
        <BoardTable
          data={pageData}
          allData={students as Student[]}
          columns={columns}
          selected={selected}
          onSelectedChange={setSelected}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={toggleSort}
          localEdits={localEdits}
          onEdit={handleEdit}
          onRowClick={onStudentSelect}
          tableId="students"
          newRow={addingRow ? (() => {
            const ni: React.CSSProperties = { width: '100%', height: 22, border: 'none', borderBottom: '1px solid var(--color-border-subtle)', background: 'transparent', fontSize: 13, fontFamily: 'var(--font-ko)', color: 'var(--color-ink-strong)', outline: 'none', padding: '0 2px' };
            const si: React.CSSProperties = { ...ni, cursor: 'pointer' };
            const canSave = !!(newEdits.name_ko?.trim());
            return (
              <tr style={{ background: 'var(--color-primary-bg)' }}>
                <td style={{ textAlign: 'center', padding: '0 8px' }}>
                  <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                    <button title="저장" disabled={!canSave} onClick={handleSaveNewRow}
                      style={{ width: 22, height: 22, borderRadius: 4, border: 'none', cursor: canSave ? 'pointer' : 'not-allowed', background: canSave ? 'var(--color-primary)' : 'var(--color-border-subtle)', color: canSave ? '#fff' : 'var(--color-ink-faint)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</button>
                    <button title="취소" onClick={() => { setAddingRow(false); setNewEdits({}); }}
                      style={{ width: 22, height: 22, borderRadius: 4, border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--color-ink-mute)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                  </div>
                </td>
                {/* 학생 이름 */}
                <td style={{ padding: '6px 12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <input autoFocus placeholder="이름(한글) *" value={newEdits.name_ko ?? ''} onChange={e => setNewEdits(p => ({ ...p, name_ko: e.target.value }))} style={{ ...ni, fontWeight: 500 }} />
                    <input placeholder="이름(영문)" value={newEdits.name_en ?? ''} onChange={e => setNewEdits(p => ({ ...p, name_en: e.target.value }))} style={{ ...ni, fontSize: 11, color: 'var(--color-ink-mute)' }} />
                  </div>
                </td>
                {/* 성별 */}
                <td style={{ padding: '6px 12px' }}>
                  <select value={newEdits.gender ?? 'Male'} onChange={e => setNewEdits(p => ({ ...p, gender: e.target.value }))} style={si}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </td>
                {/* 나이 */}
                <td style={{ padding: '6px 12px' }}>
                  <select value={newEdits.age ?? ''} onChange={e => setNewEdits(p => ({ ...p, age: e.target.value }))} style={si}>
                    <option value="">-</option>
                    {Array.from({ length: 20 }, (_, i) => `${i + 1}세`).map(a => <option key={a}>{a}</option>)}
                  </select>
                </td>
                {/* 학년 */}
                <td style={{ padding: '6px 12px' }}>
                  <input placeholder="예: 중2" value={newEdits.grade ?? ''} onChange={e => setNewEdits(p => ({ ...p, grade: e.target.value }))} style={ni} />
                </td>
                {/* 생일 */}
                <td style={{ padding: '6px 12px' }}>
                  <input type="date" value={newEdits.birth_date ?? ''} onChange={e => setNewEdits(p => ({ ...p, birth_date: e.target.value }))} style={ni} />
                </td>
                {/* 보호자 */}
                <td style={{ padding: '6px 12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <input placeholder="보호자 이름" value={newEdits.guardian_name ?? ''} onChange={e => setNewEdits(p => ({ ...p, guardian_name: e.target.value }))} style={ni} />
                    <select value={newEdits.guardian_relation ?? 'Mother'} onChange={e => setNewEdits(p => ({ ...p, guardian_relation: e.target.value }))} style={{ ...si, fontSize: 11 }}>
                      <option value="Father">아빠</option>
                      <option value="Mother">엄마</option>
                      <option value="Etc">기타</option>
                    </select>
                  </div>
                </td>
                {/* 연락처 */}
                <td style={{ padding: '6px 12px' }}>
                  <input placeholder="010-0000-0000" value={newEdits.contact ?? ''} onChange={e => setNewEdits(p => ({ ...p, contact: e.target.value }))} style={ni} />
                </td>
                {/* Email */}
                <td style={{ padding: '6px 12px' }}>
                  <input placeholder="email@example.com" value={newEdits.email ?? ''} onChange={e => setNewEdits(p => ({ ...p, email: e.target.value }))} style={ni} />
                </td>
                {/* 가입일 */}
                <td style={{ padding: '6px 12px' }}>
                  <input type="date" value={newEdits.joined_date ?? new Date().toISOString().slice(0, 10)} onChange={e => setNewEdits(p => ({ ...p, joined_date: e.target.value }))} style={ni} />
                </td>
                {/* Agent */}
                <td style={{ padding: '6px 12px' }}>
                  <select value={agentIdToName[newEdits.agent_id ?? ''] ?? ''} onChange={e => setNewEdits(p => ({ ...p, agent_id: agentNameToId[e.target.value] ?? '' }))} style={si}>
                    <option value="">-</option>
                    {agentOpts.map(a => <option key={a}>{a}</option>)}
                  </select>
                </td>
                {/* 현재 캠프 / 기간 — 저장 후 배정 */}
                <td style={{ padding: '6px 12px' }}><span style={{ fontSize: 11, color: 'var(--color-ink-faint)', fontFamily: 'var(--font-ko)' }}>저장 후 배정</span></td>
                <td />
              </tr>
            );
          })() : undefined}
        />
        <Pagination
          total={filtered.length}
          page={page}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={setPerPage}
        />
      </div>
      </div>

      {/* 업로드 결과 요약 팝업 */}
      {uploadSummary && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--color-canvas)', borderRadius: 12, padding: '28px 32px', minWidth: 320, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-ink-strong)', fontFamily: 'var(--font-ko)' }}>업로드 완료</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: '신규 추가', value: uploadSummary.added, color: 'var(--color-success)' },
                { label: '수정 (ID 일치)', value: uploadSummary.updated, color: 'var(--color-primary)' },
                { label: '중복 의심 ⚠', value: uploadSummary.duplicate, color: '#B45309' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--color-border-faint)' }}>
                  <span style={{ fontSize: 'var(--text-base)', fontFamily: 'var(--font-ko)', color: 'var(--color-ink-soft)' }}>{label}</span>
                  <span style={{ fontSize: 'var(--text-md)', fontWeight: 700, fontFamily: 'var(--font-mono)', color }}>{value}명</span>
                </div>
              ))}
            </div>
            {uploadSummary.duplicate > 0 && (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-mute)', fontFamily: 'var(--font-ko)', margin: 0 }}>
                중복 의심 학생은 ⚠ 표시됩니다. 필터에서 확인 후 직접 정리하세요.
              </p>
            )}
            <button className="ew-btn ew-btn--primary ew-btn--sm" onClick={() => setUploadSummary(null)} style={{ alignSelf: 'flex-end' }}>확인</button>
          </div>
        </div>
      )}

      {/* 클래스 생성 모달 — 2단계 */}
      {classModal && (() => {
        const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', height: 38, border: '1px solid var(--color-border-subtle)', borderRadius: 6, padding: '0 12px', fontSize: 'var(--text-base)', fontFamily: 'var(--font-ko)', outline: 'none', color: 'var(--color-ink-strong)', background: 'var(--color-canvas)' };
        const labelStyle: React.CSSProperties = { fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-ink-soft)', fontFamily: 'var(--font-ko)' };

        const sortedCamps = Object.values(liveCampMap).sort((a, b) => {
          const order: Record<string, number> = { '진행중': 0, '준비중': 1 };
          return (order[a.status] ?? 2) - (order[b.status] ?? 2);
        });

        function handleCreate() {
          if (!classModal) return;
          if (classModal.campTab === 'existing') {
            if (!classModal.existingCampId) return;
            onClassCreate?.(classModal.existingCampId, classModal.className.trim(), [...selected]);
          } else {
            if (!classModal.newCampName.trim()) return;
            const campId = classModal.newCampCode.trim() || `CAMP-${Date.now()}`;
            const newCamp: Camp = {
              id: campId,
              name: classModal.newCampName.trim(),
              location: classModal.newLocation.trim(),
              country: '',
              accommodation: '',
              capacity: parseInt(classModal.newCapacity, 10) || 0,
              status: classModal.newStatus || '준비중',
              start_date: classModal.newStartDate,
              end_date: classModal.newEndDate,
              staff: [],
            };
            onCampCreate?.(newCamp, classModal.className.trim(), [...selected]);
          }
          setClassModal(null);
          setNewPeriodOpen(false);
          setSelected(new Set());
        }

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'var(--color-canvas)', borderRadius: 12, padding: '28px 32px', width: 440, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {classModal.step === 1 ? (<>
                <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-ink-strong)', fontFamily: 'var(--font-ko)' }}>클래스 생성</div>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-mute)', fontFamily: 'var(--font-ko)', margin: 0 }}>
                  선택한 학생 {selected.size}명을 배정할 클래스 이름을 입력하세요.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={labelStyle}>클래스명</span>
                  <input
                    autoFocus
                    value={classModal.className}
                    onChange={e => setClassModal(p => p ? { ...p, className: e.target.value } : p)}
                    placeholder="클래스 이름을 입력하세요"
                    style={inputStyle}
                    onKeyDown={e => { if (e.key === 'Enter' && classModal.className.trim()) setClassModal(p => p ? { ...p, step: 2 } : p); }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="ew-btn ew-btn--ghost ew-btn--sm" onClick={() => setClassModal(null)}>취소</button>
                  <button className="ew-btn ew-btn--primary ew-btn--sm" onClick={() => { if (classModal.className.trim()) setClassModal(p => p ? { ...p, step: 2 } : p); }}>다음</button>
                </div>
              </>) : (<>
                <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-ink-strong)', fontFamily: 'var(--font-ko)' }}>캠프 선택</div>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-mute)', fontFamily: 'var(--font-ko)', margin: 0 }}>
                  <strong style={{ color: 'var(--color-ink-strong)' }}>{classModal.className}</strong> 클래스를 추가할 캠프를 선택하세요.
                </p>

                {/* 탭 */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border-subtle)', gap: 0 }}>
                  {(['existing', 'new'] as const).map(tab => (
                    <button key={tab}
                      onClick={() => setClassModal(p => p ? { ...p, campTab: tab } : p)}
                      style={{ flex: 1, height: 38, background: 'none', border: 'none', borderBottom: classModal.campTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent', cursor: 'pointer', fontSize: 13, fontWeight: classModal.campTab === tab ? 600 : 400, color: classModal.campTab === tab ? 'var(--color-primary)' : 'var(--color-ink-mute)', fontFamily: 'var(--font-ko)', transition: 'all 0.15s', marginBottom: -1 }}
                    >{tab === 'existing' ? '기존 캠프' : '신규 생성'}</button>
                  ))}
                </div>

                {classModal.campTab === 'existing' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                    {sortedCamps.length === 0
                      ? <p style={{ fontSize: 13, color: 'var(--color-ink-mute)', fontFamily: 'var(--font-ko)', margin: 0 }}>등록된 캠프가 없습니다.</p>
                      : sortedCamps.map(camp => {
                          const badge = CAMP_BADGE[camp.status ?? ''];
                          const isSelected = classModal.existingCampId === camp.id;
                          return (
                            <div key={camp.id}
                              onClick={() => setClassModal(p => p ? { ...p, existingCampId: camp.id } : p)}
                              style={{ padding: '10px 14px', borderRadius: 8, border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border-subtle)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isSelected ? 'var(--color-primary-bg)' : 'var(--color-canvas)' }}
                            >
                              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-ink-strong)', fontFamily: 'var(--font-ko)' }}>{camp.name}</span>
                              {camp.status && (
                                <span style={{ fontSize: 11, borderRadius: 10, padding: '2px 8px', ...(badge ?? { bg: 'var(--color-bg-subtle)', color: 'var(--color-ink-mute)' }), background: badge?.bg ?? 'var(--color-bg-subtle)', color: badge?.color ?? 'var(--color-ink-mute)' }}>{camp.status}</span>
                              )}
                            </div>
                          );
                        })
                    }
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={labelStyle}>캠프명 *</span>
                        <input value={classModal.newCampName} onChange={e => setClassModal(p => p ? { ...p, newCampName: e.target.value } : p)} placeholder="캠프 이름" style={inputStyle} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={labelStyle}>캠프코드</span>
                        <input value={classModal.newCampCode} onChange={e => setClassModal(p => p ? { ...p, newCampCode: e.target.value } : p)} placeholder="예: C26S" style={inputStyle} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={labelStyle}>지역</span>
                        <input value={classModal.newLocation} onChange={e => setClassModal(p => p ? { ...p, newLocation: e.target.value } : p)} placeholder="예: 캐나다 밴쿠버" style={inputStyle} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={labelStyle}>정원</span>
                        <input type="number" min="0" value={classModal.newCapacity} onChange={e => setClassModal(p => p ? { ...p, newCapacity: e.target.value } : p)} placeholder="0" style={inputStyle} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={labelStyle}>상태</span>
                        <select value={classModal.newStatus} onChange={e => setClassModal(p => p ? { ...p, newStatus: e.target.value } : p)} style={{ ...inputStyle, cursor: 'pointer' }}>
                          <option value="준비중">준비중</option>
                          <option value="진행중">진행중</option>
                          <option value="종료">종료</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={labelStyle}>기간</span>
                        <button
                          ref={newPeriodRef}
                          type="button"
                          onClick={() => {
                            if (!newPeriodOpen) {
                              const rect = newPeriodRef.current?.getBoundingClientRect();
                              if (rect) setNewPeriodPos({ top: rect.bottom + 4, left: rect.left });
                            }
                            setNewPeriodOpen(v => !v);
                          }}
                          style={{ ...inputStyle, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, border: (classModal.newStartDate || classModal.newEndDate || newPeriodOpen) ? '1px solid var(--color-primary)' : '1px solid var(--color-border-subtle)' }}
                        >
                          <img src={(classModal.newStartDate || classModal.newEndDate || newPeriodOpen) ? '/icon/Calendar_selected.svg' : '/icon/Calendar.svg'} alt="" style={{ width: 14, height: 14, flexShrink: 0 }} />
                          <span style={{ fontSize: 13, color: (classModal.newStartDate || classModal.newEndDate) ? 'var(--color-ink-strong)' : 'var(--color-ink-faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {classModal.newStartDate || classModal.newEndDate
                              ? `${classModal.newStartDate ? classModal.newStartDate.slice(2).replace(/-/g, '/') : '?'} ~ ${classModal.newEndDate ? classModal.newEndDate.slice(5).replace(/-/g, '/') : '?'}`
                              : '날짜 선택'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="ew-btn ew-btn--ghost ew-btn--sm" onClick={() => setClassModal(p => p ? { ...p, step: 1 } : p)}>이전</button>
                  <button className="ew-btn ew-btn--ghost ew-btn--sm" onClick={() => { setClassModal(null); setNewPeriodOpen(false); }}>취소</button>
                  <button className="ew-btn ew-btn--primary ew-btn--sm" onClick={handleCreate}>생성</button>
                </div>
              </>)}
            </div>
          </div>
        );
      })()}

      {newPeriodOpen && classModal && createPortal(
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 1099 }} onClick={() => setNewPeriodOpen(false)} />
          <div className="ew-smart-overlay-portal" style={{ position: 'fixed', top: newPeriodPos.top, left: newPeriodPos.left, zIndex: 1100 }}>
            <CalendarRangeOverlay
              key={`${classModal.newStartDate}||${classModal.newEndDate}`}
              startISO={classModal.newStartDate}
              endISO={classModal.newEndDate}
              onSelect={(start, end) => {
                setClassModal(p => p ? { ...p, newStartDate: start, newEndDate: end } : p);
                setNewPeriodOpen(false);
              }}
            />
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
