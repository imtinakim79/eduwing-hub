// 클래스(등급) 탭 — 캠프별 클래스 관리
// 저장: localStorage ew-classes-{campId}
import { useEffect, useState } from 'react';
import { useDirtyForm } from '../hooks/useDirtyForm';
import { useDirtyGuard } from '../hooks/useDirtyGuard';
import type { Student } from './StudentBoardPage';

export interface ClassLevel {
  id: string;
  name: string;
  teacher: string;
  studentIds: string[];
}

function uid() { return Math.random().toString(36).slice(2, 9); }

export function loadClasses(campId: string): ClassLevel[] {
  try { const r = localStorage.getItem(`ew-classes-${campId}`); return r ? JSON.parse(r) : []; }
  catch { return []; }
}

export function saveClasses(campId: string, classes: ClassLevel[]) {
  try { localStorage.setItem(`ew-classes-${campId}`, JSON.stringify(classes)); } catch {}
}

// ── Completed (readonly) view ─────────────────────────────────────────────────
export function ClassCompletedView({ campId }: { campId: string }) {
  const classes = loadClasses(campId);
  if (classes.length === 0) {
    return (
      <div style={{ padding: '16px 24px', fontSize: 13, color: 'var(--color-text-muted)', fontFamily: 'var(--font-ko)' }}>
        등록된 클래스 없음
      </div>
    );
  }
  return (
    <div style={{ padding: '12px 24px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {classes.map(c => (
        <div key={c.id} style={{ background: '#F0F4FF', borderRadius: 8, padding: '6px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)', fontFamily: 'var(--font-ko)' }}>{c.name}</span>
          {c.teacher && <span style={{ fontSize: 11, color: 'var(--color-text-sub)', fontFamily: 'var(--font-ko)' }}>담당: {c.teacher}</span>}
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-ko)' }}>학생 {c.studentIds.length}명</span>
        </div>
      ))}
    </div>
  );
}

// ── Input helpers ─────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  height: 36, padding: '0 10px', border: '1px solid var(--color-border-default)',
  borderRadius: 6, fontSize: 13, fontFamily: 'var(--font-ko)',
  color: 'var(--color-text-primary)', outline: 'none', background: 'var(--color-canvas)',
  width: '100%', boxSizing: 'border-box',
};

// ── Student row for assignment ────────────────────────────────────────────────
function StudentRow({
  student, checked, onChange,
}: { student: Student; checked: boolean; onChange: (v: boolean) => void }) {
  const name = student.name_ko || student.name_en || '-';
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', cursor: 'pointer', borderBottom: '1px solid var(--color-border-faint)' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--color-primary)' }} />
      <span style={{ fontSize: 13, fontFamily: 'var(--font-ko)', color: 'var(--color-text-primary)' }}>{name}</span>
      {student.name_en && student.name_ko && (
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-en)' }}>{student.name_en}</span>
      )}
    </label>
  );
}

// ── Class card (left list) ────────────────────────────────────────────────────
function ClassCard({
  cls, selected, onClick,
}: { cls: ClassLevel; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', textAlign: 'left', background: selected ? 'var(--color-primary-bg)' : '#fff',
      border: `1px solid ${selected ? 'var(--color-primary)' : 'var(--color-border-subtle)'}`,
      borderRadius: 8, padding: '10px 14px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: selected ? 'var(--color-primary)' : 'var(--color-text-primary)', fontFamily: 'var(--font-ko)' }}>
        {cls.name || '(미입력)'}
      </span>
      <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-ko)' }}>
        {cls.teacher && <span>담당: {cls.teacher}</span>}
        <span>학생 {cls.studentIds.length}명</span>
      </div>
    </button>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function CampClassTab({
  campId,
  students = [],
  onClassesChange,
}: {
  campId: string;
  students?: Student[];
  onClassesChange?: (classes: ClassLevel[]) => void;
}) {
  type ClassesForm = { classes: ClassLevel[] };
  const form = useDirtyForm<ClassesForm>({ classes: loadClasses(campId) });
  const classes = form.draft.classes;
  const setClasses = (next: ClassLevel[]) => form.setDraft({ classes: next });

  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const loaded = loadClasses(campId);
    return loaded.length > 0 ? loaded[0].id : null;
  });

  const enrolledStudents = students.filter(s =>
    s.camp_records?.some(r => r.camp_id === campId)
  );

  // campId 변경 시 sync
  useEffect(() => {
    const loaded = loadClasses(campId);
    form.sync({ classes: loaded });
    setSelectedId(loaded.length > 0 ? loaded[0].id : null);
  }, [campId]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearGuard = useDirtyGuard('CampClassTab', form.isDirty);

  function handleSave() {
    saveClasses(campId, classes);
    onClassesChange?.(classes);
    form.sync({ classes });
    clearGuard();
  }
  function handleReset() {
    form.setDraft({ classes: [] });
    setSelectedId(null);
  }

  function update(next: ClassLevel[]) {
    setClasses(next);
  }

  function addClass() {
    const newCls: ClassLevel = { id: uid(), name: '', teacher: '', studentIds: [] };
    const next = [...classes, newCls];
    update(next);
    setSelectedId(newCls.id);
  }

  function deleteClass(id: string) {
    const next = classes.filter(c => c.id !== id);
    update(next);
    if (selectedId === id) setSelectedId(next.length > 0 ? next[0].id : null);
  }

  function patchSelected(patch: Partial<ClassLevel>) {
    if (!selectedId) return;
    update(classes.map(c => c.id === selectedId ? { ...c, ...patch } : c));
  }

  const selected = classes.find(c => c.id === selectedId) ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--color-border-table)' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink-strong)', fontFamily: 'var(--font-ko)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {form.isDirty && <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-warning)', display: 'inline-block', flexShrink: 0 }} />}
          클래스 관리
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleReset} style={{ height: 34, padding: '0 14px', border: '1px solid var(--color-border-subtle)', borderRadius: 6, background: 'var(--color-canvas)', fontSize: 13, fontWeight: 500, color: 'var(--color-ink-soft)', cursor: 'pointer', fontFamily: 'var(--font-ko)' }}>초기화</button>
          {form.isDirty && (
            <button onClick={form.reset} style={{ height: 34, padding: '0 14px', border: '1px solid var(--color-border-subtle)', borderRadius: 6, background: 'var(--color-canvas)', fontSize: 13, fontWeight: 500, color: 'var(--color-ink-soft)', cursor: 'pointer', fontFamily: 'var(--font-ko)' }}>취소</button>
          )}
          <button
            onClick={handleSave}
            disabled={!form.isDirty}
            style={{
              height: 34, padding: '0 14px', border: 'none', borderRadius: 6,
              background: form.isDirty ? 'var(--color-primary)' : 'var(--color-border-subtle)',
              fontSize: 13, fontWeight: 500,
              color: form.isDirty ? '#fff' : 'var(--color-ink-mute)',
              cursor: form.isDirty ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--font-ko)',
            }}
          >저장</button>
        </div>
      </div>

    <div style={{ display: 'flex', minHeight: 400 }}>
      {/* Left: class list */}
      <div style={{ width: 220, borderRight: '1px solid var(--color-border-table)', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
        <button
          className="ew-btn ew-btn--primary ew-btn--sm"
          onClick={addClass}
          style={{ width: '100%', marginBottom: 4 }}
        >
          + 클래스 추가
        </button>
        {classes.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', fontFamily: 'var(--font-ko)', textAlign: 'center', marginTop: 16 }}>
            클래스를 추가하세요
          </div>
        )}
        {classes.map(cls => (
          <ClassCard key={cls.id} cls={cls} selected={cls.id === selectedId} onClick={() => setSelectedId(cls.id)} />
        ))}
      </div>

      {/* Right: detail panel */}
      {selected ? (
        <div style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-ko)', flex: 1 }}>
              클래스 상세
            </span>
            <button
              className="ew-btn ew-btn--ghost ew-btn--sm"
              style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}
              onClick={() => deleteClass(selected.id)}
            >
              삭제
            </button>
          </div>

          {/* Class name & teacher */}
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-sub)', fontFamily: 'var(--font-ko)' }}>
                클래스명 <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <input
                style={inputStyle}
                value={selected.name}
                onChange={e => patchSelected({ name: e.target.value })}
                placeholder="예: Beginner, Intermediate, Class A"
              />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-sub)', fontFamily: 'var(--font-ko)' }}>
                담당 강사
              </label>
              <input
                style={inputStyle}
                value={selected.teacher}
                onChange={e => patchSelected({ teacher: e.target.value })}
                placeholder="강사명 입력"
              />
            </div>
          </div>

          {/* Student assignment */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-ko)', flex: 1 }}>
                학생 배정
              </span>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-ko)' }}>
                {selected.studentIds.length} / {enrolledStudents.length}명
              </span>
            </div>
            {enrolledStudents.length === 0 ? (
              <div style={{ padding: '12px 0', fontSize: 13, color: 'var(--color-text-muted)', fontFamily: 'var(--font-ko)' }}>
                이 캠프에 등록된 학생이 없습니다
              </div>
            ) : (
              <div style={{ border: '1px solid var(--color-border-subtle)', borderRadius: 8, padding: '8px 12px', maxHeight: 260, overflowY: 'auto' }}>
                {enrolledStudents.map(s => (
                  <StudentRow
                    key={s.id}
                    student={s}
                    checked={selected.studentIds.includes(s.id)}
                    onChange={checked => {
                      const next = checked
                        ? [...selected.studentIds, s.id]
                        : selected.studentIds.filter(id => id !== s.id);
                      patchSelected({ studentIds: next });
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 14, fontFamily: 'var(--font-ko)' }}>
          왼쪽에서 클래스를 선택하거나 추가하세요
        </div>
      )}
    </div>
    </div>
  );
}
