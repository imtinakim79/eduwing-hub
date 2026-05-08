import { useState, useCallback, useEffect, useRef } from 'react';
import type { ColumnDef } from './types';
import {
  HeadlineCell, TextCell, CalendarCell, DropdownCell,
  GenderCell, TagsCell, ThumbnailCell, isoToDisplay,
  MultiDropdownCell, CalendarRangeCell,
} from './cells';

interface BoardTableProps<T extends { id: string }> {
  data: T[];
  columns: ColumnDef<T>[];
  allData?: T[];
  selected: Set<string>;
  onSelectedChange: (s: Set<string>) => void;
  sortKey: string | null;
  sortDir: 'asc' | 'desc';
  onSort: (key: string) => void;
  localEdits: Record<string, Record<string, string>>;
  onEdit: (rowId: string, field: string, value: string) => void;
  rowHeight?: number;
  emptyMessage?: string;
  onRowClick?: (rowId: string) => void;
  /** localStorage 저장 키 접두사. 미지정 시 너비 저장 안 함 */
  tableId?: string;
  /** tbody 최상단에 삽입되는 고정 행 (신규 행 추가 등) */
  newRow?: React.ReactNode;
}

export default function BoardTable<T extends { id: string }>({
  data,
  columns,
  allData,
  selected,
  onSelectedChange,
  sortKey,
  sortDir,
  onSort,
  localEdits,
  onEdit,
  rowHeight,
  emptyMessage = '검색 결과가 없습니다.',
  onRowClick,
  tableId,
  newRow,
}: BoardTableProps<T>) {
  const [openCell,   setOpenCell]   = useState<string | null>(null);
  const [activeCell, setActiveCell] = useState<string | null>(null);

  // popup이 닫히면 cell 선택 강조도 같이 해제 (외부 클릭/ESC 모두 이 경로로)
  useEffect(() => {
    if (openCell === null) setActiveCell(null);
  }, [openCell]);

  // ── Column resize ──────────────────────────────────────────────────────────
  const colWidthsRef = useRef<Record<string, number>>({});
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    if (!tableId) return {};
    try {
      const saved = JSON.parse(localStorage.getItem(`ew-col-widths-${tableId}`) ?? '{}') as Record<string, number>;
      colWidthsRef.current = saved;
      return saved;
    } catch { return {}; }
  });

  function resolvedWidth(col: ColumnDef<T>): number {
    return colWidths[col.key] ?? col.width ?? col.minWidth ?? 100;
  }

  function startResize(colKey: string, baseWidth: number, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = colWidthsRef.current[colKey] ?? baseWidth;

    function onMove(ev: MouseEvent) {
      const newW = Math.max(40, startW + ev.clientX - startX);
      colWidthsRef.current = { ...colWidthsRef.current, [colKey]: newW };
      setColWidths({ ...colWidthsRef.current });
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (tableId) {
        try { localStorage.setItem(`ew-col-widths-${tableId}`, JSON.stringify(colWidthsRef.current)); } catch {}
      }
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }
  // ──────────────────────────────────────────────────────────────────────────

  const rows = allData ?? data;

  function handleCellClick(rowId: string, colKey: string) {
    setActiveCell(`${rowId}:${colKey}`);
    setOpenCell(null);
  }

  function tdCls(rowId: string, colKey: string, extra?: string) {
    const sel = activeCell === `${rowId}:${colKey}` ? 'ew-cell--selected' : '';
    return [sel, extra].filter(Boolean).join(' ') || undefined;
  }

  const allChecked = data.length > 0 && data.every(r => selected.has(r.id));

  function toggleAll(checked: boolean) {
    onSelectedChange(checked ? new Set(data.map(r => r.id)) : new Set());
  }

  function toggleRow(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    onSelectedChange(next);
  }

  const getEdits = useCallback(
    (rowId: string) => localEdits[rowId] ?? {},
    [localEdits],
  );

  const totalWidth = columns.reduce((s, c) => s + resolvedWidth(c), 56);

  return (
    <div
      style={{ overflowX: 'auto' }}
      onClick={() => { setOpenCell(null); setActiveCell(null); }}
    >
      <table className="ew-table" style={{ tableLayout: 'fixed', width: '100%', minWidth: totalWidth }}>
        <colgroup>
          <col style={{ width: 56 }} />
          {columns.map(col => (
            <col key={col.key} style={{ width: resolvedWidth(col) }} />
          ))}
        </colgroup>

        {/* Header */}
        <thead>
          <tr>
            <th style={{ padding: 0, textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 40 }}>
                <input
                  type="checkbox"
                  className="ew-checkbox"
                  checked={allChecked}
                  onChange={e => toggleAll(e.target.checked)}
                />
              </div>
            </th>
            {columns.map(col => (
              <th key={col.key} style={{ padding: 0, position: 'relative' }}>
                <HeadlineCell
                  label={col.label}
                  sortKey={col.sortKey}
                  activeSortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                />
                {/* Resize handle */}
                <div
                  style={{
                    position: 'absolute', right: 0, top: 0, bottom: 0, width: 5,
                    cursor: 'col-resize', zIndex: 1, userSelect: 'none',
                  }}
                  onMouseDown={e => startResize(col.key, col.width ?? col.minWidth ?? 100, e)}
                />
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {newRow}
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 1} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map(row => {
              const edits = getEdits(row.id);
              const isRowSel = selected.has(row.id);

              return (
                <tr key={row.id} className={isRowSel ? 'row-selected' : ''} style={rowHeight ? { height: rowHeight } : undefined}>
                  {/* Checkbox */}
                  <td style={{ textAlign: 'center', padding: '0 12px', ...(rowHeight ? { height: rowHeight } : {}) }} onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="ew-checkbox"
                      checked={isRowSel}
                      onChange={() => toggleRow(row.id)}
                    />
                  </td>

                  {/* Data cells */}
                  {columns.map(col => {
                    const cellId  = `${row.id}:${col.key}`;
                    const value   = col.getValue(row, edits);
                    const isAct   = activeCell === cellId;

                    function save(v: string) {
                      if (!col.setValue) return;
                      const { field, value: val } = col.setValue(row, v);
                      onEdit(row.id, field, val);
                      setActiveCell(null);
                    }

                    const options: string[] = col.options
                      ? (typeof col.options === 'function' ? col.options(rows as T[]) : col.options)
                      : [];

                    switch (col.type) {
                      case 'custom':
                        return (
                          <td key={col.key} className={tdCls(row.id, col.key)} style={{ padding: '0 12px', overflow: 'hidden', ...col.tdStyle }}>
                            {col.render?.({
                              row, value, cellId,
                              isActive: isAct,
                              openCell, setOpenCell,
                              onCellClick: () => handleCellClick(row.id, col.key),
                              onSave: save,
                            })}
                          </td>
                        );

                      case 'thumbnail':
                        return (
                          <td
                            key={col.key} className="ew-cell--thumbnail"
                            style={{ padding: '0 12px', cursor: onRowClick ? 'pointer' : 'default', overflow: 'hidden' }}
                            onClick={onRowClick ? e => { e.stopPropagation(); onRowClick(row.id); } : undefined}
                          >
                            <ThumbnailCell nameKo={(row as any).name_ko} nameEn={(row as any).name_en} profileImgUrl={(row as any).profile_img_url} />
                          </td>
                        );

                      case 'gender':
                        return (
                          <td key={col.key} className={tdCls(row.id, col.key, 'ew-cell--interactive')} style={{ padding: '0 12px' }}>
                            <GenderCell
                              value={value} cellId={cellId}
                              openCell={openCell} setOpenCell={setOpenCell}
                              onChange={v => save(v)}
                              onCellClick={() => handleCellClick(row.id, col.key)}
                              onEditDone={() => setActiveCell(null)}
                            />
                          </td>
                        );

                      case 'dropdown':
                        return (
                          <td key={col.key} className={tdCls(row.id, col.key, 'ew-cell--interactive')} style={{ padding: '0 12px' }}>
                            <DropdownCell
                              value={value} options={options} cellId={cellId}
                              openCell={openCell} setOpenCell={setOpenCell}
                              onChange={v => save(v)}
                              onCellClick={() => handleCellClick(row.id, col.key)}
                              onEditDone={() => setActiveCell(null)}
                            />
                          </td>
                        );

                      case 'calendar':
                        return (
                          <td key={col.key} className={tdCls(row.id, col.key, 'ew-cell--interactive')} style={{ padding: '0 12px' }}>
                            <CalendarCell
                              dateISO={value} displayDate={isoToDisplay(value)}
                              cellId={cellId}
                              openCell={openCell} setOpenCell={setOpenCell}
                              onDateChange={iso => save(iso)}
                              onCellClick={() => handleCellClick(row.id, col.key)}
                              onEditDone={() => setActiveCell(null)}
                            />
                          </td>
                        );

                      case 'tags':
                        return (
                          <td key={col.key}
                            style={{ padding: '8px 12px', whiteSpace: 'normal', verticalAlign: 'middle', height: 'auto', overflow: 'hidden' }}
                            onClick={e => e.stopPropagation()}
                          >
                            <TagsCell values={value ? value.split(',').filter(Boolean) : []} />
                          </td>
                        );

                      case 'multiDropdown':
                        return (
                          <td key={col.key} className={tdCls(row.id, col.key, 'ew-cell--interactive')} style={{ padding: '0 12px' }}>
                            <MultiDropdownCell
                              values={value ? value.split(',').filter(Boolean) : []}
                              options={options}
                              cellId={cellId}
                              openCell={openCell} setOpenCell={setOpenCell}
                              onChange={vals => save(vals.join(','))}
                              onCellClick={() => handleCellClick(row.id, col.key)}
                            />
                          </td>
                        );

                      case 'calendarRange':
                        return (
                          <td key={col.key} className={tdCls(row.id, col.key, 'ew-cell--interactive')} style={{ padding: '0 12px' }}>
                            <CalendarRangeCell
                              value={value}
                              cellId={cellId}
                              openCell={openCell} setOpenCell={setOpenCell}
                              onSave={save}
                              onCellClick={() => handleCellClick(row.id, col.key)}
                            />
                          </td>
                        );

                      case 'readonly':
                        return (
                          <td key={col.key} style={{ padding: '0 12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={value || undefined}>
                            {value || <span style={{ color: 'var(--color-text-muted)' }}>-</span>}
                          </td>
                        );

                      case 'text':
                      default:
                        return (
                          <td key={col.key}
                            className={tdCls(row.id, col.key)}
                            onClick={e => { e.stopPropagation(); handleCellClick(row.id, col.key); }}
                          >
                            <TextCell value={value} isActive={isAct} onSave={save} />
                          </td>
                        );
                    }
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
