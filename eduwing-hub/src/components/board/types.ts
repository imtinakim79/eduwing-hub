import type { CSSProperties } from 'react';

export type CellType =
  | 'checkbox'
  | 'thumbnail'
  | 'camp-thumbnail'
  | 'text'
  | 'dropdown'
  | 'calendar'
  | 'gender'
  | 'tags'
  | 'parents'
  | 'readonly'
  | 'multiDropdown'
  | 'calendarRange'
  | 'custom';

export interface CellRenderProps<T> {
  row: T;
  value: string;
  cellId: string;
  isActive: boolean;
  openCell: string | null;
  setOpenCell: (id: string | null) => void;
  onCellClick: () => void;
  onSave: (v: string) => void;
}

export interface ColumnDef<T = any> {
  key: string;
  label: string;
  width?: number;
  minWidth?: number;
  sortKey?: string;
  type: CellType;
  /** dropdown 선택지 — 배열 또는 전체 데이터 기반 동적 생성 */
  options?: string[] | ((allRows: T[]) => string[]);
  /** 편집값 우선 적용한 표시값 반환 */
  getValue: (row: T, edits: Record<string, string>) => string;
  /** 저장할 field key + value 반환 (편집 불가 셀은 생략) */
  setValue?: (row: T, value: string) => { field: string; value: string };
  /** td 스타일 오버라이드 */
  tdStyle?: CSSProperties;
  /** 커스텀 렌더러 — type: 'custom' 일 때 사용 */
  render?: (props: CellRenderProps<T>) => React.ReactNode;
}
