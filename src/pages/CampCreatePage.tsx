// 캠프 등록/수정 페이지 — Figma 488:2855
import { useState, useRef } from 'react';
import type { CampTab, Camp } from '../App';
import CampTimetableEdit from './CampTimetableEdit';
import type { TimetableEditHandle } from './CampTimetableEdit';
import CampAccommodationTab, { loadHotels } from './CampAccommodationTab';
import CampStaffTab from './CampStaffTab';
import CampClassTab, { loadClasses } from './CampClassTab';
import type { ClassLevel } from './CampClassTab';
import CampUserBoardPage from './CampUserBoardPage';
import type { Student } from './StudentBoardPage';
import { useDirtyForm } from '../hooks/useDirtyForm';
import StickySaveBar from '../components/StickySaveBar';
import { useDirtyGuard } from '../hooks/useDirtyGuard';

const LOCATIONS = ['나트랑', '다낭', '세부', '발리', '방콕', '싱가포르', '코타키나발루'];
const STATUSES  = ['진행중', '준비중', '종료'];

// 사용자가 직접 편집하는 기본정보 필드
interface UserForm {
  name: string; code: string; location: string;
  capacity: string; status: string;
}

// 탭에서 자동 업데이트되는 필드 (DisabledInput으로 표시되는 영역) — 즉시 저장
interface AutoForm {
  accommodation: string; staff: string;
  start_date: string; end_date: string;
}

const EMPTY_USER: UserForm = {
  name: '', code: '', location: '', capacity: '', status: '',
};


// ── Field wrapper ─────────────────────────────────────────────────────────────
function Field({ label, required, dirty, children }: { label: string; required?: boolean; dirty?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-sub)', fontFamily: 'var(--font-ko)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {dirty && <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-warning)', display: 'inline-block', flexShrink: 0 }} />}
        {label}{required && <span style={{ color: 'var(--color-error)', marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  height: 40, padding: '0 12px', border: '1px solid var(--color-border-default)',
  borderRadius: 6, fontSize: 13, fontFamily: 'var(--font-ko)',
  color: 'var(--color-text-primary)', outline: 'none', background: 'var(--color-canvas)', width: '100%', boxSizing: 'border-box',
};

const disabledStyle: React.CSSProperties = {
  ...inputStyle, background: 'var(--color-bg-subtle)', color: 'var(--color-ink-mute)',
  border: '1px solid var(--color-border-subtle)', cursor: 'not-allowed',
};

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input style={inputStyle} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />;
}

function DisabledInput({ value, placeholder }: { value: string; placeholder?: string }) {
  return <input style={disabledStyle} value={value} placeholder={placeholder} disabled readOnly />;
}

function SelectInput({ value, onChange, placeholder, options }: { value: string; onChange: (v: string) => void; placeholder?: string; options: string[] }) {
  return (
    <select style={{ ...inputStyle, color: value ? 'var(--color-text-primary)' : 'var(--color-ink-mute)', cursor: 'pointer' }}
      value={value} onChange={e => onChange(e.target.value)}>
      <option value="" disabled hidden>{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

const TABS: CampTab[] = ['Students', 'Accommodation', 'Staff', 'Class', 'Timetable'];

// ── Main ─────────────────────────────────────────────────────────────────────
interface Props {
  camps: Camp[];
  editCampId?: string;
  allStudents?: Student[];
  onStudentUpdate?: (s: Student) => void;
  activeTab: CampTab;
  onTabChange: (tab: CampTab) => void;
  onBack: () => void;
  onSave: (camp: Camp) => void;
  agents?: { id: string; name: string }[];
}

export default function CampCreatePage({ camps, editCampId, allStudents = [], onStudentUpdate, activeTab, onTabChange, onBack, onSave, agents = [] }: Props) {
  const isEdit = !!editCampId;
  const existingCamp = editCampId ? camps.find(c => c.id === editCampId) ?? null : null;

  const [draftId] = useState<string>(() => editCampId ?? `CAMP-${Date.now()}`);

  const [classes,                setClasses]                = useState<ClassLevel[]>(() => loadClasses(editCampId ?? ''));
  const [activeTimetableClassId, setActiveTimetableClassId] = useState<string | null>(() => {
    const cls = loadClasses(editCampId ?? '');
    return cls.length > 0 ? cls[0].id : null;
  });
  const timetableEditRef = useRef<TimetableEditHandle>(null);

  const { draft: userForm, setField: setUserField, isDirty, count, isFieldDirty, reset, sync } = useDirtyForm<UserForm>(
    existingCamp ? {
      name:     existingCamp.name     ?? '',
      code:     existingCamp.id       ?? '',
      location: existingCamp.location ?? '',
      capacity: String(existingCamp.capacity ?? ''),
      status:   existingCamp.status   ?? '',
    } : EMPTY_USER
  );

  // 탭에서 즉시 저장으로 들어오는 필드 — dirty 추적 대상 아님
  const [autoForm, setAutoForm] = useState<AutoForm>({
    accommodation: existingCamp?.accommodation     ?? '',
    staff:         (existingCamp?.staff ?? []).join(', '),
    start_date:    existingCamp?.start_date        ?? '',
    end_date:      existingCamp?.end_date          ?? '',
  });

  // 합본 — 화면 표시·저장에 사용
  const form = { ...userForm, ...autoForm };

  // 수정 모드에서 dirty 상태 가드 등록
  const clearGuard = useDirtyGuard('CampCreatePage:edit', isEdit && isDirty);

  function set(field: keyof UserForm | keyof AutoForm) {
    return (v: string) => {
      if (field in userForm) setUserField(field as keyof UserForm, v);
      else setAutoForm(prev => ({ ...prev, [field as keyof AutoForm]: v }));
    };
  }

  function handleSave() {
    if (!userForm.name.trim()) { alert('캠프명을 입력해주세요.'); return; }
    if (!userForm.location)    { alert('지역을 선택해주세요.'); return; }
    if (!userForm.status)      { alert('상태를 선택해주세요.'); return; }
    const hotels = loadHotels(draftId);
    const primaryHotel = hotels.find(h => h.name.trim())?.name ?? autoForm.accommodation;
    const camp: Camp = {
      id:            userForm.code.trim() || draftId,
      name:          userForm.name.trim(),
      location:      userForm.location,
      country:       '',
      accommodation: primaryHotel,
      capacity:      Number(userForm.capacity) || 0,
      status:        userForm.status,
      start_date:    autoForm.start_date || existingCamp?.start_date || '',
      end_date:      autoForm.end_date   || existingCamp?.end_date   || '',
      staff:         autoForm.staff.split(',').map((s: string) => s.trim()).filter(Boolean),
    };
    sync(userForm);
    clearGuard();
    onSave(camp);
  }

  return (
    <div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--page-px)', borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-canvas)' }}>
        <button className="ew-btn ew-btn--ghost ew-btn--sm" onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <img src="/icon/arrow_fill_left.svg" alt="" style={{ width: 14, height: 14 }} />
          캠프 목록
        </button>
        <div style={{ width: 1, height: 20, background: 'var(--color-border-table)' }} />
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-ko)', flex: 1 }}>
          {editCampId ? '캠프 수정' : '캠프 등록'}
        </span>
        {isEdit ? (
          <button className="ew-btn ew-btn--primary ew-btn--sm" onClick={handleSave}>완료</button>
        ) : (
          <>
            <button className="ew-btn ew-btn--ghost ew-btn--sm" onClick={onBack}>취소</button>
            <button className="ew-btn ew-btn--primary ew-btn--sm" onClick={handleSave}>저장</button>
          </>
        )}
      </div>

      <div style={{ padding: '24px 30px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* 기본 정보 */}
        <div style={{ background: 'var(--color-canvas)', border: '1px solid var(--color-border-table)', borderRadius: 8, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-ko)', marginBottom: 4 }}>기본 정보</div>
          <div style={{ display: 'flex', gap: 16 }}>
            <Field label="캠프명" required dirty={isEdit && isFieldDirty('name')}>
              <TextInput value={form.name} onChange={set('name')} placeholder="공식 캠프명을 입력하세요." />
            </Field>
            <Field label="캠프코드" dirty={isEdit && isFieldDirty('code')}>
              <TextInput value={form.code} onChange={set('code')} placeholder="캠프를 구분할 코드를 입력하세요. (ex. N26S)" />
            </Field>
            <Field label="지역" required dirty={isEdit && isFieldDirty('location')}>
              <SelectInput value={form.location} onChange={set('location')} placeholder="캠프지역을 선택해주세요." options={LOCATIONS} />
            </Field>
            <Field label="기간">
              <DisabledInput
                value={form.start_date && form.end_date
                  ? `${form.start_date.slice(2).replace(/-/g, '/')} ~ ${form.end_date.slice(2).replace(/-/g, '/')}`
                  : ''}
                placeholder="시간표 탭에서 자동 입력"
              />
            </Field>
            <Field label="숙소">
              <DisabledInput value={form.accommodation} placeholder="숙박정보 탭에서 자동 입력" />
            </Field>
            <Field label="정원" dirty={isEdit && isFieldDirty('capacity')}>
              <div style={{ position: 'relative' }}>
                <input style={{ ...inputStyle, paddingRight: 32 }} value={form.capacity}
                  onChange={e => set('capacity')(e.target.value.replace(/[^0-9]/g, ''))} placeholder="00" />
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--color-text-sub)', fontFamily: 'var(--font-ko)', pointerEvents: 'none' }}>명</span>
              </div>
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <Field label="스탭">
              <DisabledInput value={form.staff} placeholder="스탭&강사 탭에서 자동 입력" />
            </Field>
            <Field label="상태" required dirty={isEdit && isFieldDirty('status')}>
              <SelectInput value={form.status} onChange={set('status')} placeholder="현재 상태를 선택해주세요." options={STATUSES} />
            </Field>
            <div style={{ flex: 2 }} />
          </div>
        </div>

        {/* 탭 */}
        <div style={{ background: 'var(--color-canvas)', border: '1px solid var(--color-border-table)', borderRadius: 8 }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border-table)' }}>
            {TABS.map(tab => {
              const disabled = tab === 'Timetable' && classes.length === 0;
              return (
                <button key={tab}
                  onClick={() => !disabled && onTabChange(tab)}
                  disabled={disabled}
                  title={disabled ? '클래스를 먼저 추가해주세요' : undefined}
                  style={{
                    padding: '12px 20px', fontSize: 14, fontFamily: 'var(--font-ko)',
                    fontWeight: activeTab === tab ? 600 : 400,
                    color: disabled ? 'var(--color-ink-faint)' : activeTab === tab ? 'var(--color-primary)' : 'var(--color-text-sub)',
                    background: 'none', border: 'none',
                    borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent',
                    cursor: disabled ? 'not-allowed' : 'pointer', marginBottom: -1,
                  }}>
                  {tab}
                </button>
              );
            })}
          </div>

          <div>
            {activeTab === 'Students' && (
              <CampUserBoardPage campId={draftId} students={allStudents} onStudentUpdate={onStudentUpdate} agents={agents} />
            )}

            {activeTab === 'Accommodation' && (
              <CampAccommodationTab
                campId={draftId}
                onHotelsChange={hotels => {
                  const primary = hotels.find(h => h.name.trim())?.name ?? '';
                  if (primary) setAutoForm(prev => ({ ...prev, accommodation: primary }));
                }}
              />
            )}

            {activeTab === 'Staff' && (
              <CampStaffTab
                campId={draftId}
                onStaffChange={staffNames => setAutoForm(prev => ({ ...prev, staff: staffNames.join(', ') }))}
              />
            )}

            {activeTab === 'Class' && (
              <CampClassTab campId={draftId} students={allStudents}
                onClassesChange={updated => {
                  setClasses(updated);
                  if (updated.length > 0 && !updated.find(c => c.id === activeTimetableClassId)) {
                    setActiveTimetableClassId(updated[0].id);
                  }
                }}
              />
            )}

            {activeTab === 'Timetable' && (
              <div>
                {/* Class subtabs */}
                <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--color-border-table)', background: 'var(--color-paper)', padding: '0 16px' }}>
                  {classes.map(cls => (
                    <button
                      key={cls.id}
                      onClick={() => {
                        timetableEditRef.current?.flush();
                        setActiveTimetableClassId(cls.id);
                      }}
                      style={{
                        padding: '8px 16px', fontSize: 13, fontFamily: 'var(--font-ko)',
                        fontWeight: cls.id === activeTimetableClassId ? 600 : 400,
                        color: cls.id === activeTimetableClassId ? 'var(--color-primary)' : 'var(--color-text-sub)',
                        background: 'none', border: 'none',
                        borderBottom: cls.id === activeTimetableClassId ? '2px solid var(--color-primary)' : '2px solid transparent',
                        cursor: 'pointer', marginBottom: -1,
                      }}
                    >
                      {cls.name || '(미입력)'}
                      {cls.teacher && <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 6 }}>{cls.teacher}</span>}
                    </button>
                  ))}
                </div>
                <CampTimetableEdit
                  ref={timetableEditRef}
                  key={activeTimetableClassId}
                  campId={draftId}
                  classId={activeTimetableClassId ?? undefined}
                  startDate={existingCamp?.start_date}
                  endDate={existingCamp?.end_date}
                  onDateRangeChange={(s, e) => setAutoForm(prev => ({ ...prev, start_date: s, end_date: e }))}
                />
              </div>
            )}
          </div>
        </div>
        <div style={{ height: isEdit ? 80 : 0 }} />
      </div>
      <StickySaveBar visible={isEdit && isDirty} count={count} onCancel={reset} onSave={handleSave} />
    </div>
  );
}
