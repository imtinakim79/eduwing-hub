// 스탭 탭
// 전체 명단: localStorage ew-master-staff (모든 캠프 공유) — 즉시 저장
// 캠프별 배정: localStorage ew-campstaff-{campId} — 명시적 저장 (dirty 추적)
import { useState, useRef, useEffect } from 'react';
import { useDirtyForm } from '../hooks/useDirtyForm';

export interface Member { id: string; name: string; }

const MASTER_STAFF_KEY = 'ew-master-staff';

function uid() { return Math.random().toString(36).slice(2, 9); }

export function loadMaster(key: string): Member[] {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : []; }
  catch { return []; }
}
function saveMaster(key: string, list: Member[]) {
  try { localStorage.setItem(key, JSON.stringify(list)); } catch {}
}

export interface CampStaffData { staffIds: string[]; }

export function loadCampStaff(campId: string): CampStaffData {
  try { const r = localStorage.getItem(`ew-campstaff-${campId}`); return r ? JSON.parse(r) : { staffIds: [] }; }
  catch { return { staffIds: [] }; }
}
function saveCampStaff(campId: string, data: CampStaffData) {
  try { localStorage.setItem(`ew-campstaff-${campId}`, JSON.stringify(data)); } catch {}
}

// ── Tag chip ──────────────────────────────────────────────────────────────────
function Chip({ name, onRemove }: { name: string; onRemove: () => void }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 16, background: '#EEF3FD', color: '#2F6FED', fontSize: 13, fontFamily: 'var(--font-ko)', fontWeight: 500 }}>
      {name}
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 13, padding: 0, lineHeight: 1, display: 'flex', alignItems: 'center' }}>✕</button>
    </span>
  );
}

// ── Member panel ──────────────────────────────────────────────────────────────
function MemberPanel({
  masterList, setMasterList,
  assignedIds, setAssignedIds,
  isNewlyAdded,
}: {
  masterList: Member[];
  setMasterList: (list: Member[]) => void;
  assignedIds: string[];
  setAssignedIds: (ids: string[]) => void;
  isNewlyAdded: (id: string) => boolean;
}) {
  const [open,    setOpen]    = useState(false);
  const [newName, setNewName] = useState('');
  const inputRef  = useRef<HTMLInputElement>(null);
  const panelRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const assigned   = masterList.filter(m => assignedIds.includes(m.id));
  const unassigned = masterList.filter(m => !assignedIds.includes(m.id));

  function assign(id: string) {
    setAssignedIds([...assignedIds, id]);
    setOpen(false);
  }

  function unassign(id: string) {
    setAssignedIds(assignedIds.filter(x => x !== id));
    // 이번 세션에 새로 추가한 멤버라면 전체 명단에서도 함께 제거
    if (isNewlyAdded(id)) {
      setMasterList(masterList.filter(m => m.id !== id));
    }
  }

  function addToMaster() {
    const name = newName.trim();
    if (!name) return;
    const m: Member = { id: uid(), name };
    const updated = [...masterList, m];
    setMasterList(updated);
    setAssignedIds([...assignedIds, m.id]);
    setNewName('');
    setOpen(false);
  }

  function deleteFromMaster(id: string) {
    const updated = masterList.filter(m => m.id !== id);
    setMasterList(updated);
    setAssignedIds(assignedIds.filter(x => x !== id));
  }

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-ko)', marginBottom: 14 }}>스탭</div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, minHeight: 40, marginBottom: 12, alignContent: 'flex-start' }}>
        {assigned.length === 0
          ? <span style={{ fontSize: 13, color: '#D1D5DB', fontFamily: 'var(--font-ko)' }}>배정된 스탭 없음</span>
          : assigned.map(m => <Chip key={m.id} name={m.name} onRemove={() => unassign(m.id)} />)
        }
      </div>

      <div ref={panelRef} style={{ position: 'relative', display: 'inline-block' }}>
        <button
          className="ew-btn ew-btn--ghost ew-btn--xsm"
          onClick={() => { setOpen(v => !v); setTimeout(() => inputRef.current?.focus(), 60); }}
        >
          + 스탭 추가
        </button>

        {open && (
          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 200, background: '#fff', border: '1px solid var(--color-border-table)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 220, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderBottom: '1px solid #F3F4F6' }}>
              <input
                ref={inputRef}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addToMaster(); if (e.key === 'Escape') setOpen(false); }}
                placeholder="이름 입력 후 Enter"
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, fontFamily: 'var(--font-ko)' }}
              />
              <button className="ew-btn ew-btn--primary ew-btn--xsm" onClick={addToMaster}>추가</button>
            </div>

            {unassigned.length > 0 ? (
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {unassigned.map(m => (
                  <div
                    key={m.id}
                    style={{ display: 'flex', alignItems: 'center', padding: '7px 10px', gap: 6 }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span
                      onClick={() => assign(m.id)}
                      style={{ flex: 1, fontSize: 13, fontFamily: 'var(--font-ko)', color: 'var(--color-text-primary)', cursor: 'pointer' }}
                    >
                      {m.name}
                    </span>
                    <button
                      onClick={() => deleteFromMaster(m.id)}
                      title="전체 명단에서 삭제"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB', fontSize: 13, padding: '0 2px', lineHeight: 1 }}
                    >✕</button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-ko)' }}>
                {masterList.length === 0 ? '전체 명단이 비어있습니다.' : '모두 배정됨'}
              </div>
            )}
          </div>
        )}
      </div>

      {masterList.length > 0 && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px dashed #E5E7EB' }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-ko)', marginBottom: 8, letterSpacing: '0.02em' }}>
            전체 명단 (다른 캠프와 공유됨)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {masterList.map(m => (
              <span
                key={m.id}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 8px', borderRadius: 4, fontSize: 12, fontFamily: 'var(--font-ko)',
                  background: assignedIds.includes(m.id) ? '#EEF3FD' : '#F3F4F6',
                  color: assignedIds.includes(m.id) ? '#2F6FED' : 'var(--color-text-sub)',
                  border: `1px solid ${assignedIds.includes(m.id) ? '#BFDBFE' : '#E5E7EB'}`,
                }}
              >
                {m.name}
                <button
                  onClick={() => deleteFromMaster(m.id)}
                  title="전체 명단에서 삭제"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB', fontSize: 11, padding: 0, lineHeight: 1 }}
                >✕</button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Completed read-only view ──────────────────────────────────────────────────
export function StaffCompletedView({ campId }: { campId: string }) {
  const { staffIds } = loadCampStaff(campId);
  const staffMaster  = loadMaster(MASTER_STAFF_KEY);
  const assignedStaff = staffMaster.filter(m => staffIds.includes(m.id));

  if (!assignedStaff.length) return (
    <div style={{ padding: '20px 24px' }}>
      <span style={{ fontSize: 13, color: '#D1D5DB', fontFamily: 'var(--font-ko)' }}>없음</span>
    </div>
  );

  return (
    <div style={{ padding: '20px 24px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {assignedStaff.map(m => (
        <span key={m.id} style={{
          padding: '4px 12px', borderRadius: 16, fontSize: 13, fontFamily: 'var(--font-ko)', fontWeight: 500,
          background: '#EEF3FD', color: '#2F6FED',
        }}>
          {m.name}
        </span>
      ))}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function CampStaffTab({ campId, onStaffChange }: {
  campId?: string;
  onStaffChange?: (staffNames: string[]) => void;
}) {
  // master(전체 명단)와 캠프별 배정 둘 다 dirty 추적 — [저장] 시점에만 영속화
  type StaffForm = { master: Member[]; staffIds: string[] };

  // 진입 시 master 스냅샷 (이번 세션에 추가한 멤버 식별용)
  const initialMasterRef = useRef<Member[]>(loadMaster(MASTER_STAFF_KEY));

  const form = useDirtyForm<StaffForm>({
    master: initialMasterRef.current,
    staffIds: campId ? loadCampStaff(campId).staffIds : [],
  });
  const staffMaster = form.draft.master;
  const setStaffMaster = (list: Member[]) => form.setDraft(prev => ({ ...prev, master: list }));
  const assignment = { staffIds: form.draft.staffIds };
  const setStaffIds = (ids: string[]) => form.setDraft(prev => ({ ...prev, staffIds: ids }));

  // campId 변경 시 sync — master는 fresh load (다른 캠프에서 master 변경됐을 수 있음)
  useEffect(() => {
    const masterNow = loadMaster(MASTER_STAFF_KEY);
    initialMasterRef.current = masterNow;
    form.sync({
      master: masterNow,
      staffIds: campId ? loadCampStaff(campId).staffIds : [],
    });
  }, [campId]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSave() {
    saveMaster(MASTER_STAFF_KEY, staffMaster);
    if (campId) saveCampStaff(campId, { staffIds: assignment.staffIds });
    const names = staffMaster.filter(m => assignment.staffIds.includes(m.id)).map(m => m.name);
    onStaffChange?.(names);
    initialMasterRef.current = staffMaster;
    form.sync({ master: staffMaster, staffIds: assignment.staffIds });
  }
  function handleReset() {
    // 캠프 배정만 비움. 전체 명단은 그대로 유지.
    form.setDraft(prev => ({ ...prev, staffIds: [] }));
  }

  // 이번 세션에 새로 추가된 멤버인지 (chip X 누를 때 master에서도 제거할지 판단)
  const isNewlyAdded = (id: string) => !initialMasterRef.current.some(m => m.id === id);

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* 헤더: 배정 영역의 dirty/액션만 다룸 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1D23', fontFamily: 'var(--font-ko)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {form.isDirty && <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-warning)', display: 'inline-block', flexShrink: 0 }} />}
          스탭 배정
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleReset} style={{ height: 34, padding: '0 14px', border: '1px solid #E2E5EA', borderRadius: 6, background: '#fff', fontSize: 13, fontWeight: 500, color: '#6B7280', cursor: 'pointer', fontFamily: 'var(--font-ko)' }}>초기화</button>
          {form.isDirty && (
            <button onClick={form.reset} style={{ height: 34, padding: '0 14px', border: '1px solid #E2E5EA', borderRadius: 6, background: '#fff', fontSize: 13, fontWeight: 500, color: '#6B7280', cursor: 'pointer', fontFamily: 'var(--font-ko)' }}>취소</button>
          )}
          <button
            onClick={handleSave}
            disabled={!form.isDirty}
            style={{
              height: 34, padding: '0 14px', border: 'none', borderRadius: 6,
              background: form.isDirty ? '#3C82F5' : '#E5E7EB',
              fontSize: 13, fontWeight: 500,
              color: form.isDirty ? '#fff' : '#9CA3AF',
              cursor: form.isDirty ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--font-ko)',
            }}
          >저장</button>
        </div>
      </div>
      <div style={{ height: 1, background: '#E2E5EA', marginBottom: 14 }} />

      <MemberPanel
        masterList={staffMaster} setMasterList={setStaffMaster}
        assignedIds={assignment.staffIds} setAssignedIds={setStaffIds}
        isNewlyAdded={isNewlyAdded}
      />
    </div>
  );
}
