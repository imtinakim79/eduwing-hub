import { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import BoardTable from '../components/board/BoardTable';
import Pagination from '../components/Pagination';
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

export interface Agent {
  id: string;
  name: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
}

const agentColumns: ColumnDef<Agent>[] = [
  {
    key: 'name', label: '에이전트명', width: 180, sortKey: 'name', type: 'text',
    getValue: (r, e) => e['name'] ?? r.name,
    setValue: (_, v) => ({ field: 'name', value: v }),
  },
  {
    key: 'contact_name', label: '담당자', width: 140, sortKey: 'contact_name', type: 'text',
    getValue: (r, e) => e['contact_name'] ?? r.contact_name,
    setValue: (_, v) => ({ field: 'contact_name', value: v }),
  },
  {
    key: 'contact_phone', label: '연락처', width: 160, type: 'text',
    getValue: (r, e) => e['contact_phone'] ?? r.contact_phone,
    setValue: (_, v) => ({ field: 'contact_phone', value: v }),
  },
  {
    key: 'contact_email', label: 'Email', width: 220, type: 'text',
    getValue: (r, e) => e['contact_email'] ?? r.contact_email,
    setValue: (_, v) => ({ field: 'contact_email', value: v }),
  },
];

function agentsToRows(list: Agent[]) {
  return list.map(a => ({
    'ID':     a.id,
    '에이전시명': a.name,
    '담당자':  a.contact_name,
    '연락처':  a.contact_phone,
    'Email':  a.contact_email,
  }));
}

function rowsToAgents(rows: Record<string, string>[]): Agent[] {
  const toStr = (v: unknown) => (v == null ? '' : String(v).trim());
  return rows
    .filter(r => toStr(r['에이전시명']))
    .map(r => ({
      id:            toStr(r['ID']) || `AGT-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name:          toStr(r['에이전시명']),
      contact_name:  toStr(r['담당자']),
      contact_phone: toStr(r['연락처']),
      contact_email: toStr(r['Email']),
    }));
}

function applyEditsToAgent(a: Agent, edits: Record<string, string>): Agent {
  const result = { ...a };
  for (const [field, value] of Object.entries(edits)) {
    switch (field) {
      case 'name':          result.name          = value; break;
      case 'contact_name':  result.contact_name  = value; break;
      case 'contact_phone': result.contact_phone = value; break;
      case 'contact_email': result.contact_email = value; break;
    }
  }
  return result;
}

export default function AgentBoardPage({
  agents = [],
  onAgentAdd,
  onAgentUpdate,
  onAgentDelete,
  onAgentsImport,
}: {
  agents?: Agent[];
  onAgentAdd?: (agent: Agent) => void;
  onAgentUpdate?: (agent: Agent) => void;
  onAgentDelete?: (ids: string[]) => void;
  onAgentsImport?: (imported: Agent[]) => void;
}) {
  const { showUndo } = useUndoToast();
  const [query,      setQuery]      = useState('');
  const [selected,   setSelected]   = useState<Set<string>>(new Set());
  const [page,       setPage]       = useState(1);
  const [perPage,    setPerPage]    = useState(10);
  const [sortKey,    setSortKey]    = useState<string | null>(null);
  const [sortDir,    setSortDir]    = useState<'asc' | 'desc'>('asc');
  const [localEdits, setLocalEdits] = useState<Record<string, Record<string, string>>>({});
  const uploadRef = useRef<HTMLInputElement>(null);

  function handleDownload() {
    const ws = XLSX.utils.json_to_sheet(agentsToRows(agents));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '에이전시목록');
    XLSX.writeFile(wb, '에이전시목록.xlsx');
  }

  function handleUploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = ev => {
      const data = new Uint8Array(ev.target!.result as ArrayBuffer);
      const wb   = XLSX.read(data, { type: 'array' });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { raw: false });
      const imported = rowsToAgents(rows);
      if (imported.length > 0) onAgentsImport?.(imported);
    };
    reader.readAsArrayBuffer(file);
  }

  function handleAdd() {
    const newAgent: Agent = {
      id: `AGT-${Date.now()}`,
      name: '',
      contact_name: '',
      contact_phone: '',
      contact_email: '',
    };
    onAgentAdd?.(newAgent);
  }

  function handleDelete() {
    onAgentDelete?.(Array.from(selected));
    setSelected(new Set());
  }

  function handleEdit(rowId: string, field: string, value: string) {
    const prevAgent = agents.find(a => a.id === rowId);
    const prevEdits = localEdits[rowId];
    const merged = { ...(localEdits[rowId] ?? {}), [field]: value };
    setLocalEdits(p => ({ ...p, [rowId]: merged }));
    if (prevAgent) {
      onAgentUpdate?.(applyEditsToAgent(prevAgent, merged));
      showUndo({
        message: `'${prevAgent.name || '에이전트'}' 변경됨`,
        onUndo: () => {
          onAgentUpdate?.(prevAgent);
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

  const filtered = useMemo(() => {
    let list = [...agents];
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.contact_name.toLowerCase().includes(q) ||
        a.contact_email.toLowerCase().includes(q)
      );
    }
    if (sortKey) {
      list.sort((a, b) => {
        const va = sortKey === 'name' ? a.name : sortKey === 'contact_name' ? a.contact_name : '';
        const vb = sortKey === 'name' ? b.name : sortKey === 'contact_name' ? b.contact_name : '';
        return (sortDir === 'asc' ? 1 : -1) * va.localeCompare(vb);
      });
    }
    return list;
  }, [agents, query, sortKey, sortDir]);

  const pageData = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div style={{ minWidth: 1440, overflowX: 'auto' }}>

      {/* Filter Bar */}
      <div className="ew-filter-bar">
        <h1 className="ew-filter-bar__title">에이전트 관리</h1>
        <div className="ew-filter-bar__group">
          <div className="ew-filter-input-wrap" style={{ width: 320 }}>
            <span className="search-icon"><SearchIcon /></span>
            <input type="text" placeholder="에이전트명·담당자·Email 검색" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} />
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', padding: 'var(--space-2) var(--page-px)', borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-canvas)', justifyContent: 'flex-end', minWidth: 1440 }}>
        <span style={{ flex: 1, fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-ko)', lineHeight: '26px' }}>
          {selected.size > 0 ? `${selected.size}개 선택됨` : ''}
        </span>
        <button className="ew-btn ew-btn--primary ew-btn--xsm" onClick={handleAdd}>에이전트 추가</button>
        {selected.size > 0 && (
          <button className="ew-btn ew-btn--danger ew-btn--xsm" onClick={handleDelete}>삭제</button>
        )}
        <input ref={uploadRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleUploadFile} />
        <button className="ew-btn ew-btn--secondary ew-btn--xsm" onClick={() => uploadRef.current?.click()}>엑셀 업로드</button>
        <button className="ew-btn ew-btn--secondary ew-btn--xsm" onClick={handleDownload}>엑셀 다운로드</button>
      </div>

      {/* Table */}
      <div className="ew-board" style={{ borderRadius: 0, border: 'none', borderTop: '1px solid var(--color-border-table)' }}>
        <BoardTable
          data={pageData}
          allData={agents}
          columns={agentColumns}
          selected={selected}
          onSelectedChange={setSelected}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={toggleSort}
          localEdits={localEdits}
          onEdit={handleEdit}
          tableId="agents"
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
