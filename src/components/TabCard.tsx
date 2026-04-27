// 탭 내용 래퍼 — 저장/초기화/수정 버튼 상단 배치, 저장 완료 일시 flash
// done 상태: localStorage ew-tab-status-{campId} → Record<tab, boolean>
// isDone=true 시 children unmount → 수정 클릭 시 remount + localStorage 복원
import { useState, useEffect, useRef } from 'react';
import type { CampTab } from '../App';

function loadStatus(campId?: string): Record<string, boolean> {
  if (!campId) return {};
  try { const r = localStorage.getItem(`ew-tab-status-${campId}`); return r ? JSON.parse(r) : {}; }
  catch { return {}; }
}
function saveStatus(campId: string, status: Record<string, boolean>) {
  try { localStorage.setItem(`ew-tab-status-${campId}`, JSON.stringify(status)); } catch {}
}

// ── 탭 바에서 완료 상태 뱃지 표시용 hook ────────────────────────────────────
export function useTabStatus(campId?: string) {
  const [status] = useState(() => loadStatus(campId));
  return (tab: CampTab) => status[tab] === true;
}

// ── TabCard ──────────────────────────────────────────────────────────────────
interface TabCardProps {
  tab: CampTab;
  campId?: string;
  onReset: () => void;
  children: React.ReactNode;
  completedView?: React.ReactNode;
  onEditingChange?: (editing: boolean) => void;
}

export default function TabCard({ tab, campId, onReset, children, completedView, onEditingChange }: TabCardProps) {
  const [status,     setStatus]     = useState(() => loadStatus(campId));
  const [savedFlash, setSavedFlash] = useState(false);
  const isDone = status[tab] === true;

  // 마운트 시 편집 상태 부모에 알림
  const cbRef = useRef(onEditingChange);
  cbRef.current = onEditingChange;
  useEffect(() => { cbRef.current?.(!isDone); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function markDone() {
    const next = { ...status, [tab]: true };
    setStatus(next);
    if (campId) saveStatus(campId, next);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
    onEditingChange?.(false);
  }

  function markEditing() {
    const next = { ...status, [tab]: false };
    setStatus(next);
    if (campId) saveStatus(campId, next);
    onEditingChange?.(true);
  }

  function handleReset() {
    onReset();
    markEditing();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* 상단 버튼 바 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px', borderBottom: '1px solid var(--color-border-table)', background: '#FAFBFF', minHeight: 44 }}>
        {savedFlash && (
          <span style={{ fontSize: 12, color: '#16A34A', fontFamily: 'var(--font-ko)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="7" fill="#16A34A"/>
              <path d="M4 7l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            저장 완료
          </span>
        )}
        <div style={{ flex: 1 }} />
        {isDone ? (
          <button className="ew-btn ew-btn--ghost ew-btn--xsm" onClick={markEditing}>수정</button>
        ) : (
          <>
            <button className="ew-btn ew-btn--ghost ew-btn--sm" onClick={handleReset}>초기화</button>
            <button className="ew-btn ew-btn--primary ew-btn--sm" onClick={markDone}>저장</button>
          </>
        )}
      </div>

      {/* 완료 상태: completedView 있으면 해당 뷰, 없으면 기본 메시지 (children unmount) */}
      {isDone && (
        completedView != null ? completedView : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '28px 24px', fontFamily: 'var(--font-ko)' }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="8.25" stroke="#16A34A" strokeWidth="1.5"/>
              <path d="M5.5 9l2.5 2.5 5-5" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: 13, color: '#16A34A', fontWeight: 600 }}>작성이 완료되었습니다.</span>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>수정하려면 우측 상단 [수정] 버튼을 클릭하세요.</span>
          </div>
        )
      )}

      {/* 편집 상태: children 렌더 (isDone=false 시에만 mount) */}
      {!isDone && <div>{children}</div>}
    </div>
  );
}
