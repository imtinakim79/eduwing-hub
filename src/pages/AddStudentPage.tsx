// 학생 추가/수정 페이지 — Figma node 329:1983
import { useState, useRef } from 'react';
import {
  CalendarCell, DropdownCell, isoToDisplay,
} from '../components/board/cells';
import type { Student } from './StudentBoardPage';
import type { Agent } from './AgentBoardPage';

const GENDER_OPTIONS   = ['Male', 'Female', 'Other', 'Prefer not to say'];
const RELATION_OPTIONS = ['아빠', '엄마', '기타'];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function relLabelToKo(r: string): string {
  if (r === 'Father' || r === '아빠') return '아빠';
  if (r === 'Mother' || r === '엄마') return '엄마';
  return '';
}

// ── 공통 스타일 ────────────────────────────────────────────────────────────────
const FIELD_H   = 48;
const LABEL_W   = 180;
const DIVIDER   = '1px solid #E0E4EB';
const CELL_BORDER: React.CSSProperties = {
  borderBottom: '1px solid #E2E5EA',
  borderRight:  '1px solid #E2E5EA',
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height: 28, display: 'flex', alignItems: 'flex-end', marginBottom: 12 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#22262E', fontFamily: 'var(--font-ko)' }}>
        {children}
      </span>
    </div>
  );
}

function FieldRow({ label, height = FIELD_H, children }: {
  label: React.ReactNode; height?: number; children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', minHeight: height, alignItems: 'stretch' }}>
      <div style={{ width: LABEL_W, flexShrink: 0, display: 'flex', alignItems: 'center', paddingRight: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#6B7280', fontFamily: 'var(--font-ko)', whiteSpace: 'nowrap' }}>
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

function TextFieldCell({ placeholder, value, onChange, type = 'text', disabled, error }: {
  placeholder: string; value: string;
  onChange?: (v: string) => void;
  type?: string; disabled?: boolean; error?: boolean;
}) {
  return (
    <div style={{
      flex: 1, background: disabled ? '#F3F4F6' : '#fff',
      borderBottom: error ? '2px solid #EF4444' : '1px solid #E2E5EA',
      borderRight: '1px solid #E2E5EA',
    }}>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={e => onChange?.(e.target.value)}
        style={{
          width: '100%', height: FIELD_H, border: 'none', outline: 'none',
          background: 'transparent', fontSize: 13, fontFamily: 'var(--font-ko)',
          color: disabled ? '#9CA3AF' : 'var(--color-text-primary)',
          padding: '0 16px', boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

function CellWrapper({ children, height = FIELD_H }: {
  children: React.ReactNode; height?: number;
}) {
  return (
    <div style={{
      flex: 1, height, padding: '0 12px',
      display: 'flex', alignItems: 'center',
      overflow: 'hidden', ...CELL_BORDER, background: '#fff',
    }}>
      {children}
    </div>
  );
}


function DisabledDateCell({ iso }: { iso: string }) {
  return (
    <div style={{ flex: 1, height: FIELD_H, ...CELL_BORDER, background: '#F3F4F6', display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px' }}>
      <img src="/icon/Calendar.svg" alt="" style={{ width: 14, height: 14, flexShrink: 0, opacity: 0.5 }} />
      <span style={{ fontSize: 13, color: '#9CA3AF', fontFamily: 'var(--font-en)' }}>
        {iso || 'YYYY-MM-DD'}
      </span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AddStudentPage({ onBack, onSave, editStudent, agents = [] }: {
  onBack: () => void;
  onSave: (student: Student) => void;
  editStudent?: Student;
  agents?: Agent[];
}) {
  const isEdit = !!editStudent;
  const [openCell,    setOpenCell]   = useState<string | null>(null);
  const [nameError,   setNameError]  = useState(false);
  const [nameEnError, setNameEnError] = useState(false);
  const [profileImg,  setProfileImg] = useState<string | null>(editStudent?.profile_img_url ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const joinedDate = editStudent?.history.joined_date ?? todayISO();

  // Determine initial guardian_relation value for the dropdown
  const initRelation = editStudent
    ? (relLabelToKo(editStudent.guardian.relation) || '기타')
    : '';
  const initRelationCustom = editStudent && !relLabelToKo(editStudent.guardian.relation)
    ? editStudent.guardian.relation
    : '';
  const [form, setForm] = useState({
    name_ko:  editStudent?.name_ko  ?? '',
    name_en:  editStudent?.name_en  ?? '',
    gender:   editStudent?.gender   ?? '',
    age:      editStudent?.age      ? String(editStudent.age) : '',
    birth_date: editStudent?.birth_date ?? '',
    guardian_name:           editStudent?.guardian.name    ?? '',
    guardian_relation:       initRelation,
    guardian_relation_custom: initRelationCustom,
    contact: editStudent?.guardian.contact ?? '',
    email:   editStudent?.guardian.email   ?? '',
    agent_id: editStudent?.history.agent_id ?? '',
  });

  function set(field: string, value: string) {
    setForm(p => ({ ...p, [field]: value }));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Use FileReader so the URL persists even after the input changes
    const reader = new FileReader();
    reader.onload = ev => setProfileImg(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleSave() {
    const koOk = !!form.name_ko.trim();
    const enOk = !!form.name_en.trim();
    if (!koOk) setNameError(true);
    if (!enOk) setNameEnError(true);
    if (!koOk || !enOk) return;
    const relationValue = form.guardian_relation === '기타' && form.guardian_relation_custom
      ? form.guardian_relation_custom
      : form.guardian_relation;
    const student: Student = {
      id:              editStudent?.id ?? `STU-${Date.now()}`,
      profile_img_url: profileImg,
      name_ko:         form.name_ko.trim(),
      name_en:         form.name_en,
      gender:          (form.gender as Student['gender']) || 'Male',
      birth_date:      form.birth_date,
      age:             form.age ? parseInt(form.age, 10) : 0,
      guardian: {
        name:     form.guardian_name,
        relation: relationValue,
        contact:  form.contact,
        email:    form.email,
      },
      history: {
        joined_date:     joinedDate,
        agent_id:        form.agent_id,
        current_camp_id: editStudent?.history.current_camp_id ?? '',
      },
      camp_records: editStudent?.camp_records ?? [],
    };
    onSave(student);
  }

  return (
    <div style={{ background: '#F3F4F7', minHeight: 'calc(100vh - 66px)', overflowX: 'auto' }}>

      {/* Page Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        height: 52, padding: '0 40px',
        background: '#fff', border: '1px solid #E0E4EB',
        overflow: 'hidden', minWidth: 1360,
      }}>
        <button
          onClick={onBack}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
            fontSize: 13, color: 'var(--color-text-muted)', fontFamily: 'var(--font-ko)',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-primary)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)'; }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {isEdit ? '학생 상세로 돌아가기' : '학생 목록으로 돌아가기'}
        </button>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 5 }}>
          <button
            className="ew-btn ew-btn--secondary ew-btn--sm"
            style={{ width: 80, height: 32, fontSize: 12 }}
            onClick={onBack}
          >
            취소
          </button>
          <button
            className="ew-btn ew-btn--primary ew-btn--sm"
            style={{ width: 80, height: 32, fontSize: 12 }}
            onClick={handleSave}
          >
            저장
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '32px 40px', minWidth: 1360 }}>
        <div style={{ background: '#fff', border: '1px solid #E0E4EB', borderRadius: 8, padding: 28 }}>

          {/* ── 프로필 사진 ── */}
          <FieldRow label="프로필 사진" height={100}>
            <div style={{
              flex: 1, height: 100,
              background: '#F8F9FB', border: '1px solid #E0E4EB', borderRadius: 6,
              display: 'flex', alignItems: 'center', gap: 20, padding: '0 16px',
            }}>
              {profileImg ? (
                <img src={profileImg} alt="profile" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: '#E0E4EB', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="4" stroke="#9CA3AF" strokeWidth="1.5"/>
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#B7BECA', fontFamily: 'var(--font-ko)' }}>
                  JPG, PNG 형식 지원 · 최대 5MB, 가로/세로 100px 권장
                </span>
                <button
                  style={{
                    width: 100, height: 32, fontSize: 12, fontWeight: 600,
                    color: '#3B82F6', border: '1px solid #3B82F6',
                    borderRadius: 6, background: '#fff', cursor: 'pointer',
                    fontFamily: 'var(--font-ko)',
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  사진 업로드
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
              </div>
            </div>
          </FieldRow>

          <div style={{ height: 16 }} />
          <div style={{ height: 1, background: DIVIDER }} />
          <div style={{ height: 16 }} />

          {/* ── 기본 정보 ── */}
          <SectionTitle>기본 정보</SectionTitle>

          <FieldRow label={<>이름(한글) <span style={{ color: '#EF4444', marginLeft: 2 }}>*</span></>}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <TextFieldCell
                placeholder="이름을 입력하세요."
                value={form.name_ko}
                error={nameError}
                onChange={v => { set('name_ko', v); if (v.trim()) setNameError(false); }}
              />
              {nameError && (
                <span style={{ fontSize: 11, color: '#EF4444', padding: '3px 16px', fontFamily: 'var(--font-ko)' }}>
                  이름을 입력해주세요.
                </span>
              )}
            </div>
          </FieldRow>
          <FieldRow label={<>이름(영문) <span style={{ color: '#EF4444', marginLeft: 2 }}>*</span></>}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <TextFieldCell
                placeholder="이름을 입력하세요."
                value={form.name_en}
                error={nameEnError}
                onChange={v => { set('name_en', v); if (v.trim()) setNameEnError(false); }}
              />
              {nameEnError && (
                <span style={{ fontSize: 11, color: '#EF4444', padding: '3px 16px', fontFamily: 'var(--font-ko)' }}>
                  이름을 입력해주세요.
                </span>
              )}
            </div>
          </FieldRow>

          <div style={{ height: 10 }} />
          <FieldRow label="성별">
            <CellWrapper>
              <DropdownCell
                value={form.gender} options={GENDER_OPTIONS}
                cellId="gender" openCell={openCell} setOpenCell={setOpenCell}
                onChange={v => set('gender', v)}
                onCellClick={() => {}} onEditDone={() => {}}
              />
            </CellWrapper>
          </FieldRow>

          <div style={{ height: 10 }} />
          <FieldRow label="나이">
            <TextFieldCell placeholder="나이를 입력하세요." value={form.age} onChange={v => set('age', v)} type="number" />
          </FieldRow>

          <div style={{ height: 10 }} />
          <FieldRow label="생일">
            <CellWrapper>
              <CalendarCell
                dateISO={form.birth_date}
                displayDate={isoToDisplay(form.birth_date)}
                cellId="birth_date" openCell={openCell} setOpenCell={setOpenCell}
                onDateChange={v => set('birth_date', v)}
                onCellClick={() => {}} onEditDone={() => {}}
              />
            </CellWrapper>
          </FieldRow>

          <div style={{ height: 16 }} />
          <div style={{ height: 1, background: DIVIDER }} />
          <div style={{ height: 16 }} />

          {/* ── 연락처 ── */}
          <SectionTitle>연락처</SectionTitle>

          <FieldRow label="보호자">
            <TextFieldCell placeholder="보호자 이름을 입력하세요." value={form.guardian_name} onChange={v => set('guardian_name', v)} />
          </FieldRow>
          <FieldRow label="보호자 관계">
            <CellWrapper>
              <DropdownCell
                value={form.guardian_relation} options={RELATION_OPTIONS}
                cellId="guardian_relation" openCell={openCell} setOpenCell={setOpenCell}
                onChange={v => { set('guardian_relation', v); if (v !== '기타') set('guardian_relation_custom', ''); }}
                onCellClick={() => {}} onEditDone={() => {}}
              />
            </CellWrapper>
            {form.guardian_relation === '기타' && (
              <input
                placeholder="관계를 입력하세요."
                value={form.guardian_relation_custom}
                onChange={e => set('guardian_relation_custom', e.target.value)}
                style={{
                  width: 200, height: FIELD_H, flexShrink: 0,
                  borderBottom: '1px solid #E2E5EA', borderRight: '1px solid #E2E5EA',
                  borderTop: 'none', borderLeft: '1px solid #E2E5EA',
                  outline: 'none', padding: '0 12px',
                  fontSize: 13, fontFamily: 'var(--font-ko)',
                  color: 'var(--color-text-primary)',
                }}
              />
            )}
          </FieldRow>

          <div style={{ height: 10 }} />
          <FieldRow label="연락처">
            <TextFieldCell placeholder="010-0000-0000" value={form.contact} onChange={v => set('contact', v)} type="tel" />
          </FieldRow>

          <div style={{ height: 10 }} />
          <FieldRow label="Email">
            <TextFieldCell placeholder="example@email.com" value={form.email} onChange={v => set('email', v)} type="email" />
          </FieldRow>

          <div style={{ height: 16 }} />
          <div style={{ height: 1, background: DIVIDER }} />
          <div style={{ height: 16 }} />

          {/* ── 캠프 정보 ── */}
          <SectionTitle>캠프 정보</SectionTitle>

          <FieldRow label="가입일">
            <DisabledDateCell iso={joinedDate} />
          </FieldRow>

          <div style={{ height: 10 }} />
          <FieldRow label="Agent">
            <CellWrapper>
              <DropdownCell
                value={agents.find(a => a.id === form.agent_id)?.name ?? form.agent_id}
                options={agents.map(a => a.name)}
                cellId="agent_id" openCell={openCell} setOpenCell={setOpenCell}
                onChange={v => {
                  const agent = agents.find(a => a.name === v);
                  set('agent_id', agent?.id ?? v);
                }}
                onCellClick={() => {}} onEditDone={() => {}}
              />
            </CellWrapper>
          </FieldRow>

        </div>
      </div>
    </div>
  );
}
