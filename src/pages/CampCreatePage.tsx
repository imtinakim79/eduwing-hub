// 캠프 등록/수정 페이지 — Figma 488:2855
import { useState } from 'react';
import TabCard from '../components/TabCard';
import type { CampTab, Camp } from '../App';
import CampTimetableEdit from './CampTimetableEdit';
import CampAccommodationTab, { HotelCompletedView, loadHotels } from './CampAccommodationTab';
import CampStaffTab, { StaffCompletedView } from './CampStaffTab';
import CampClassTab, { ClassCompletedView, loadClasses } from './CampClassTab';
import type { ClassLevel } from './CampClassTab';
import CampUserBoardPage, { CampUserBoardCompleted } from './CampUserBoardPage';
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

// ── 탭 이탈 경고 모달 ─────────────────────────────────────────────────────────
function LeaveModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: '28px 32px', width: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="9" stroke="#F59E0B" strokeWidth="1.5"/>
            <path d="M10 6v5M10 13.5v.5" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-ko)' }}>저장되지 않은 변경사항</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-text-sub)', fontFamily: 'var(--font-ko)', lineHeight: 1.8, margin: '0 0 24px' }}>
          현재 수정 중인 내용이 저장되지 않습니다.<br />탭을 이동하시겠습니까?
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="ew-btn ew-btn--ghost ew-btn--sm" onClick={onCancel}>취소</button>
          <button className="ew-btn ew-btn--primary ew-btn--sm" onClick={onConfirm}>이동</button>
        </div>
      </div>
    </div>
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

  // draftId: 신규 캠프는 마운트 시 생성, 수정 캠프는 editCampId 사용
  const [draftId] = useState<string>(() => editCampId ?? `CAMP-${Date.now()}`);

  const [classes,                setClasses]                = useState<ClassLevel[]>(() => loadClasses(editCampId ?? ''));
  const [activeTimetableClassId, setActiveTimetableClassId] = useState<string | null>(() => {
    const cls = loadClasses(editCampId ?? '');
    return cls.length > 0 ? cls[0].id : null;
  });

  const [resetKeys, setResetKeys] = useState<Record<CampTab, number>>({
    'Students': 0, 'Accommodation': 0, 'Staff': 0, 'Class': 0, 'Timetable': 0,
  });
  const [tabEditing, setTabEditing] = useState<Record<CampTab, boolean>>({
    'Students': false, 'Accommodation': false, 'Staff': false, 'Class': false, 'Timetable': false,
  });
  // 신규 캠프: 각 탭이 한 번 이상 저장되었는지 추적
  const [tabDone, setTabDone] = useState<Record<CampTab, boolean>>({
    'Students': !!editCampId, 'Accommodation': !!editCampId, 'Staff': !!editCampId, 'Class': !!editCampId, 'Timetable': !!editCampId,
  });
  const [pendingTab,    setPendingTab]    = useState<CampTab | null>(null);
  const [dataSnapshots, setDataSnapshots] = useState<Partial<Record<CampTab, string | null>>>({});

  const DATA_KEY: Partial<Record<CampTab, string>> = {
    'Accommodation': `ew-hotels-${draftId}`,
    'Staff':         `ew-campstaff-${draftId}`,
    'Timetable':     `ew-timetable-${draftId}`,
  };

  function handleTabEditingChange(tab: CampTab, editing: boolean) {
    setTabEditing(prev => ({ ...prev, [tab]: editing }));
    if (editing) {
      const key = DATA_KEY[tab];
      try { setDataSnapshots(prev => ({ ...prev, [tab]: key ? localStorage.getItem(key) : null })); } catch {}
    } else {
      setTabDone(prev => ({ ...prev, [tab]: true }));
      setDataSnapshots(prev => ({ ...prev, [tab]: undefined }));
    }
  }

  function handleTabSwitch(tab: CampTab) {
    if (tab === activeTab) return;
    if (tabEditing[activeTab]) { setPendingTab(tab); return; }
    onTabChange(tab);
  }

  function confirmLeave() {
    if (!pendingTab) return;
    const key = DATA_KEY[activeTab];
    const snap = dataSnapshots[activeTab];
    if (key) {
      try {
        if (snap === undefined || snap === null) localStorage.removeItem(key);
        else localStorage.setItem(key, snap);
      } catch {}
    }
    setResetKeys(prev => ({ ...prev, [activeTab]: prev[activeTab] + 1 }));
    setTabEditing(prev => ({ ...prev, [activeTab]: false }));
    setDataSnapshots(prev => ({ ...prev, [activeTab]: undefined }));
    onTabChange(pendingTab);
    setPendingTab(null);
  }

  function handleReset(tab: CampTab) {
    if (tab === 'Timetable')     try { localStorage.removeItem(`ew-timetable-${draftId}`); } catch {}
    if (tab === 'Accommodation') try { localStorage.removeItem(`ew-hotels-${draftId}`); } catch {}
    if (tab === 'Staff')         try { localStorage.removeItem(`ew-campstaff-${draftId}`); } catch {}
    setResetKeys(prev => ({ ...prev, [tab]: prev[tab] + 1 }));
  }

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

  const doneCount = Object.values(tabDone).filter(Boolean).length;
  const allTabsDone = doneCount === TABS.length;
  const isNew = !editCampId;

  function handleSave() {
    if (!form.name.trim()) { alert('캠프명을 입력해주세요.'); return; }
    if (!form.location)    { alert('지역을 선택해주세요.'); return; }
    if (!form.status)      { alert('상태를 선택해주세요.'); return; }
    if (isNew && !allTabsDone) {
      alert(`모든 탭을 저장한 후 최종 저장해주세요.\n현재 ${doneCount}/${TABS.length} 탭 완료`);
      return;
    }
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
      {pendingTab && <LeaveModal onConfirm={confirmLeave} onCancel={() => setPendingTab(null)} />}

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
        {isNew && (
          <span style={{ fontSize: 12, color: allTabsDone ? 'var(--color-success)' : 'var(--color-text-muted)', fontFamily: 'var(--font-ko)' }}>
            {doneCount}/${TABS.length} 탭 완료
          </span>
        )}
        <button className="ew-btn ew-btn--ghost ew-btn--sm" onClick={onBack}>취소</button>
        <button
          className="ew-btn ew-btn--primary ew-btn--sm"
          onClick={handleSave}
          style={{ opacity: isNew && !allTabsDone ? 0.5 : 1 }}
        >
          저장
        </button>
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
                <button key={tab} onClick={() => !disabled && handleTabSwitch(tab)}
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
                  {isNew && !disabled && tabDone[tab] && (
                    <span style={{ marginLeft: 6, display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: 'var(--color-success)', verticalAlign: 'middle' }} />
                  )}
                </button>
              );
            })}
          </div>

          <div>
            {activeTab === 'Students' && (
              <TabCard tab="Students" campId={draftId} onReset={() => handleReset('Students')}
                completedView={<CampUserBoardCompleted campId={draftId} students={allStudents} agents={agents} />}
                onEditingChange={e => handleTabEditingChange('Students', e)}
              >
                <CampUserBoardPage key={resetKeys['Students']} campId={draftId} students={allStudents} onStudentUpdate={onStudentUpdate} />
              </TabCard>
            )}

            {activeTab === 'Accommodation' && (
              <TabCard tab="Accommodation" campId={draftId} onReset={() => handleReset('Accommodation')}
                completedView={<HotelCompletedView campId={draftId} />}
                onEditingChange={e => handleTabEditingChange('Accommodation', e)}
              >
                <CampAccommodationTab
                  key={resetKeys['Accommodation']}
                  campId={draftId}
                  onHotelsChange={hotels => {
                    const primary = hotels.find(h => h.name.trim())?.name ?? '';
                    if (primary) setForm(prev => ({ ...prev, accommodation: primary }));
                  }}
                />
              </TabCard>
            )}

            {activeTab === 'Staff' && (
              <TabCard tab="Staff" campId={draftId} onReset={() => handleReset('Staff')}
                completedView={<StaffCompletedView campId={draftId} />}
                onEditingChange={e => handleTabEditingChange('Staff', e)}
              >
                <CampStaffTab key={resetKeys['Staff']} campId={draftId}
                  onStaffChange={(staffNames) => {
                    setForm(prev => ({ ...prev, staff: staffNames.join(', ') }));
                  }}
                />
              </TabCard>
            )}

            {activeTab === 'Class' && (
              <TabCard tab="Class" campId={draftId} onReset={() => handleReset('Class')}
                completedView={<ClassCompletedView campId={draftId} />}
                onEditingChange={e => handleTabEditingChange('Class', e)}
              >
                <CampClassTab key={resetKeys['Class']} campId={draftId} students={allStudents}
                  onClassesChange={updated => {
                    setClasses(updated);
                    if (updated.length > 0 && !updated.find(c => c.id === activeTimetableClassId)) {
                      setActiveTimetableClassId(updated[0].id);
                    }
                  }}
                />
              </TabCard>
            )}

            {activeTab === 'Timetable' && (
              <div>
                {/* Class subtabs */}
                <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--color-border-table)', background: '#FAFBFF', padding: '0 16px' }}>
                  {classes.map(cls => (
                    <button
                      key={cls.id}
                      onClick={() => {
                        setActiveTimetableClassId(cls.id);
                        setResetKeys(prev => ({ ...prev, 'Timetable': prev['Timetable'] + 1 }));
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
                <TabCard tab="Timetable" campId={draftId} onReset={() => handleReset('Timetable')}
                  onEditingChange={e => handleTabEditingChange('Timetable', e)}
                >
                  <CampTimetableEdit
                    key={`${resetKeys['Timetable']}-${activeTimetableClassId}`}
                    campId={draftId}
                    classId={activeTimetableClassId ?? undefined}
                    startDate={existingCamp?.start_date}
                    endDate={existingCamp?.end_date}
                    onDateRangeChange={(s, e) => setForm(prev => ({ ...prev, start_date: s, end_date: e }))}
                  />
                </TabCard>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
