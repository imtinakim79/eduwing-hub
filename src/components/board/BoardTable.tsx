import { useState, useCallback } from 'react';
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
  /** 행 선택 관련 */
  selected: Set<string>;
  onSelectedChange: (s: Set<string>) => void;
  /** 정렬 */
  sortKey: string | null;
  sortDir: 'asc' | 'desc';
  onSort: (key: string) => void;
  /** 로컬 편집 상태 */
  localEdits: Record<string, Record<string, string>>;
  onEdit: (rowId: string, field: string, value: string) => void;
  /** 행 높이 (기본 48px) */
  rowHeight?: number;
  /** 빈 결과 메시지 */
  emptyMessage?: string;
  /** 썸네일 셀 클릭 시 호출 */
  onRowClick?: (rowId: string) => void;
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
}: BoardTableProps<T>) {
  const [openCell,   setOpenCell]   = useState<string | null>(null);
  const [activeCell, setActiveCell] = useState<string | null>(null);

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

  return (
    <div
      style={{ overflowX: 'auto' }}
      onClick={() => { setOpenCell(null); setActiveCell(null); }}
    >
      <table className="ew-table" style={{ minWidth: columns.reduce((s, c) => s + (c.width ?? c.minWidth ?? 100), 39) }}>
        <colgroup>
          <col style={{ width: 39 }} />
          {columns.map(col => (
            <col key={col.key} style={col.width ? { width: col.width } : { minWidth: col.minWidth ?? 100 }} />
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
              <th key={col.key} style={{ padding: 0 }}>
                <HeadlineCell
                  label={col.label}
                  sortKey={col.sortKey}
                  activeSortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                />
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody>
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

                    // resolve options
                    const options: string[] = col.options
                      ? (typeof col.options === 'function' ? col.options(rows as T[]) : col.options)
                      : [];

                    switch (col.type) {
                      case 'custom':
                        return (
                          <td key={col.key} className={tdCls(row.id, col.key)} style={{ padding: '0 12px', ...col.tdStyle }}>
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
                            style={{ padding: '0 12px', cursor: onRowClick ? 'pointer' : 'default' }}
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
                            style={{ padding: '8px 12px', whiteSpace: 'normal', verticalAlign: 'middle', height: 'auto' }}
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
                          <td key={col.key} style={{ padding: '0 12px' }}>
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
