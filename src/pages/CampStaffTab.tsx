// 스탭 탭
// 전체 명단: localStorage ew-master-staff (모든 캠프 공유) — 즉시 저장
// 캠프별 배정: localStorage ew-campstaff-{campId} — 명시적 저장 (dirty 추적)
import { useState, useRef, useEffect } from 'react';
import { useDirtyForm } from '../hooks/useDirtyForm';
import { useDirtyGuard } from '../hooks/useDirtyGuard';

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
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 16, background: 'var(--color-primary-bg)', color: 'var(--color-primary)', fontSize: 'var(--text-base)', fontFamily: 'var(--font-ko)', fontWeight: 500 }}>
      {name}
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-ink-mute)', fontSize: 'var(--text-base)', padding: 0, lineHeight: 1, display: 'flex', alignItems: 'center' }}>✕</button>
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
  const inputRef = useRef<HTMLInputElement>(null);

  const assigned   = masterList.filter(m => assignedIds.includes(m.id));
  const unassigned = masterList.filter(m => !assignedIds.includes(m.id));

  function assign(id: string) {
    setAssignedIds([...assignedIds, id]);
  }

  function unassign(id: string) {
    setAssignedIds(assignedIds.filter(x => x !== id));
    if (isNewlyAdded(id)) {
      setMasterList(masterList.filter(m => m.id !== id));
    }
  }

  function addToMaster() {
    const name = newName.trim();
    if (!name) return;
    const m: Member = { id: uid(), name };
    setMasterList([...masterList, m]);
    setAssignedIds([...assignedIds, m.id]);
    setNewName('');
    inputRef.current?.focus();
  }

  function deleteFromMaster(id: string) {
    setMasterList(masterList.filter(m => m.id !== id));
    setAssignedIds(assignedIds.filter(x => x !== id));
  }

  function handleOpen() {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 30);
  }

  function handleClose() {
    setOpen(false);
    setNewName('');
  }

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-ko)', marginBottom: 14 }}>스탭</div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, minHeight: 40, marginBottom: 12, alignContent: 'flex-start' }}>
        {assigned.length === 0
          ? <span style={{ fontSize: 'var(--text-base)', color: 'var(--color-border-default)', fontFamily: 'var(--font-ko)' }}>배정된 스탭 없음</span>
          : assigned.map(m => <Chip key={m.id} name={m.name} onRemove={() => unassign(m.id)} />)
        }
      </div>

      {!open ? (
        <button className="ew-btn ew-btn--ghost ew-btn--xsm" onClick={handleOpen}>
          + 스탭 추가
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* 이름 입력 행 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              ref={inputRef}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addToMaster(); if (e.key === 'Escape') handleClose(); }}
              placeholder="이름 입력 후 Enter"
              style={{
                width: 180, height: 34,
                border: '1px solid var(--color-border-subtle)', borderRadius: 6,
                outline: 'none', padding: '0 10px',
                fontSize: 'var(--text-base)', fontFamily: 'var(--font-ko)',
                color: 'var(--color-ink-strong)', background: 'var(--color-canvas)',
              }}
            />
            <button className="ew-btn ew-btn--primary ew-btn--xsm" onClick={addToMaster}>추가</button>
            <button className="ew-btn ew-btn--ghost ew-btn--xsm" onClick={handleClose}>취소</button>
          </div>
          {/* 기존 명단에서 선택 */}
          {unassigned.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 4 }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-faint)', fontFamily: 'var(--font-ko)', alignSelf: 'center', whiteSpace: 'nowrap' }}>기존 명단:</span>
              {unassigned.map(m => (
                <button
                  key={m.id}
                  onClick={() => assign(m.id)}
                  style={{
                    height: 26, padding: '0 10px', borderRadius: 100,
                    border: '1px solid var(--color-border-subtle)',
                    background: 'var(--color-canvas)',
                    fontSize: 'var(--text-xs)', fontFamily: 'var(--font-ko)',
                    color: 'var(--color-ink-soft)', cursor: 'pointer',
                  }}
                >
                  {m.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {masterList.length > 0 && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px dashed var(--color-border-subtle)' }}>
          <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-ko)', marginBottom: 8, letterSpacing: '0.02em' }}>
            전체 명단 (다른 캠프와 공유됨)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {masterList.map(m => (
              <span
                key={m.id}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 8px', borderRadius: 4, fontSize: 'var(--text-sm)', fontFamily: 'var(--font-ko)',
                  background: assignedIds.includes(m.id) ? 'var(--color-primary-bg)' : 'var(--color-bg-subtle)',
                  color: assignedIds.includes(m.id) ? 'var(--color-primary)' : 'var(--color-text-sub)',
                  border: `1px solid ${assignedIds.includes(m.id) ? '#BFDBFE' : 'var(--color-border-subtle)'}`,
                }}
              >
                {m.name}
                <button
                  onClick={() => deleteFromMaster(m.id)}
                  title="전체 명단에서 삭제"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-border-default)', fontSize: 'var(--text-2xs)', padding: 0, lineHeight: 1 }}
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
      <span style={{ fontSize: 'var(--text-base)', color: 'var(--color-border-default)', fontFamily: 'var(--font-ko)' }}>없음</span>
    </div>
  );

  return (
    <div style={{ padding: '20px 24px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {assignedStaff.map(m => (
        <span key={m.id} style={{
          padding: '4px 12px', borderRadius: 16, fontSize: 'var(--text-base)', fontFamily: 'var(--font-ko)', fontWeight: 500,
          background: 'var(--color-primary-bg)', color: 'var(--color-primary)',
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

  const clearGuard = useDirtyGuard('CampStaffTab', form.isDirty);

  function handleSave() {
    saveMaster(MASTER_STAFF_KEY, staffMaster);
    if (campId) saveCampStaff(campId, { staffIds: assignment.staffIds });
    const names = staffMaster.filter(m => assignment.staffIds.includes(m.id)).map(m => m.name);
    onStaffChange?.(names);
    initialMasterRef.current = staffMaster;
    form.sync({ master: staffMaster, staffIds: assignment.staffIds });
    clearGuard();
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
        <span style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--color-ink-strong)', fontFamily: 'var(--font-ko)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {form.isDirty && <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-warning)', display: 'inline-block', flexShrink: 0 }} />}
          스탭 배정
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleReset} style={{ height: 34, padding: '0 14px', border: '1px solid var(--color-border-subtle)', borderRadius: 6, background: 'var(--color-canvas)', fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--color-ink-soft)', cursor: 'pointer', fontFamily: 'var(--font-ko)' }}>초기화</button>
          {form.isDirty && (
            <button onClick={form.reset} style={{ height: 34, padding: '0 14px', border: '1px solid var(--color-border-subtle)', borderRadius: 6, background: 'var(--color-canvas)', fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--color-ink-soft)', cursor: 'pointer', fontFamily: 'var(--font-ko)' }}>취소</button>
          )}
          <button
            onClick={handleSave}
            disabled={!form.isDirty}
            style={{
              height: 34, padding: '0 14px', border: 'none', borderRadius: 6,
              background: form.isDirty ? 'var(--color-primary)' : 'var(--color-border-subtle)',
              fontSize: 'var(--text-base)', fontWeight: 500,
              color: form.isDirty ? '#fff' : 'var(--color-ink-mute)',
              cursor: form.isDirty ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--font-ko)',
            }}
          >저장</button>
        </div>
      </div>
      <div style={{ height: 1, background: 'var(--color-border-subtle)', marginBottom: 14 }} />

      <MemberPanel
        masterList={staffMaster} setMasterList={setStaffMaster}
        assignedIds={assignment.staffIds} setAssignedIds={setStaffIds}
        isNewlyAdded={isNewlyAdded}
      />
    </div>
  );
}
