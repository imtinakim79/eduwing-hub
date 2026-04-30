// 학생관리 리스트 페이지
// 피그마 node 49:5613 기반 + FieldCell Library (167:1305) 반영
import { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import rawStudents from '../data/students.json';
import rawCamps from '../data/camps.json';
import type { Agent } from './AgentBoardPage';
import Pagination from '../components/Pagination';
import BoardTable from '../components/board/BoardTable';
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
  name_ko: string; name_en: string; gender: 'Male' | 'Female';
  birth_date: string; age: number;
  guardian: { name: string; relation: string; contact: string; email: string };
  history: { joined_date: string; agent_id: string; current_camp_id: string };
  camp_records: CampRecord[];
}
interface Camp { id: string; name: string; status?: string; start_date?: string; end_date?: string; }

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
    key: 'name', label: '학생', width: 160, sortKey: 'name', type: 'thumbnail',
    getValue: (r, e) => e['name_ko'] ?? r.name_ko,
  },
  {
    key: 'gender', label: '성별', width: 100, sortKey: 'gender', type: 'gender',
    getValue: (r, e) => e['gender'] ?? r.gender,
    setValue: (_, v) => ({ field: 'gender', value: v }),
  },
  {
    key: 'age', label: '나이', width: 63, sortKey: 'age', type: 'dropdown',
    options: Array.from({ length: 20 }, (_, i) => `${i + 1}세`),
    getValue: (r, e) => e['age'] ?? `${r.age}세`,
    setValue: (_, v) => ({ field: 'age', value: v }),
  },
  {
    key: 'birth_date', label: '생일', width: 109, sortKey: 'birth', type: 'calendar',
    getValue: (r, e) => e['birth_date'] ?? r.birth_date,
    setValue: (_, v) => ({ field: 'birth_date', value: v }),
  },
  {
    key: 'guardian', label: '보호자', width: 120, type: 'readonly',
    getValue: (r) => `${r.guardian.name}(${relLabel(r.guardian.relation)})`,
  },
  {
    key: 'contact', label: '연락처', width: 135, type: 'readonly',
    getValue: (r) => r.guardian.contact,
  },
  {
    key: 'email', label: 'Email', width: 160, type: 'readonly',
    getValue: (r) => r.guardian.email,
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
    key: 'camp_period', label: '참여 캠프 기간', width: 200, type: 'readonly',
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
      case 'contact':      result.guardian.contact = value; break;
      case 'email':        result.guardian.email = value; break;
      case 'joined_date':  result.history.joined_date = value; break;
      case 'agent_id':     result.history.agent_id = value; break;
      case 'current_camp_id': result.history.current_camp_id = value; break;
    }
  }
  return result;
}

// ── Excel helpers ─────────────────────────────────────────────────────────────
function studentsToRows(list: Student[]) {
  return list.map(s => ({
    'ID':             s.id,
    '이름(한글)':      s.name_ko,
    '이름(영문)':      s.name_en,
    '성별':           s.gender,
    '나이':           s.age,
    '생일':           s.birth_date,
    '보호자 이름':     s.guardian.name,
    '보호자 관계':     s.guardian.relation,
    '연락처':         s.guardian.contact,
    'Email':          s.guardian.email,
    '가입일':         s.history.joined_date,
    'Agent':          s.history.agent_id,
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
      birth_date:      toStr(r['생일']),
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
}: {
  students?: Student[];
  agents?: Agent[];
  camps?: Camp[];
  onAdd?: () => void;
  onStudentSelect?: (id: string) => void;
  onStudentsImport?: (imported: Student[]) => void;
  onStudentUpdate?: (updated: Student) => void;
  onStudentDelete?: (ids: string[]) => void;
}) {
  const { showUndo } = useUndoToast();
  const [query,       setQuery]       = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [campFilter,  setCampFilter]  = useState<string[]>([]);
  const [selected,    setSelected]    = useState<Set<string>>(new Set());
  const [page,        setPage]        = useState(1);
  const [perPage,     setPerPage]     = useState(10);
  const [sortKey,     setSortKey]     = useState<string | null>(null);
  const [sortDir,     setSortDir]     = useState<'asc' | 'desc'>('asc');
  const [localEdits,  setLocalEdits]  = useState<Record<string, Record<string, string>>>({});
  const uploadRef = useRef<HTMLInputElement>(null);

  function handleDownload() {
    const ws = XLSX.utils.json_to_sheet(studentsToRows(students));
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
      const imported = rowsToStudents(rows);
      if (imported.length > 0) onStudentsImport?.(imported);
    };
    reader.readAsArrayBuffer(file);
  }

  function handleEdit(rowId: string, field: string, value: string) {
    const prevStudent = students.find(s => s.id === rowId);
    const prevEdits = localEdits[rowId];
    setLocalEdits(p => ({ ...p, [rowId]: { ...(p[rowId] ?? {}), [field]: value } }));
    if (onStudentUpdate && prevStudent) {
      const mergedEdits = { ...(localEdits[rowId] ?? {}), [field]: value };
      onStudentUpdate(applyEditsToStudent(prevStudent, mergedEdits));

      const displayName = prevStudent.name_ko || prevStudent.name_en || '학생';
      showUndo({
        message: `'${displayName}' 변경됨`,
        onUndo: () => {
          onStudentUpdate(prevStudent);
          setLocalEdits(p => {
            const next = { ...p };
            if (prevEdits) next[rowId] = prevEdits;
            else delete next[rowId];
            return next;
          });
        },
      });
    }
  }

  function toggleSort(k: string) {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('asc'); }
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

  const columns = useMemo(() => studentColumns.map(col => {
    if (col.key === 'agent_id') return {
      ...col,
      options: agentOpts,
      getValue: (r: Student, e: Record<string, string>) => {
        const id = e['agent_id'] ?? r.history.agent_id;
        return agentIdToName[id] ?? id;
      },
      setValue: (_: Student, v: string) => ({ field: 'agent_id', value: agentNameToId[v] ?? v }),
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
    let list = [...students];
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(s =>
        s.name_ko.includes(q) || s.name_en.toLowerCase().includes(q) ||
        s.guardian.email.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
      );
    }
    if (agentFilter) list = list.filter(s => s.history.agent_id === agentFilter);
    if (campFilter.length > 0) list = list.filter(s => campFilter.includes(s.history.current_camp_id));
    if (sortKey) {
      list.sort((a, b) => {
        const va = sortKey==='name' ? a.name_ko : sortKey==='age' ? String(a.age)
          : sortKey==='joined' ? a.history.joined_date : sortKey==='birth' ? a.birth_date
          : sortKey==='gender' ? a.gender : '';
        const vb = sortKey==='name' ? b.name_ko : sortKey==='age' ? String(b.age)
          : sortKey==='joined' ? b.history.joined_date : sortKey==='birth' ? b.birth_date
          : sortKey==='gender' ? b.gender : '';
        return (sortDir === 'asc' ? 1 : -1) * va.localeCompare(vb);
      });
    }
    return list;
  }, [students, query, agentFilter, campFilter, sortKey, sortDir]);

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
        </div>
      </div>

      {/* Action bar */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', padding: 'var(--space-2) var(--page-px)', borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-canvas)', justifyContent: 'flex-end'}}>
        <span style={{ flex: 1, fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-ko)', lineHeight: '26px' }}>
          {selected.size > 0 ? `${selected.size}명 선택됨` : ''}
        </span>
        <button className="ew-btn ew-btn--primary ew-btn--xsm" onClick={onAdd}>학생 추가</button>
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
  );
}
