import { useState, useMemo } from 'react';
import BoardTable from '../components/board/BoardTable';
import Pagination from '../components/Pagination';
import type { ColumnDef } from '../components/board/types';

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
}: {
  agents?: Agent[];
  onAgentAdd?: (agent: Agent) => void;
  onAgentUpdate?: (agent: Agent) => void;
  onAgentDelete?: (ids: string[]) => void;
}) {
  const [query,      setQuery]      = useState('');
  const [selected,   setSelected]   = useState<Set<string>>(new Set());
  const [page,       setPage]       = useState(1);
  const [perPage,    setPerPage]    = useState(10);
  const [sortKey,    setSortKey]    = useState<string | null>(null);
  const [sortDir,    setSortDir]    = useState<'asc' | 'desc'>('asc');
  const [localEdits, setLocalEdits] = useState<Record<string, Record<string, string>>>({});

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
    const merged = { ...(localEdits[rowId] ?? {}), [field]: value };
    setLocalEdits(p => ({ ...p, [rowId]: merged }));
    const agent = agents.find(a => a.id === rowId);
    if (agent) onAgentUpdate?.(applyEditsToAgent(agent, merged));
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
        <div style={{ fontFamily: 'var(--font-ko)', fontWeight: 500, fontSize: 20, letterSpacing: '-0.8px', color: 'var(--color-text-medium)', width: 174, flexShrink: 0, textAlign: 'center' }}>에이전트 관리</div>
        <div className="ew-filter-input-wrap" style={{ width: 255 }}>
          <span className="search-icon"><SearchIcon /></span>
          <input type="text" placeholder="에이전트명, 담당자, Email" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} />
        </div>
        <button className="ew-btn ew-btn--primary ew-btn--lg" style={{ fontFamily: 'var(--font-en)', fontWeight: 600 }}>Search</button>
      </div>

      {/* Action bar */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 30px', border: '1px solid #E5E7EB', background: '#fff', justifyContent: 'flex-end', minWidth: 1440 }}>
        <span style={{ flex: 1, fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-ko)', lineHeight: '26px' }}>
          {selected.size > 0 ? `${selected.size}개 선택됨` : ''}
        </span>
        <button className="ew-btn ew-btn--primary ew-btn--xsm" onClick={handleAdd}>에이전트 추가</button>
        {selected.size > 0 && (
          <button className="ew-btn ew-btn--danger ew-btn--xsm" onClick={handleDelete}>삭제</button>
        )}
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
