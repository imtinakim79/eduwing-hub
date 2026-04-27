// 캠프관리 리스트 페이지
// 피그마 node 472:5113 기반 + FieldCell Library (167:1305) 반영
import { useState, useMemo } from 'react';
import Pagination from '../components/Pagination';
import BoardTable from '../components/board/BoardTable';
import { StatusCell, TagList } from '../components/board/cells';
import { FilterPill } from '../components/FilterPill';
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

// ── Column Config (함수로 생성 — onCampSelect 클로저 포함) ───────────────────
function makeCampColumns(onCampSelect?: (id: string) => void): ColumnDef<Camp>[] {
  return [
  {
    key: 'name', label: '캠프명', minWidth: 200, sortKey: 'name', type: 'custom',
    tdStyle: { padding: '0 12px' },
    getValue: (r, e) => e['name'] ?? r.name,
    setValue: (_, v) => ({ field: 'name', value: v }),
    render: ({ value, row }) => (
      <span
        style={{ fontSize: 13, fontWeight: 400, cursor: onCampSelect ? 'pointer' : 'default', color: onCampSelect ? 'var(--color-primary)' : 'inherit', textDecoration: onCampSelect ? 'underline' : 'none' }}
        onClick={e => { e.stopPropagation(); onCampSelect?.((row as Camp).id); }}
      >{value}</span>
    ),
  },
  {
    key: 'period', label: '기간', width: 185, type: 'calendarRange',
    tdStyle: { padding: '0 12px' },
    getValue: (r, e) => {
      if (e['camp_period']) return e['camp_period'];
      if (!r.start_date || !r.end_date) return '';
      return `${r.start_date}||${r.end_date}`;
    },
    setValue: (_, v) => ({ field: 'camp_period', value: v }),
  },
  {
    key: 'location', label: '지역', width: 150, sortKey: 'location', type: 'dropdown',
    options: (all) => [...new Set(all.map(c => c.location))],
    getValue: (r, e) => e['location'] ?? r.location,
    setValue: (_, v) => ({ field: 'location', value: v }),
  },
  {
    key: 'accommodation', label: '숙소', width: 150, type: 'text',
    getValue: (r, e) => e['accommodation'] ?? r.accommodation,
    setValue: (_, v) => ({ field: 'accommodation', value: v }),
  },
  {
    key: 'capacity', label: '정원', width: 80, type: 'text',
    getValue: (r, e) => {
      const raw = e['capacity'] ?? String(r.capacity);
      return raw ? `${raw}명` : '';
    },
    setValue: (_, v) => ({ field: 'capacity', value: v.replace(/[^0-9]/g, '') }),
  },
  {
    key: 'staff', label: '스탭', width: 130, type: 'custom',
    tdStyle: { padding: '10px 16px', height: 96, verticalAlign: 'middle', whiteSpace: 'normal' },
    getValue: (r) => r.staff.join(','),
    render: ({ row }) => <TagList items={(row as Camp).staff} color="var(--color-primary)" />,
  },
  {
    key: 'teachers', label: '강사', width: 155, type: 'custom',
    tdStyle: { padding: '10px 16px', height: 96, verticalAlign: 'middle', whiteSpace: 'normal' },
    getValue: (r) => r.teachers.join(','),
    render: ({ row }) => <TagList items={(row as Camp).teachers} color="#2663D7" />,
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
    getValue: (r, e) => e['status'] ?? r.status,
    render: ({ value }) => (
      <button
        className="ew-btn ew-btn--ghost ew-btn--sm"
        style={{ minWidth: 60 }}
        disabled={value === '종료'}
        onClick={e => e.stopPropagation()}
      >보기</button>
    ),
  },
  ]; // makeCampColumns end
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CampBoardPage({ camps, onCampSelect, onCampCreate }: { camps: Camp[]; onCampSelect?: (campId: string) => void; onCampCreate?: () => void }) {
  const [query,          setQuery]          = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [statusFilter,   setStatusFilter]   = useState('');
  const [selected,       setSelected]       = useState<Set<string>>(new Set());
  const [page,           setPage]           = useState(1);
  const [perPage,        setPerPage]        = useState(10);
  const [sortKey,        setSortKey]        = useState<string | null>(null);
  const [sortDir,        setSortDir]        = useState<'asc' | 'desc'>('asc');
  const [localEdits,     setLocalEdits]     = useState<Record<string, Record<string, string>>>({});

  function handleEdit(rowId: string, field: string, value: string) {
    setLocalEdits(p => ({ ...p, [rowId]: { ...(p[rowId] ?? {}), [field]: value } }));
  }

  function getEdit(id: string, field: string, fallback: string) {
    return localEdits[id]?.[field] ?? fallback;
  }

  function toggleSort(k: string) {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('asc'); }
  }

  const campColumns = useMemo(() => makeCampColumns(onCampSelect), [onCampSelect]);
  const locations   = useMemo<string[]>(() => [...new Set(camps.map(c => c.location))], [camps]);
  const statuses    = useMemo<string[]>(() => [...new Set(camps.map(c => c.status))],   [camps]);

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
        <button className="ew-btn ew-btn--secondary ew-btn--xsm">엑셀 업로드</button>
        <button className="ew-btn ew-btn--secondary ew-btn--xsm">엑셀 다운로드</button>
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
          rowHeight={96}
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
