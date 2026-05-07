// 학생 추가/수정 페이지 — Figma node 329:1983
import { useState, useRef } from 'react';
import {
  CalendarCell, DropdownCell, isoToDisplay,
} from '../components/board/cells';
import type { Student } from './StudentBoardPage';
import type { Agent } from './AgentBoardPage';
import { useDirtyForm } from '../hooks/useDirtyForm';
import StickySaveBar from '../components/StickySaveBar';
import { useDirtyGuard } from '../hooks/useDirtyGuard';
import Card from '../components/Card';

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
const FIELD_H   = 44;
const LABEL_W   = 180;
const DIVIDER   = '1px solid var(--color-border-subtle)';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height: 28, display: 'flex', alignItems: 'flex-end', marginBottom: 12 }}>
      <span style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--color-ink-strong)', fontFamily: 'var(--font-ko)' }}>
        {children}
      </span>
    </div>
  );
}

function FieldRow({ label, height = FIELD_H, dirty = false, children }: {
  label: React.ReactNode; height?: number; dirty?: boolean; children: React.ReactNode;
}) {
  return (
    <div
      className={dirty ? 'ew-field--dirty' : undefined}
      style={{ display: 'flex', minHeight: height, alignItems: 'center', gap: 'var(--space-3)' }}
    >
      <div style={{ width: LABEL_W, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--color-ink-soft)', whiteSpace: 'nowrap' }}>
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
  const cls = `ew-form-cell${error ? ' ew-form-cell--error' : ''}${disabled ? ' ew-form-cell--disabled' : ''}`;
  return (
    <div className={cls} style={{ flex: 1, height: FIELD_H }}>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={e => onChange?.(e.target.value)}
      />
    </div>
  );
}

function CellWrapper({ children, height = FIELD_H }: {
  children: React.ReactNode; height?: number;
}) {
  return (
    <div className="ew-form-cell" style={{ flex: 1, height, overflow: 'hidden' }}>
      {children}
    </div>
  );
}


function DisabledDateCell({ iso }: { iso: string }) {
  return (
    <div className="ew-form-cell ew-form-cell--disabled" style={{ flex: 1, height: FIELD_H, gap: 6 }}>
      <img src="/icon/Calendar.svg" alt="" style={{ width: 14, height: 14, flexShrink: 0, opacity: 0.5 }} />
      <span style={{ fontSize: 'var(--text-base)', color: 'var(--color-ink-mute)', fontFamily: 'var(--font-mono)' }}>
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const joinedDate = editStudent?.history.joined_date ?? todayISO();

  // Determine initial guardian_relation value for the dropdown
  const initRelation = editStudent
    ? (relLabelToKo(editStudent.guardian.relation) || '기타')
    : '';
  const initRelationCustom = editStudent && !relLabelToKo(editStudent.guardian.relation)
    ? editStudent.guardian.relation
    : '';

  const { draft: form, setField, isDirty, count, isFieldDirty, reset, sync } = useDirtyForm({
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
    profile_img_url: editStudent?.profile_img_url ?? null as string | null,
  });

  // 수정 모드에서 dirty 상태 가드 등록 — 페이지 이탈/네비 시 confirm
  const clearGuard = useDirtyGuard('AddStudentPage:edit', isEdit && isDirty);

  function set<K extends keyof typeof form>(field: K, value: typeof form[K]) {
    setField(field, value);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Use FileReader so the URL persists even after the input changes
    const reader = new FileReader();
    reader.onload = ev => setField('profile_img_url', ev.target?.result as string);
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
      profile_img_url: form.profile_img_url,
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
    const familyKey = `ew-family-${student.id}`;
    try {
      type FM = { id: string; name: string; relation: string; isGuardian?: boolean; contact?: string; email?: string };
      const existing = JSON.parse(localStorage.getItem(familyKey) || 'null') as FM[] | null;
      const guardianEntry: FM = { id: 'guardian', name: form.guardian_name, relation: relationValue, isGuardian: true, contact: form.contact, email: form.email };
      if (!existing) {
        localStorage.setItem(familyKey, JSON.stringify([guardianEntry]));
      } else {
        const updated = existing.some(m => m.isGuardian || m.id === 'guardian')
          ? existing.map(m => (m.isGuardian || m.id === 'guardian') ? { ...m, ...guardianEntry } : m)
          : [guardianEntry, ...existing];
        localStorage.setItem(familyKey, JSON.stringify(updated));
      }
    } catch {}
    sync(form);
    clearGuard();
    onSave(student);
  }

  return (
    <div style={{ background: 'var(--color-paper)', minHeight: 'calc(100vh - var(--topnav-h))' }}>

      {/* Page Header */}
      <div className="ew-page-header" style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        height: 'var(--header-h)', padding: '0 var(--page-px)',
        overflow: 'hidden',
      }}>
        <button
          className="ew-btn ew-btn--ghost ew-btn--sm"
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}
        >
          <img src="/icon/arrow_fill_left.svg" alt="" style={{ width: 14, height: 14 }} />
          {isEdit ? '학생 상세' : '학생 목록'}
        </button>
        <div style={{ width: 1, height: 20, background: 'var(--color-border-subtle)' }} />
        <span style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--color-ink-strong)', letterSpacing: 'var(--tracking-tight)', flex: 1 }}>
          {isEdit ? '학생 수정' : '학생 등록'}
        </span>
        {!isEdit && (
          <div style={{ display: 'flex', gap: 5 }}>
            <button
              className="ew-btn ew-btn--secondary ew-btn--sm"
              style={{ width: 80, height: 32, fontSize: 'var(--text-sm)' }}
              onClick={onBack}
            >
              취소
            </button>
            <button
              className="ew-btn ew-btn--primary ew-btn--sm"
              style={{ width: 80, height: 32, fontSize: 'var(--text-sm)' }}
              onClick={handleSave}
            >
              저장
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: 'var(--space-7) var(--page-px)'}}>
        <Card style={{ padding: 'var(--space-7)' }}>

          {/* ── 프로필 사진 ── */}
          <FieldRow label="프로필 사진" height={100} dirty={isEdit && isFieldDirty('profile_img_url')}>
            <div style={{
              flex: 1, height: 100,
              background: 'var(--color-bg-subtle)', border: '1px solid var(--color-border-subtle)', borderRadius: 6,
              display: 'flex', alignItems: 'center', gap: 20, padding: '0 16px',
            }}>
              {form.profile_img_url ? (
                <img src={form.profile_img_url} alt="profile" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'var(--color-border-subtle)', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="4" stroke="#9CA3AF" strokeWidth="1.5"/>
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-faint)', fontFamily: 'var(--font-ko)' }}>
                  JPG, PNG 형식 지원 · 최대 5MB, 가로/세로 100px 권장
                </span>
                <button
                  style={{
                    width: 100, height: 32, fontSize: 'var(--text-sm)', fontWeight: 600,
                    color: 'var(--color-primary)', border: '1px solid #3B82F6',
                    borderRadius: 6, background: 'var(--color-canvas)', cursor: 'pointer',
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

          <FieldRow label={<>이름(한글) <span style={{ color: 'var(--color-error)', marginLeft: 2 }}>*</span></>} dirty={isEdit && isFieldDirty('name_ko')}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <TextFieldCell
                placeholder="이름을 입력하세요."
                value={form.name_ko}
                error={nameError}
                onChange={v => { set('name_ko', v); if (v.trim()) setNameError(false); }}
              />
              {nameError && (
                <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--color-error)', padding: '3px 16px', fontFamily: 'var(--font-ko)' }}>
                  이름을 입력해주세요.
                </span>
              )}
            </div>
          </FieldRow>
          <FieldRow label={<>이름(영문) <span style={{ color: 'var(--color-error)', marginLeft: 2 }}>*</span></>} dirty={isEdit && isFieldDirty('name_en')}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <TextFieldCell
                placeholder="이름을 입력하세요."
                value={form.name_en}
                error={nameEnError}
                onChange={v => { set('name_en', v); if (v.trim()) setNameEnError(false); }}
              />
              {nameEnError && (
                <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--color-error)', padding: '3px 16px', fontFamily: 'var(--font-ko)' }}>
                  이름을 입력해주세요.
                </span>
              )}
            </div>
          </FieldRow>

          <div style={{ height: 10 }} />
          <FieldRow label="성별" dirty={isEdit && isFieldDirty('gender')}>
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
          <FieldRow label="나이" dirty={isEdit && isFieldDirty('age')}>
            <TextFieldCell placeholder="나이를 입력하세요." value={form.age} onChange={v => set('age', v)} type="number" />
          </FieldRow>

          <div style={{ height: 10 }} />
          <FieldRow label="생일" dirty={isEdit && isFieldDirty('birth_date')}>
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

          <FieldRow label="보호자" dirty={isEdit && isFieldDirty('guardian_name')}>
            <TextFieldCell placeholder="보호자 이름을 입력하세요." value={form.guardian_name} onChange={v => set('guardian_name', v)} />
          </FieldRow>
          <FieldRow label="보호자 관계" dirty={isEdit && (isFieldDirty('guardian_relation') || isFieldDirty('guardian_relation_custom'))}>
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
                  borderBottom: '1px solid var(--color-border-subtle)', borderRight: '1px solid var(--color-border-subtle)',
                  borderTop: 'none', borderLeft: '1px solid var(--color-border-subtle)',
                  outline: 'none', padding: '0 12px',
                  fontSize: 'var(--text-base)', fontFamily: 'var(--font-ko)',
                  color: 'var(--color-text-primary)',
                }}
              />
            )}
          </FieldRow>

          <div style={{ height: 10 }} />
          <FieldRow label="연락처" dirty={isEdit && isFieldDirty('contact')}>
            <TextFieldCell placeholder="010-0000-0000" value={form.contact} onChange={v => set('contact', v)} type="tel" />
          </FieldRow>

          <div style={{ height: 10 }} />
          <FieldRow label="Email" dirty={isEdit && isFieldDirty('email')}>
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
          <FieldRow label="Agent" dirty={isEdit && isFieldDirty('agent_id')}>
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

        </Card>
        <div style={{ height: isEdit ? 80 : 0 }} />
      </div>
      <StickySaveBar visible={isEdit && isDirty} count={count} onCancel={reset} onSave={handleSave} />
    </div>
  );
}
