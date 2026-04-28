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

const LOCATIONS = ['나트랑', '다낭', '세부', '발리', '방콕', '싱가포르', '코타키나발루'];
const STATUSES  = ['진행중', '준비중', '종료'];

interface CampForm {
  name: string; code: string; location: string; accommodation: string;
  capacity: string; staff: string; status: string;
  start_date: string; end_date: string;
}

const EMPTY_FORM: CampForm = {
  name: '', code: '', location: '', accommodation: '',
  capacity: '', staff: '', status: '',
  start_date: '', end_date: '',
};


// ── Field wrapper ─────────────────────────────────────────────────────────────
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-sub)', fontFamily: 'var(--font-ko)' }}>
        {label}{required && <span style={{ color: '#EF4444', marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  height: 40, padding: '0 12px', border: '1px solid #D1D5DB',
  borderRadius: 6, fontSize: 13, fontFamily: 'var(--font-ko)',
  color: 'var(--color-text-primary)', outline: 'none', background: '#fff', width: '100%', boxSizing: 'border-box',
};

const disabledStyle: React.CSSProperties = {
  ...inputStyle, background: '#F3F4F6', color: '#9CA3AF',
  border: '1px solid #E5E7EB', cursor: 'not-allowed',
};

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input style={inputStyle} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />;
}

function DisabledInput({ value, placeholder }: { value: string; placeholder?: string }) {
  return <input style={disabledStyle} value={value} placeholder={placeholder} disabled readOnly />;
}

function SelectInput({ value, onChange, placeholder, options }: { value: string; onChange: (v: string) => void; placeholder?: string; options: string[] }) {
  return (
    <select style={{ ...inputStyle, color: value ? 'var(--color-text-primary)' : '#9CA3AF', cursor: 'pointer' }}
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
  const existingCamp = editCampId ? camps.find(c => c.id === editCampId) ?? null : null;

  const [draftId] = useState<string>(() => editCampId ?? `CAMP-${Date.now()}`);

  const [classes,                setClasses]                = useState<ClassLevel[]>(() => loadClasses(editCampId ?? ''));
  const [activeTimetableClassId, setActiveTimetableClassId] = useState<string | null>(() => {
    const cls = loadClasses(editCampId ?? '');
    return cls.length > 0 ? cls[0].id : null;
  });
  const timetableEditRef = useRef<TimetableEditHandle>(null);

  const [form, setForm] = useState<CampForm>(() => existingCamp ? {
    name:          existingCamp.name          ?? '',
    code:          existingCamp.id            ?? '',
    location:      existingCamp.location      ?? '',
    accommodation: existingCamp.accommodation ?? '',
    capacity:      String(existingCamp.capacity ?? ''),
    staff:         (existingCamp.staff ?? []).join(', '),
    status:        existingCamp.status        ?? '',
    start_date:    existingCamp.start_date    ?? '',
    end_date:      existingCamp.end_date      ?? '',
  } : EMPTY_FORM);

  function set(field: keyof CampForm) {
    return (v: string) => setForm(prev => ({ ...prev, [field]: v }));
  }

  function handleSave() {
    if (!form.name.trim()) { alert('캠프명을 입력해주세요.'); return; }
    if (!form.location)    { alert('지역을 선택해주세요.'); return; }
    if (!form.status)      { alert('상태를 선택해주세요.'); return; }
    const hotels = loadHotels(draftId);
    const primaryHotel = hotels.find(h => h.name.trim())?.name ?? form.accommodation;
    const camp: Camp = {
      id:            form.code.trim() || draftId,
      name:          form.name.trim(),
      location:      form.location,
      country:       '',
      accommodation: primaryHotel,
      capacity:      Number(form.capacity) || 0,
      status:        form.status,
      start_date:    form.start_date || existingCamp?.start_date || '',
      end_date:      form.end_date   || existingCamp?.end_date   || '',
      staff:         form.staff.split(',').map((s: string) => s.trim()).filter(Boolean),
    };
    onSave(camp);
  }

  return (
    <div style={{ minWidth: 1440, overflowX: 'auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 30px', borderBottom: '1px solid var(--color-border-table)', background: '#fff' }}>
        <button className="ew-btn ew-btn--ghost ew-btn--sm" onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <img src="/icon/arrow_fill_left.svg" alt="" style={{ width: 14, height: 14 }} />
          캠프 목록
        </button>
        <div style={{ width: 1, height: 20, background: 'var(--color-border-table)' }} />
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-ko)', flex: 1 }}>
          {editCampId ? '캠프 수정' : '캠프 등록'}
        </span>
        <button className="ew-btn ew-btn--ghost ew-btn--sm" onClick={onBack}>취소</button>
        <button className="ew-btn ew-btn--primary ew-btn--sm" onClick={handleSave}>저장</button>
      </div>

      <div style={{ padding: '24px 30px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* 기본 정보 */}
        <div style={{ background: '#fff', border: '1px solid var(--color-border-table)', borderRadius: 8, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-ko)', marginBottom: 4 }}>기본 정보</div>
          <div style={{ display: 'flex', gap: 16 }}>
            <Field label="캠프명" required>
              <TextInput value={form.name} onChange={set('name')} placeholder="공식 캠프명을 입력하세요." />
            </Field>
            <Field label="캠프코드">
              <TextInput value={form.code} onChange={set('code')} placeholder="캠프를 구분할 코드를 입력하세요. (ex. N26S)" />
            </Field>
            <Field label="지역" required>
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
            <Field label="정원">
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
            <Field label="상태" required>
              <SelectInput value={form.status} onChange={set('status')} placeholder="현재 상태를 선택해주세요." options={STATUSES} />
            </Field>
            <div style={{ flex: 2 }} />
          </div>
        </div>

        {/* 탭 */}
        <div style={{ background: '#fff', border: '1px solid var(--color-border-table)', borderRadius: 8 }}>
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
                    color: disabled ? '#C8D0D8' : activeTab === tab ? 'var(--color-primary)' : 'var(--color-text-sub)',
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
                  if (primary) setForm(prev => ({ ...prev, accommodation: primary }));
                }}
              />
            )}

            {activeTab === 'Staff' && (
              <CampStaffTab
                campId={draftId}
                onStaffChange={staffNames => setForm(prev => ({ ...prev, staff: staffNames.join(', ') }))}
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
                <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--color-border-table)', background: '#FAFBFF', padding: '0 16px' }}>
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
                  onDateRangeChange={(s, e) => setForm(prev => ({ ...prev, start_date: s, end_date: e }))}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
