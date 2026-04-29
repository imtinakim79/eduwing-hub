// 캠프관리 리스트 페이지
// 피그마 node 472:5113 기반 + FieldCell Library (167:1305) 반영
import { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import Pagination from '../components/Pagination';
import BoardTable from '../components/board/BoardTable';
import { StatusCell, TagList } from '../components/board/cells';
import { useUndoToast } from '../hooks/useUndoToast';
import { FilterPill } from '../components/FilterPill';
import CampTimetableView from './CampTimetableView';
import { loadClasses } from './CampClassTab';
import type { ColumnDef } from '../components/board/types';
import type { Camp } from '../App';

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="9" r="6" stroke="#9CA3AF" strokeWidth="1.5" />
      <path d="M13.5 13.5L17 17" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const ALL_STATUSES = ['진행중', '준비중', '종료'];

// ── Excel helpers ─────────────────────────────────────────────────────────────
function campsToRows(list: Camp[]) {
  return list.map(c => ({
    '캠프명':    c.name,
    '지역':     c.location,
    '국가':     c.country,
    '기간(시작)': c.start_date,
    '기간(종료)': c.end_date,
    '숙소':     c.accommodation,
    '정원':     c.capacity,
    '등록수':    (c as Camp & { enrolledCount?: number }).enrolledCount ?? 0,
    '스탭':     c.staff.join(', '),
    '상태':     c.status,
  }));
}

function rowsToCamps(rows: Record<string, string>[]): Camp[] {
  const toStr = (v: unknown) => (v == null ? '' : String(v).trim());
  return rows
    .filter(r => toStr(r['캠프명']))
    .map(r => ({
      id:            `CAMP-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name:          toStr(r['캠프명']),
      location:      toStr(r['지역']),
      country:       toStr(r['국가']) || 'KR',
      accommodation: toStr(r['숙소']),
      capacity:      parseInt(toStr(r['정원']), 10) || 0,
      status:        toStr(r['상태']) || '준비중',
      start_date:    toStr(r['기간(시작)']),
      end_date:      toStr(r['기간(종료)']),
      staff:         toStr(r['스탭']) ? toStr(r['스탭']).split(',').map(s => s.trim()).filter(Boolean) : [],
    }));
}

// ── Timetable Modal ───────────────────────────────────────────────────────────
function TimetableModal({ camp, onClose, onEdit }: {
  camp: Camp; onClose: () => void; onEdit?: () => void;
}) {
  const classes = loadClasses(camp.id);
  const [activeClassId, setActiveClassId] = useState<string | null>(
    classes.length > 0 ? classes[0].id : null
  );

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: 12, width: '90vw', maxWidth: 1200, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--color-border-table)', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-ko)', fontWeight: 600, fontSize: 16, color: 'var(--color-text-primary)', flex: 1 }}>
            {camp.name} — 시간표
          </span>
          {onEdit && (
            <button className="ew-btn ew-btn--ghost ew-btn--sm" style={{ marginRight: 8 }} onClick={onEdit}>수정</button>
          )}
          <button
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-text-muted)', fontSize: 20, lineHeight: 1 }}
            onClick={onClose}
          >✕</button>
        </div>

        {/* Class subtabs */}
        {classes.length > 0 && (
          <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border-table)', padding: '0 16px', background: '#FAFBFF', flexShrink: 0 }}>
            {classes.map(cls => (
              <button
                key={cls.id}
                onClick={() => setActiveClassId(cls.id)}
                style={{
                  padding: '8px 16px', fontSize: 13, fontFamily: 'var(--font-ko)',
                  fontWeight: cls.id === activeClassId ? 600 : 400,
                  color: cls.id === activeClassId ? 'var(--color-primary)' : 'var(--color-text-sub)',
                  background: 'none', border: 'none',
                  borderBottom: cls.id === activeClassId ? '2px solid var(--color-primary)' : '2px solid transparent',
                  cursor: 'pointer', marginBottom: -1,
                }}
              >
                {cls.name || '(미입력)'}
                {cls.teacher && <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 6 }}>{cls.teacher}</span>}
              </button>
            ))}
          </div>
        )}

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {classes.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 14, fontFamily: 'var(--font-ko)' }}>
              등록된 클래스가 없습니다
            </div>
          ) : (
            <CampTimetableView campId={camp.id} classId={activeClassId ?? undefined} />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Duplicate Confirm Modal ───────────────────────────────────────────────────
function DuplicateConfirmModal({ duplicateNames, onOverwrite, onSkip, onCancel }: {
  duplicateNames: string[];
  onOverwrite: () => void;
  onSkip: () => void;
  onCancel: () => void;
}) {
  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onCancel}
    >
      <div
        style={{ background: '#fff', borderRadius: 12, width: 480, padding: '28px 32px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontFamily: 'var(--font-ko)', fontWeight: 600, fontSize: 16, color: 'var(--color-text-primary)', marginBottom: 12 }}>
          중복 캠프 발견
        </div>
        <div style={{ fontFamily: 'var(--font-ko)', fontSize: 13, color: 'var(--color-text-sub)', marginBottom: 8 }}>
          아래 {duplicateNames.length}개 캠프가 이미 존재합니다.
        </div>
        <div style={{ background: 'var(--color-bg-gray)', borderRadius: 6, padding: '10px 14px', marginBottom: 20, maxHeight: 160, overflowY: 'auto' }}>
          {duplicateNames.map(name => (
            <div key={name} style={{ fontSize: 13, fontFamily: 'var(--font-ko)', color: 'var(--color-text-medium)', padding: '2px 0' }}>• {name}</div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="ew-btn ew-btn--secondary ew-btn--sm" onClick={onCancel}>취소</button>
          <button className="ew-btn ew-btn--secondary ew-btn--sm" onClick={onSkip}>신규만 추가</button>
          <button className="ew-btn ew-btn--primary ew-btn--sm" onClick={onOverwrite}>덮어쓰기</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Column Config ─────────────────────────────────────────────────────────────
function makeCampColumns(
  onCampSelect?: (id: string) => void,
  onTimetableOpen?: (id: string) => void,
): ColumnDef<Camp>[] {
  return [
  {
    key: 'name', label: '캠프명', width: 200, sortKey: 'name', type: 'custom',
    tdStyle: { padding: '0 12px' },
    getValue: (r) => r.name,
    render: ({ value, row }) => (
      <span
        title={value}
        style={{ fontSize: 13, fontWeight: 400, cursor: onCampSelect ? 'pointer' : 'default', color: onCampSelect ? 'var(--color-primary)' : 'inherit', textDecoration: onCampSelect ? 'underline' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}
        onClick={e => { e.stopPropagation(); onCampSelect?.((row as Camp).id); }}
      >{value}</span>
    ),
  },
  {
    key: 'id', label: '캠프 코드', width: 160, type: 'readonly',
    getValue: (r) => r.id,
  },
  {
    key: 'period', label: '기간', width: 185, type: 'readonly',
    getValue: (r) => {
      if (!r.start_date || !r.end_date) return '-';
      const fmt = (d: string) => d.slice(2).replace(/-/g, '/');
      return `${fmt(r.start_date)} ~ ${fmt(r.end_date)}`;
    },
  },
  {
    key: 'location', label: '지역', width: 150, sortKey: 'location', type: 'readonly',
    getValue: (r) => r.location,
  },
  {
    key: 'accommodation', label: '숙소', width: 150, type: 'readonly',
    getValue: (r, e) => e['accommodation'] ?? r.accommodation,
  },
  {
    key: 'capacity', label: '정원', width: 90, type: 'readonly',
    getValue: (r) => {
      if (!r.capacity) return '-';
      const enrolled = (r as Camp & { enrolledCount?: number }).enrolledCount ?? 0;
      return `${enrolled} / ${r.capacity}명`;
    },
  },
  {
    key: 'staff', label: '스탭', width: 130, type: 'custom',
    tdStyle: { padding: '10px 12px', whiteSpace: 'normal', verticalAlign: 'middle' },
    getValue: (r) => r.staff.join(','),
    render: ({ row }) => (row as Camp).staff.length
      ? <TagList items={(row as Camp).staff} color="var(--color-primary)" />
      : <span style={{ color: 'var(--color-text-muted)' }}>-</span>,
  },
  {
    key: 'status', label: '상태', width: 130, sortKey: 'status', type: 'custom',
    tdStyle: { padding: '0 12px' },
    options: ALL_STATUSES,
    getValue: (r, e) => e['status'] ?? r.status,
    setValue: (_, v) => ({ field: 'status', value: v }),
    render: ({ value, cellId, openCell, setOpenCell, onCellClick, onSave }) => (
      <StatusCell
        value={value}
        options={ALL_STATUSES}
        cellId={cellId}
        openCell={openCell}
        setOpenCell={setOpenCell}
        onChange={onSave}
        onCellClick={onCellClick}
        onEditDone={() => {}}
      />
    ),
  },
  {
    key: 'timetable', label: '시간표', width: 100, type: 'custom',
    tdStyle: { padding: '0 16px', textAlign: 'center' },
    getValue: (r) => r.id,
    render: ({ value }) => (
      <button
        className="ew-btn ew-btn--ghost ew-btn--sm"
        style={{ minWidth: 60 }}
        onClick={e => { e.stopPropagation(); onTimetableOpen?.(value); }}
      >보기</button>
    ),
  },
  ];
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CampBoardPage({
  camps, onCampSelect, onCampCreate, onTimetableEdit, onCampImport, onCampUpdate,
}: {
  camps: Camp[];
  onCampSelect?: (campId: string) => void;
  onCampCreate?: () => void;
  onTimetableEdit?: (campId: string) => void;
  onCampImport?: (camps: Camp[]) => void;
  onCampUpdate?: (camp: Camp) => void;
}) {
  const { showUndo } = useUndoToast();
  const [query,               setQuery]              = useState('');
  const [locationFilter,      setLocationFilter]     = useState('');
  const [statusFilter,        setStatusFilter]       = useState('');
  const [selected,            setSelected]           = useState<Set<string>>(new Set());
  const [page,                setPage]               = useState(1);
  const [perPage,             setPerPage]            = useState(10);
  const [sortKey,             setSortKey]            = useState<string | null>(null);
  const [sortDir,             setSortDir]            = useState<'asc' | 'desc'>('asc');
  const [localEdits,          setLocalEdits]         = useState<Record<string, Record<string, string>>>({});
  const [timetableModalCampId, setTimetableModalCampId] = useState<string | null>(null);
  const [duplicateState,      setDuplicateState]     = useState<{ parsed: Camp[]; duplicateNames: string[] } | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  function handleEdit(rowId: string, field: string, value: string) {
    const prevCamp = camps.find(c => c.id === rowId);
    const prevEdits = localEdits[rowId];
    setLocalEdits(p => ({ ...p, [rowId]: { ...(p[rowId] ?? {}), [field]: value } }));

    // status 필드만 영속화 — 데이터 소유권 맵에 따라 CampBoardPage의 인라인 쓰기 주체는 status뿐
    if (field !== 'status' || !prevCamp || !onCampUpdate) return;

    onCampUpdate({ ...prevCamp, status: value });
    showUndo({
      message: `'${prevCamp.name}' 상태 변경됨`,
      onUndo: () => {
        onCampUpdate(prevCamp);
        setLocalEdits(p => {
          const next = { ...p };
          if (prevEdits) next[rowId] = prevEdits;
          else delete next[rowId];
          return next;
        });
      },
    });
  }

  function getEdit(id: string, field: string, fallback: string) {
    return localEdits[id]?.[field] ?? fallback;
  }

  function toggleSort(k: string) {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('asc'); }
  }

  function handleDownload() {
    const ws = XLSX.utils.json_to_sheet(campsToRows(filtered));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '캠프목록');
    XLSX.writeFile(wb, '캠프목록.xlsx');
  }

  function handleUploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = ev => {
      const data   = new Uint8Array(ev.target!.result as ArrayBuffer);
      const wb     = XLSX.read(data, { type: 'array', cellDates: true });
      const ws     = wb.Sheets[wb.SheetNames[0]];
      const rows   = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { raw: false });
      const parsed = rowsToCamps(rows);
      if (parsed.length === 0) return;

      const existingByName = new Map(camps.map(c => [c.name, c]));
      const duplicateNames = parsed.filter(c => existingByName.has(c.name)).map(c => c.name);

      if (duplicateNames.length > 0) {
        setDuplicateState({ parsed, duplicateNames });
      } else {
        onCampImport?.(parsed);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function applyImport(parsed: Camp[], overwrite: boolean) {
    const existingByName = new Map(camps.map(c => [c.name, c]));
    const result: Camp[] = parsed
      .filter(c => overwrite || !existingByName.has(c.name))
      .map(c => {
        const existing = existingByName.get(c.name);
        return existing ? { ...existing, ...c, id: existing.id } : c;
      });
    onCampImport?.(result);
    setDuplicateState(null);
  }

  const campColumns = useMemo(
    () => makeCampColumns(onCampSelect, setTimetableModalCampId),
    [onCampSelect],
  );
  const locations = useMemo<string[]>(() => [...new Set(camps.map(c => c.location))], [camps]);
  const statuses  = useMemo<string[]>(() => [...new Set(camps.map(c => c.status))],   [camps]);

  const filtered = useMemo(() => {
    let list = [...camps];
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(c => c.name.includes(q) || c.id.toLowerCase().includes(q));
    }
    if (locationFilter) list = list.filter(c => getEdit(c.id, 'location', c.location) === locationFilter);
    if (statusFilter)   list = list.filter(c => getEdit(c.id, 'status', c.status) === statusFilter);
    if (sortKey) {
      list.sort((a, b) => {
        const va = String((a as any)[sortKey] ?? '');
        const vb = String((b as any)[sortKey] ?? '');
        return (sortDir === 'asc' ? 1 : -1) * va.localeCompare(vb);
      });
    }
    return list;
  }, [camps, query, locationFilter, statusFilter, sortKey, sortDir, localEdits]);

  const pageData = filtered.slice((page - 1) * perPage, page * perPage);
  const timetableCamp = timetableModalCampId ? camps.find(c => c.id === timetableModalCampId) : null;

  return (
    <div style={{ minWidth: 1440, overflowX: 'auto' }}>

      {/* Filter Bar */}
      <div className="ew-filter-bar">
        <div style={{ fontFamily: 'var(--font-ko)', fontWeight: 500, fontSize: 20, letterSpacing: '-0.8px', color: 'var(--color-text-medium)', width: 174, flexShrink: 0, textAlign: 'center' }}>캠프관리</div>
        <div className="ew-filter-input-wrap" style={{ width: 255 }}>
          <span className="search-icon"><SearchIcon /></span>
          <input type="text" placeholder="캠프명" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} />
        </div>
        <FilterPill
          label="지역"
          values={locationFilter ? [locationFilter] : []}
          options={locations}
          withCheckbox
          onChange={vs => { setLocationFilter(vs[0] ?? ''); setPage(1); }}
        />
        <FilterPill
          label="상태"
          values={statusFilter ? [statusFilter] : []}
          options={statuses}
          withCheckbox
          onChange={vs => { setStatusFilter(vs[0] ?? ''); setPage(1); }}
        />
        <button className="ew-btn ew-btn--primary ew-btn--lg" style={{ fontFamily: 'var(--font-en)', fontWeight: 600 }}>Search</button>
      </div>

      {/* Action bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 30px', borderBottom: '1px solid var(--color-border-table)', background: '#fff', justifyContent: 'flex-end', minWidth: 1440 }}>
        <span style={{ flex: 1, fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-ko)' }}>
          {selected.size > 0 ? `${selected.size}개 선택됨` : ''}
        </span>
        <button className="ew-btn ew-btn--primary ew-btn--xsm" onClick={onCampCreate}>캠프 추가</button>
        {selected.size > 0 && (
          <button className="ew-btn ew-btn--danger ew-btn--xsm" onClick={() => setSelected(new Set())}>삭제</button>
        )}
        <button className="ew-btn ew-btn--secondary ew-btn--xsm" onClick={() => uploadRef.current?.click()}>엑셀 업로드</button>
        <button className="ew-btn ew-btn--secondary ew-btn--xsm" onClick={handleDownload}>엑셀 다운로드</button>
        <input ref={uploadRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleUploadFile} />
      </div>

      {/* Table */}
      <div className="ew-board" style={{ borderRadius: 0, border: 'none', borderTop: '1px solid var(--color-border-table)' }}>
        <BoardTable
          data={pageData}
          allData={camps}
          columns={campColumns}
          selected={selected}
          onSelectedChange={setSelected}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={toggleSort}
          localEdits={localEdits}
          onEdit={handleEdit}
          rowHeight={72}
          tableId="camps"
        />
        <Pagination
          total={filtered.length}
          page={page}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={setPerPage}
        />
      </div>

      {/* Timetable Modal */}
      {timetableCamp && (
        <TimetableModal
          camp={timetableCamp}
          onClose={() => setTimetableModalCampId(null)}
          onEdit={onTimetableEdit ? () => { setTimetableModalCampId(null); onTimetableEdit(timetableCamp.id); } : undefined}
        />
      )}

      {/* Duplicate Confirm Modal */}
      {duplicateState && (
        <DuplicateConfirmModal
          duplicateNames={duplicateState.duplicateNames}
          onOverwrite={() => applyImport(duplicateState.parsed, true)}
          onSkip={() => applyImport(duplicateState.parsed, false)}
          onCancel={() => setDuplicateState(null)}
        />
      )}
    </div>
  );
}
