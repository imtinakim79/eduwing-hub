// 피그마 node 529:3962 기반 Pagination 컴포넌트

interface PaginationProps {
  total: number;
  page: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (n: number) => void;
}

export default function Pagination({ total, page, perPage, onPageChange, onPerPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  // Build visible page numbers
  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        height: 52,
        borderTop: '1px solid var(--color-border-light)',
        background: '#fff',
      }}
    >
      {/* Rows per page */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-ko)' }}>
          페이지당 행 수:
        </span>
        <select
          value={perPage}
          onChange={(e) => { onPerPageChange(Number(e.target.value)); onPageChange(1); }}
          style={{
            height: 30, padding: '0 6px 0 10px', borderRadius: 6,
            border: '1px solid var(--color-border-light)',
            fontSize: 13, fontWeight: 500, color: 'var(--color-text-dark)',
            background: '#fff', cursor: 'pointer', outline: 'none',
          }}
        >
          {[10, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>10 · 50 · 100</span>
      </div>

      {/* Page nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-ko)', marginRight: 4 }}>
          {start}-{end} / 총 {total}명
        </span>
        <div style={{ width: 1, height: 18, background: 'var(--color-border-light)' }} />

        <button
          className="ew-page-btn"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          style={{ border: 'none', background: 'transparent', padding: 0 }}
        >
          <img src="/icon/arrow_fill_left.svg" alt="prev" style={{ width: 16, height: 16 }} />
        </button>

        {pages.map((p, i) =>
          p === '...'
            ? <button key={`dots-${i}`} className="ew-page-btn dots" style={{ border: 'none' }}>···</button>
            : (
              <button
                key={p}
                className={`ew-page-btn${page === p ? ' active' : ''}`}
                onClick={() => onPageChange(p as number)}
              >
                {p}
              </button>
            )
        )}

        <button
          className="ew-page-btn"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          style={{ border: 'none', background: 'transparent', padding: 0 }}
        >
          <img src="/icon/arrow_fill_right.svg" alt="next" style={{ width: 16, height: 16 }} />
        </button>
      </div>
    </div>
  );
}
