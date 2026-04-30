// 학생 상세 페이지 — Figma node 448:1991
import { useState, useRef, useEffect } from 'react';
import { avatarColor, initials, isoToDisplay, CalendarCell, CalendarTimeCell, DropdownCell } from '../components/board/cells';
import type { Student, CampRecord } from './StudentBoardPage';
import type { Camp } from '../App';
import { loadHotels } from './CampAccommodationTab';
import { loadClasses } from './CampClassTab';
import { useDirtyForm } from '../hooks/useDirtyForm';
import { useDirtyGuard } from '../hooks/useDirtyGuard';

interface FamilyMember { id: string; name: string; relation: string; relationCustom?: string; }
interface RoomEntry { id: string; roomType: string; extraBed: string; }
interface FlightRow {
  flightNo: string;
  dateEntry: string; timeEntry: string;
  dateReturn: string; timeReturn: string;
  pickDrop: string; pickDropPlace: string;
}

function relLabel(r: string) {
  if (r === 'Father' || r === '아빠') return '아빠';
  if (r === 'Mother' || r === '엄마') return '엄마';
  return r || '기타';
}

const RELATION_OPTIONS = ['아빠', '엄마', '기타'];

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  '진행중': { bg: '#E5F7ED', color: '#38B873' },
  '준비중': { bg: '#EEF3FD', color: '#2F6FED' },
  '종료':   { bg: '#F3F4F6', color: '#6B7280' },
};

// ── Shared primitives ──────────────────────────────────────────────────────────
const CELL_H = 48;
const CELL_BORDER: React.CSSProperties = {
  borderBottom: '1px solid #E2E5EA',
  borderRight:  '1px solid #E2E5EA',
};
const FIELD_LABEL: React.CSSProperties = {
  fontSize: 12, fontWeight: 500, color: '#1A1D23', fontFamily: 'var(--font-ko)',
  whiteSpace: 'nowrap', marginBottom: 6,
};

function CellBox({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      height: CELL_H, padding: '0 12px',
      display: 'flex', alignItems: 'center',
      overflow: 'hidden',
      borderBottom: '1px solid #E2E5EA',
      borderRight:  '1px solid #E2E5EA',
      background: '#fff',
      ...style,
    }}>
      {children}
    </div>
  );
}

function TextFieldCell({ placeholder, value, onChange, disabled }: {
  placeholder?: string; value: string;
  onChange?: (v: string) => void; disabled?: boolean;
}) {
  return (
    <div style={{ height: CELL_H, ...CELL_BORDER, background: disabled ? '#F3F4F6' : '#fff', display: 'flex', alignItems: 'center' }}>
      <input
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={e => onChange?.(e.target.value)}
        style={{
          width: '100%', height: '100%', border: 'none', outline: 'none',
          background: 'transparent', fontSize: 13, fontFamily: 'var(--font-ko)',
          color: disabled ? '#9CA3AF' : 'var(--color-text-primary)',
          padding: '0 16px',
        }}
      />
    </div>
  );
}

function SectionCard({ title, children, onSave, onReset, onCancel, dirty = false }: {
  title: string; children: React.ReactNode;
  onSave?: () => void; onReset?: () => void; onCancel?: () => void;
  dirty?: boolean;
}) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #E5E7EA', borderRadius: 8,
      padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1D23', fontFamily: 'var(--font-en)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {dirty && <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-warning)', display: 'inline-block', flexShrink: 0 }} />}
          {title}
        </span>
        {(onSave || onReset || onCancel) && (
          <div style={{ display: 'flex', gap: 8 }}>
            {onReset && (
              <button onClick={onReset} style={{ height: 34, padding: '0 14px', border: '1px solid #E2E5EA', borderRadius: 6, background: '#fff', fontSize: 13, fontWeight: 500, color: '#6B7280', cursor: 'pointer', fontFamily: 'var(--font-ko)' }}>초기화</button>
            )}
            {dirty && onCancel && (
              <button onClick={onCancel} style={{ height: 34, padding: '0 14px', border: '1px solid #E2E5EA', borderRadius: 6, background: '#fff', fontSize: 13, fontWeight: 500, color: '#6B7280', cursor: 'pointer', fontFamily: 'var(--font-ko)' }}>취소</button>
            )}
            {onSave && (
              <button
                onClick={onSave}
                disabled={!dirty}
                style={{
                  height: 34, padding: '0 14px', border: 'none', borderRadius: 6,
                  background: dirty ? '#3C82F5' : '#E5E7EB',
                  fontSize: 13, fontWeight: 500,
                  color: dirty ? '#fff' : '#9CA3AF',
                  cursor: dirty ? 'pointer' : 'not-allowed',
                  fontFamily: 'var(--font-ko)',
                }}
              >저장</button>
            )}
          </div>
        )}
      </div>
      <div style={{ height: 1, background: '#E2E5EA' }} />
      {children}
    </div>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 100, background: '#F0F5FF', color: '#4173F5', fontSize: 12, fontFamily: 'var(--font-ko)', whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

function calcStayDays(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  return Math.max(0, Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
  ));
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function StudentDetailPage({
  student, camps, onBack, onEdit, onStudentUpdate, initialCampId,
}: {
  student: Student; camps: Camp[]; onBack: () => void; onEdit?: () => void;
  onStudentUpdate?: (updated: Student) => void; initialCampId?: string;
}) {
  const campMap = Object.fromEntries(camps.map(c => [c.id, c]));

  const currentId = student.history.current_camp_id;
  const recordCampIds = student.camp_records.map(r => r.camp_id);
  // 현재 캠프 첫 번째, 나머지는 최신순(역순)
  const otherIds = recordCampIds.filter(id => id !== currentId).reverse();
  const campIds = currentId
    ? (recordCampIds.includes(currentId) ? [currentId, ...otherIds] : [currentId, ...recordCampIds.slice().reverse()])
    : otherIds;
  const [activeTab, setActiveTab] = useState(initialCampId || student.history.current_camp_id || campIds[0] || '');
  const [openCell,  setOpenCell]  = useState<string | null>(null);
  const [ftOpenCell, setFtOpenCell] = useState<string | null>(null);

  const camp = campMap[activeTab] as Camp | undefined;

  // 캠프에서 설정한 룸타입 옵션 (CampAccommodationTab → loadHotels)
  const campHotels = loadHotels(activeTab);
  const roomTypeOptions = campHotels.flatMap(h =>
    h.roomTypes.map(rt => ({
      label: h.name ? `${h.name} - ${rt.name}` : rt.name,
      value: rt.name,
      extraBedSupported: rt.extraBed,
    }))
  );
  const avatarBg = avatarColor(student.name_en);
  const initStr  = initials(student.name_en);

  // ── camp_records helpers ───────────────────────────────────────────────────
  const familyKey = `ew-family-${student.id}`;

  const emptyFlight: FlightRow = { flightNo: '', dateEntry: '', timeEntry: '', dateReturn: '', timeReturn: '', pickDrop: '', pickDropPlace: '' };
  const defaultRooms: RoomEntry[] = [{ id: 'r1', roomType: '', extraBed: '' }];
  const defaultFamily: FamilyMember[] = [{ id: 'guardian', name: student.guardian.name, relation: relLabel(student.guardian.relation) }];

  function updateCampRecord(campId: string, patch: Partial<Omit<CampRecord, 'camp_id'>>): Student {
    const existing = student.camp_records.find(r => r.camp_id === campId);
    const newRecord: CampRecord = { camp_id: campId, ...existing, ...patch };
    const newRecords = existing
      ? student.camp_records.map(r => r.camp_id === campId ? newRecord : r)
      : [...student.camp_records, newRecord];
    return { ...student, camp_records: newRecords };
  }

  function loadFamily() {
    try {
      const raw = localStorage.getItem(familyKey);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  // ── Stay Info ──────────────────────────────────────────────────────────────
  const initRec = student.camp_records.find(r => r.camp_id === activeTab);
  type HotelForm = { checkIn: string; checkOut: string; invoiceName: string; rooms: RoomEntry[] };
  const hotelForm = useDirtyForm<HotelForm>(
    initRec?.stay
      ? { checkIn: initRec.stay.checkIn, checkOut: initRec.stay.checkOut, invoiceName: initRec.stay.invoiceName, rooms: initRec.stay.rooms ?? defaultRooms }
      : { checkIn: '', checkOut: '', invoiceName: '', rooms: defaultRooms }
  );
  // 기존 호출부 호환을 위한 alias
  const stayShared = { checkIn: hotelForm.draft.checkIn, checkOut: hotelForm.draft.checkOut, invoiceName: hotelForm.draft.invoiceName };
  const setStayShared = (action: React.SetStateAction<typeof stayShared>) => {
    hotelForm.setDraft(prev => {
      const part = { checkIn: prev.checkIn, checkOut: prev.checkOut, invoiceName: prev.invoiceName };
      const next = typeof action === 'function' ? (action as (p: typeof part) => typeof part)(part) : action;
      return { ...prev, ...next };
    });
  };
  const rooms = hotelForm.draft.rooms;
  const setRooms = (action: React.SetStateAction<RoomEntry[]>) => {
    hotelForm.setDraft(prev => ({
      ...prev,
      rooms: typeof action === 'function' ? (action as (p: RoomEntry[]) => RoomEntry[])(prev.rooms) : action,
    }));
  };
  const invoiceRef = useRef<HTMLInputElement>(null);
  const stayDays   = calcStayDays(stayShared.checkIn, stayShared.checkOut);
  const checkOutErr = !!(stayShared.checkOut && stayShared.checkIn && stayShared.checkOut <= stayShared.checkIn);

  // ── Flight Info ────────────────────────────────────────────────────────────
  type FlightInfo = { passportNo: string; passportName: string; departure: FlightRow; return: FlightRow };
  const flightForm = useDirtyForm<FlightInfo>(
    initRec?.flight ?? { passportNo: '', passportName: '', departure: emptyFlight, return: emptyFlight }
  );
  const flightInfo = flightForm.draft;
  const setFlightInfo = (action: React.SetStateAction<FlightInfo>) => {
    flightForm.setDraft(prev => typeof action === 'function' ? (action as (p: FlightInfo) => FlightInfo)(prev) : action);
  };

  // 캠프 탭 변경 시 — 새 캠프 데이터로 sync (dirty 초기화)
  useEffect(() => {
    const rec = student.camp_records.find(r => r.camp_id === activeTab);
    hotelForm.sync(
      rec?.stay
        ? { checkIn: rec.stay.checkIn, checkOut: rec.stay.checkOut, invoiceName: rec.stay.invoiceName, rooms: rec.stay.rooms ?? defaultRooms }
        : { checkIn: '', checkOut: '', invoiceName: '', rooms: defaultRooms }
    );
    flightForm.sync(rec?.flight ?? { passportNo: '', passportName: '', departure: emptyFlight, return: emptyFlight });
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  function saveHotel() {
    const draft = hotelForm.draft;
    onStudentUpdate?.(updateCampRecord(activeTab, { stay: { checkIn: draft.checkIn, checkOut: draft.checkOut, invoiceName: draft.invoiceName, rooms: draft.rooms } }));
    hotelForm.sync(draft);
    clearHotelGuard();
  }
  function resetHotel() {
    hotelForm.setDraft({ checkIn: '', checkOut: '', invoiceName: '', rooms: defaultRooms });
  }

  function updateRoom(id: string, field: keyof RoomEntry, val: string) {
    setRooms(p => p.map(r => r.id === id ? { ...r, [field]: val } : r));
  }
  function setRoomCount(n: number) {
    if (n < 1) return;
    setRooms(p => {
      if (n > p.length) {
        const extras = Array.from({ length: n - p.length }, (_, i) => ({
          id: `r${Date.now()}-${i}`, roomType: '', extraBed: '',
        }));
        return [...p, ...extras];
      }
      return p.slice(0, n);
    });
  }
  function handleInvoiceFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStayShared(p => ({ ...p, invoiceName: file.name }));
    e.target.value = '';
  }

  function saveFlight() {
    const draft = flightForm.draft;
    onStudentUpdate?.(updateCampRecord(activeTab, { flight: draft }));
    flightForm.sync(draft);
    clearFlightGuard();
  }
  function resetFlight() {
    flightForm.setDraft({ passportNo: '', passportName: '', departure: emptyFlight, return: emptyFlight });
  }

  // ── Family Info ────────────────────────────────────────────────────────────
  type FamilyForm = { members: FamilyMember[] };
  const familyForm = useDirtyForm<FamilyForm>({ members: loadFamily() ?? defaultFamily });
  const familyMembers = familyForm.draft.members;
  const setFamilyMembers = (action: React.SetStateAction<FamilyMember[]>) => {
    familyForm.setDraft(prev => ({
      members: typeof action === 'function' ? (action as (p: FamilyMember[]) => FamilyMember[])(prev.members) : action,
    }));
  };

  // 3개 섹션 dirty 가드 등록
  const clearHotelGuard  = useDirtyGuard('StudentDetailPage:hotel',  hotelForm.isDirty);
  const clearFlightGuard = useDirtyGuard('StudentDetailPage:flight', flightForm.isDirty);
  const clearFamilyGuard = useDirtyGuard('StudentDetailPage:family', familyForm.isDirty);

  function saveFamily() {
    const draft = familyForm.draft;
    localStorage.setItem(familyKey, JSON.stringify(draft.members));
    familyForm.sync(draft);
    clearFamilyGuard();
  }
  function resetFamily() {
    familyForm.setDraft({ members: defaultFamily });
  }
  function updateFamily(id: string, field: 'name' | 'relation' | 'relationCustom', val: string) {
    setFamilyMembers(p => p.map(m => m.id === id ? { ...m, [field]: val } : m));
  }
  function addFamily() {
    setFamilyMembers(p => [...p, { id: `fam-${Date.now()}`, name: '', relation: '' }]);
  }
  function removeFamily(id: string) {
    setFamilyMembers(p => p.filter(m => m.id !== id));
  }

  // ── FlightTable rows (inline to avoid nested-component remount issue) ───────
  const flightRows = [
    { row: flightInfo.departure, onChange: (f: FlightRow) => setFlightInfo(p => ({ ...p, departure: f })), label: '출발편', labelBg: '#EDF5FF', labelColor: '#2E61D1', rowKey: 'dep' },
    { row: flightInfo.return,    onChange: (f: FlightRow) => setFlightInfo(p => ({ ...p, return: f })),    label: '귀국편', labelBg: '#F0FCF5', labelColor: '#1A8C59', rowKey: 'ret' },
  ];

  const hdCell: React.CSSProperties = {
    borderBottom: '1px solid #E2E5EA', borderRight: '1px solid #E2E5EA', borderTop: '1px solid #E2E5EA',
    height: 40, display: 'flex', alignItems: 'center', padding: '0 8px 0 10px',
    fontSize: 11, fontWeight: 500, color: '#6B7585', fontFamily: 'var(--font-ko)', whiteSpace: 'nowrap',
  };

  return (
    <div style={{ background: 'var(--color-paper)', minHeight: 'calc(100vh - var(--topnav-h))', overflowX: 'auto' }}>

      {/* Page Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
        height: 'var(--header-h)', padding: '0 var(--page-px)',
        background: 'var(--color-canvas)', borderBottom: '1px solid var(--color-border-subtle)',
        minWidth: 1360,
      }}>
        <button
          onClick={onBack}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', background: 'none', border: 'none', cursor: 'pointer', padding: 'var(--space-1) 0', fontSize: 'var(--text-md)', color: 'var(--color-ink-soft)', letterSpacing: 'var(--tracking-tight)' }}
        >
          ← 학생 목록으로
        </button>
        <div style={{ width: 1, height: 16, background: 'var(--color-border-subtle)', margin: '0 var(--space-2)' }} />
        <span style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--color-ink-strong)', letterSpacing: 'var(--tracking-tight)' }}>학생 상세</span>
      </div>

      <div style={{ padding: 'var(--space-7) var(--page-px)', minWidth: 1360, display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* ProfileCard */}
        <div style={{ background: 'var(--color-canvas)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-5)', boxShadow: 'var(--shadow-soft)' }}>
          {student.profile_img_url ? (
            <img src={student.profile_img_url} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: avatarBg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-2xl)', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-en)', letterSpacing: 'var(--tracking-tight)' }}>
              {initStr}
            </div>
          )}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
              <span style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--color-ink-strong)', letterSpacing: 'var(--tracking-tight)' }}>{student.name_ko}</span>
              <span style={{ fontSize: 'var(--text-md)', color: 'var(--color-ink-mute)', fontFamily: 'var(--font-en)', letterSpacing: 'var(--tracking-wide)' }}>{student.name_en.toLowerCase()}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--color-ink-soft)' }}>
              <span><span style={{ fontFamily: 'var(--font-mono)', fontFeatureSettings: '"tnum" 1' }}>{student.age}</span>세</span>
              <span style={{ color: 'var(--color-ink-faint)' }}>·</span>
              <span>{student.gender}</span>
              <span style={{ color: 'var(--color-ink-faint)' }}>·</span>
              <span style={{ color: 'var(--color-ink-mute)' }}>가입일 <span style={{ fontFamily: 'var(--font-mono)', fontFeatureSettings: '"tnum" 1' }}>{student.history.joined_date}</span></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
              <span style={{ color: 'var(--color-ink-soft)' }}>보호자 <span style={{ color: 'var(--color-ink)' }}>{student.guardian.name}</span>({relLabel(student.guardian.relation)})</span>
              <span style={{ color: 'var(--color-ink-faint)' }}>·</span>
              <span style={{ color: 'var(--color-ink-soft)', fontFamily: 'var(--font-mono)', fontFeatureSettings: '"tnum" 1' }}>{student.guardian.contact}</span>
              <span style={{ color: 'var(--color-ink-faint)' }}>·</span>
              <span style={{ color: 'var(--color-ink-mute)', fontFamily: 'var(--font-en)' }}>{student.guardian.email}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
            <button className="ew-btn ew-btn--secondary ew-btn--sm" onClick={onEdit}>수정</button>
            <button className="ew-btn ew-btn--danger ew-btn--sm">삭제</button>
          </div>
        </div>

        {/* TabBar — 캠프 탭 */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border-subtle)', padding: '0 var(--space-1)', marginTop: 'var(--space-6)' }}>
          {campIds.map(id => {
            const isActive  = id === activeTab;
            const isCurrent = id === student.history.current_camp_id;
            const campName  = campMap[id]?.name ?? id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`ew-tab${isActive ? ' active' : ''}`}
                style={{ fontFamily: 'var(--font-en)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>{campName}</span>
                  {isCurrent && (
                    <span style={{ fontSize: 'var(--text-2xs)', padding: '1px 6px', borderRadius: 'var(--radius-pill)', background: 'var(--color-success-light)', color: 'var(--color-success)', fontWeight: 600, letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase' }}>참여중</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Camp Detail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingTop: 32 }}>

          {/* Camp Basic Info */}
          {camp && (
            <div style={{ background: '#fff', border: '1px solid #E0E2E5', borderRadius: 12, padding: '20px 24px' }}>
              <span style={{ fontSize: 16, fontWeight: 500, color: '#21262E', fontFamily: 'var(--font-en)', display: 'block', marginBottom: 16 }}>Camp Basic Info.</span>
              <div style={{ display: 'flex', borderTop: '1px solid #F0F1F3' }}>
                {[
                  { label: '캠프명', value: camp.name },
                  { label: '기간', value: camp.start_date && camp.end_date ? `${isoToDisplay(camp.start_date)} ~ ${camp.end_date.slice(5).replace(/-/g, '/')}` : '-' },
                  { label: '지역', value: camp.location ?? '-' },
                  { label: '숙소', value: camp.accommodation ?? '-' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ flex: 1, padding: '16px 16px 16px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 12, color: '#73808F', fontFamily: 'var(--font-ko)' }}>{label}</span>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#21262E', fontFamily: 'var(--font-ko)' }}>{value}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', borderTop: '1px solid #F0F1F3' }}>
                <div style={{ flex: 1, padding: '16px 16px 0 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 12, color: '#73808F', fontFamily: 'var(--font-ko)' }}>스탭</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {camp.staff?.map(s => <Pill key={s} label={s} />) ?? <span style={{ fontSize: 14, color: '#21262E' }}>-</span>}
                  </div>
                </div>
                <div style={{ flex: 1, padding: '16px 16px 0 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 12, color: '#73808F', fontFamily: 'var(--font-ko)' }}>소속 클래스</span>
                  {(() => {
                    const cls = loadClasses(activeTab).find(c => c.studentIds.includes(student.id));
                    return cls
                      ? <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 100, background: '#EEF3FD', color: '#2F6FED', fontSize: 12, fontFamily: 'var(--font-ko)', alignSelf: 'flex-start' }}>{cls.name}</span>
                      : <span style={{ fontSize: 14, color: '#21262E' }}>-</span>;
                  })()}
                </div>
                <div style={{ flex: 1, padding: '16px 16px 0 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 12, color: '#73808F', fontFamily: 'var(--font-ko)' }}>정원</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#21262E', fontFamily: 'var(--font-ko)' }}>{camp.capacity ? `${camp.capacity}명` : '-'}</span>
                </div>
                <div style={{ flex: 1, padding: '16px 0 0 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 12, color: '#73808F', fontFamily: 'var(--font-ko)' }}>상태</span>
                  {camp.status ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 100, background: STATUS_STYLE[camp.status]?.bg ?? '#F3F4F6', color: STATUS_STYLE[camp.status]?.color ?? '#6B7280', fontSize: 12, fontFamily: 'var(--font-ko)', alignSelf: 'flex-start' }}>
                      {camp.status}
                    </span>
                  ) : <span style={{ fontSize: 14, color: '#21262E' }}>-</span>}
                </div>
              </div>
            </div>
          )}

          {/* Hotel Info */}
          <SectionCard
            title="Hotel Info."
            onSave={saveHotel}
            onReset={resetHotel}
            onCancel={hotelForm.reset}
            dirty={hotelForm.isDirty}
          >
            <input ref={invoiceRef} type="file" accept=".pdf,.jpg,.png,.xlsx" style={{ display: 'none' }} onChange={handleInvoiceFile} />

            {/* ── Shared: Check-In / Check-Out / Stay / Invoice ── */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              {/* Check-In */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span style={FIELD_LABEL}>Check-In</span>
                <CellBox>
                  <CalendarCell
                    dateISO={stayShared.checkIn} displayDate={isoToDisplay(stayShared.checkIn)}
                    cellId="stay-ci" openCell={openCell} setOpenCell={setOpenCell}
                    onDateChange={v => setStayShared(p => ({ ...p, checkIn: v }))}
                    onCellClick={() => {}} onEditDone={() => {}}
                  />
                </CellBox>
              </div>
              {/* Check-Out */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span style={FIELD_LABEL}>Check-Out</span>
                <CellBox style={{ borderBottom: checkOutErr ? '2px solid #EF4444' : '1px solid #E2E5EA' }}>
                  <CalendarCell
                    dateISO={stayShared.checkOut} displayDate={isoToDisplay(stayShared.checkOut)}
                    cellId="stay-co" openCell={openCell} setOpenCell={setOpenCell}
                    onDateChange={v => setStayShared(p => ({ ...p, checkOut: v }))}
                    onCellClick={() => {}} onEditDone={() => {}}
                  />
                </CellBox>
                {checkOutErr && (
                  <span style={{ fontSize: 11, color: '#EF4444', padding: '3px 4px', fontFamily: 'var(--font-ko)' }}>
                    체크아웃은 체크인 이후여야 합니다.
                  </span>
                )}
              </div>
              {/* Stay (read-only) */}
              <div style={{ width: 90, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                <span style={FIELD_LABEL}>Stay</span>
                <div style={{ height: CELL_H, ...CELL_BORDER, background: '#F3F4F6', display: 'flex', alignItems: 'center', padding: '0 12px' }}>
                  <span style={{ fontSize: 13, color: '#9CA3AF', fontFamily: 'var(--font-en)' }}>{stayDays ? `${stayDays}day` : '-'}</span>
                </div>
              </div>
              {/* Invoice */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span style={FIELD_LABEL}>Invoice</span>
                <div style={{ height: CELL_H, ...CELL_BORDER, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <button
                    onClick={() => invoiceRef.current?.click()}
                    style={{ height: 32, padding: '0 14px', background: '#F3F4F6', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, color: '#3B82F6', cursor: 'pointer', fontFamily: 'var(--font-ko)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {stayShared.invoiceName || '첨부'}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ height: 1, background: '#E2E5EA' }} />

            {/* ── Room count stepper ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#1A1D23', fontFamily: 'var(--font-ko)' }}>객실 수</span>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <button
                  onClick={() => setRoomCount(rooms.length - 1)}
                  disabled={rooms.length <= 1}
                  style={{ width: 30, height: 30, border: '1px solid #E2E5EA', borderRight: 'none', borderRadius: '6px 0 0 6px', background: rooms.length <= 1 ? '#F9FAFB' : '#fff', color: rooms.length <= 1 ? '#D1D5DB' : '#374151', fontSize: 16, cursor: rooms.length <= 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >−</button>
                <div style={{ width: 40, height: 30, border: '1px solid #E2E5EA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: '#1A1D23', fontFamily: 'var(--font-en)' }}>
                  {rooms.length}
                </div>
                <button
                  onClick={() => setRoomCount(rooms.length + 1)}
                  style={{ width: 30, height: 30, border: '1px solid #E2E5EA', borderLeft: 'none', borderRadius: '0 6px 6px 0', background: '#fff', color: '#374151', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >+</button>
              </div>
            </div>

            {/* ── Room type rows ── */}
            {rooms.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {/* Column header */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingBottom: 6 }}>
                  <span style={{ width: 40, fontSize: 11, fontWeight: 500, color: '#6B7585', fontFamily: 'var(--font-ko)', textAlign: 'center' }}>No.</span>
                  <span style={{ flex: 1, fontSize: 11, fontWeight: 500, color: '#6B7585', fontFamily: 'var(--font-ko)' }}>Room Type</span>
                  <span style={{ flex: 1, fontSize: 11, fontWeight: 500, color: '#6B7585', fontFamily: 'var(--font-ko)' }}>Extra Bed</span>
                  <div style={{ width: 32 }} />
                </div>
                <div style={{ height: 1, background: '#E2E5EA', marginBottom: 8 }} />
                {rooms.map((r, i) => {
                  const selOpt = roomTypeOptions.find(o => o.value === r.roomType);
                  const extraBedDisabled = selOpt ? !selOpt.extraBedSupported : false;
                  return (
                  <div key={r.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ width: 40, fontSize: 13, color: '#9CA3AF', fontFamily: 'var(--font-en)', textAlign: 'center', flexShrink: 0 }}>{i + 1}</span>
                    <CellBox style={{ flex: 1 }}>
                      <DropdownCell
                        value={roomTypeOptions.find(o => o.value === r.roomType)?.label ?? r.roomType}
                        options={roomTypeOptions.map(o => o.label)}
                        cellId={`room-type-${r.id}`}
                        openCell={openCell} setOpenCell={setOpenCell}
                        onChange={label => {
                          const opt = roomTypeOptions.find(o => o.label === label);
                          updateRoom(r.id, 'roomType', opt?.value ?? label);
                          if (opt && !opt.extraBedSupported) updateRoom(r.id, 'extraBed', '없음');
                        }}
                        onCellClick={() => {}} onEditDone={() => {}}
                      />
                    </CellBox>
                    <CellBox style={{ flex: 1, background: extraBedDisabled ? '#F3F4F6' : '#fff' }}>
                      <select
                        value={extraBedDisabled ? '없음' : r.extraBed}
                        disabled={extraBedDisabled}
                        onChange={e => updateRoom(r.id, 'extraBed', e.target.value)}
                        style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, fontFamily: 'var(--font-ko)', color: r.extraBed ? '#1A1D23' : '#B7BECA', cursor: extraBedDisabled ? 'not-allowed' : 'pointer' }}
                      >
                        <option value="" disabled>선택</option>
                        {['있음', '없음'].map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </CellBox>
                    <button
                      onClick={() => setRoomCount(rooms.length - 1)}
                      disabled={rooms.length === 1}
                      style={{
                        width: 32, height: 32, borderRadius: 6, border: '1px solid #E2E5EA', flexShrink: 0,
                        background: rooms.length === 1 ? '#F9FAFB' : '#fff',
                        color: rooms.length === 1 ? '#D1D5DB' : '#EF4444',
                        cursor: rooms.length === 1 ? 'not-allowed' : 'pointer',
                        fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >×</button>
                  </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* Flight Info */}
          <SectionCard
            title="Flight Info."
            onSave={saveFlight}
            onReset={resetFlight}
            onCancel={flightForm.reset}
            dirty={flightForm.isDirty}
          >
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              {/* Passport fields */}
              <div style={{ width: 400, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#6B7585', fontFamily: 'var(--font-ko)' }}>Passport No.</span>
                  <TextFieldCell placeholder="여권 번호를 입력하세요." value={flightInfo.passportNo} onChange={v => setFlightInfo(p => ({ ...p, passportNo: v }))} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#6B7585', fontFamily: 'var(--font-ko)' }}>Passport Name.</span>
                  <TextFieldCell placeholder="여권 표기된 이름을 입력하세요." value={flightInfo.passportName} onChange={v => setFlightInfo(p => ({ ...p, passportName: v }))} />
                </div>
              </div>

              {/* Flight table — rows inlined via .map() to avoid nested-component remount */}
              <div style={{ flex: 1, border: '1px solid #E2E5EA', borderRadius: 6, overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ display: 'flex', background: '#F4F5F7', height: 40 }}>
                  <div style={{ ...hdCell, width: 80, flexShrink: 0 }}>Type</div>
                  <div style={{ ...hdCell, width: 171, flexShrink: 0 }}>Flight No.</div>
                  <div style={{ ...hdCell, flex: 1 }}>Date of Entry</div>
                  <div style={{ ...hdCell, flex: 1 }}>Date of Return</div>
                  <div style={{ ...hdCell, flex: 1 }}>Pick&amp;Drop</div>
                </div>
                {/* Rows */}
                {flightRows.map(({ row, onChange, label, labelBg, labelColor, rowKey }) => (
                  <div key={rowKey} style={{ display: 'flex', height: CELL_H }}>
                    {/* Type badge */}
                    <div style={{ width: 80, height: CELL_H, background: labelBg, border: '1px solid #E2E5EA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 500, color: labelColor, fontFamily: 'var(--font-ko)', whiteSpace: 'pre' }}>✈  {label}</span>
                    </div>
                    {/* Flight No */}
                    <div style={{ width: 171, height: CELL_H, ...CELL_BORDER, background: '#fff', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                      <input
                        value={row.flightNo}
                        onChange={e => onChange({ ...row, flightNo: e.target.value })}
                        placeholder="KE 124"
                        style={{ width: '100%', height: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 12, fontFamily: 'var(--font-en)', color: row.flightNo ? '#1A1D23' : '#B7BECA', padding: '0 16px' }}
                      />
                    </div>
                    {/* Date of Entry — CalendarTimeCell */}
                    <div style={{ flex: 1, height: CELL_H, padding: '0 12px', display: 'flex', alignItems: 'center', overflow: 'hidden', ...CELL_BORDER, background: '#fff' }}>
                      <CalendarTimeCell
                        dateISO={row.dateEntry} time={row.timeEntry}
                        cellId={`${rowKey}-entry`}
                        openCell={ftOpenCell} setOpenCell={setFtOpenCell}
                        onDateChange={v => onChange({ ...row, dateEntry: v })}
                        onTimeChange={v => onChange({ ...row, timeEntry: v })}
                        onCellClick={() => {}}
                      />
                    </div>
                    {/* Date of Return — CalendarTimeCell */}
                    <div style={{ flex: 1, height: CELL_H, padding: '0 12px', display: 'flex', alignItems: 'center', overflow: 'hidden', ...CELL_BORDER, background: '#fff' }}>
                      <CalendarTimeCell
                        dateISO={row.dateReturn} time={row.timeReturn}
                        cellId={`${rowKey}-return`}
                        openCell={ftOpenCell} setOpenCell={setFtOpenCell}
                        onDateChange={v => onChange({ ...row, dateReturn: v })}
                        onTimeChange={v => onChange({ ...row, timeReturn: v })}
                        onCellClick={() => {}}
                      />
                    </div>
                    {/* Pick&Drop */}
                    <div style={{ flex: 1, height: CELL_H, ...CELL_BORDER, background: '#fff', display: 'flex', alignItems: 'center', padding: '0 10px', gap: 6 }}>
                      <select
                        value={row.pickDrop}
                        onChange={e => onChange({ ...row, pickDrop: e.target.value, pickDropPlace: e.target.value === '없음' ? '' : row.pickDropPlace })}
                        style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12, fontFamily: 'var(--font-ko)', color: row.pickDrop ? '#1A1D23' : '#B7BECA', cursor: 'pointer', flexShrink: 0 }}
                      >
                        <option value="" disabled>선택</option>
                        {(rowKey === 'dep' ? ['픽업', '없음'] : ['드랍', '없음']).map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      {row.pickDrop && row.pickDrop !== '없음' && (
                        <>
                          <div style={{ width: 1, height: 14, background: '#E2E5EA', flexShrink: 0 }} />
                          <input
                            value={row.pickDropPlace}
                            onChange={e => onChange({ ...row, pickDropPlace: e.target.value })}
                            placeholder="장소 입력"
                            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 12, fontFamily: 'var(--font-ko)', color: '#1A1D23', padding: 0, minWidth: 0 }}
                          />
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          {/* Family Info */}
          <SectionCard
            title="Family Info."
            onSave={saveFamily}
            onReset={resetFamily}
            onCancel={familyForm.reset}
            dirty={familyForm.isDirty}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingBottom: 4 }}>
                <span style={{ width: 40, fontSize: 11, fontWeight: 500, color: '#6B7585', fontFamily: 'var(--font-ko)' }}>No.</span>
                <span style={{ flex: 1, fontSize: 11, fontWeight: 500, color: '#6B7585', fontFamily: 'var(--font-ko)' }}>이름</span>
                <span style={{ flex: 1, fontSize: 11, fontWeight: 500, color: '#6B7585', fontFamily: 'var(--font-ko)' }}>관계</span>
                <div style={{ width: 32 }} />
              </div>
              <div style={{ height: 1, background: '#E2E5EA' }} />
              {familyMembers.map((m, i) => (
                <div key={m.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ width: 40, fontSize: 13, color: '#9CA3AF', fontFamily: 'var(--font-en)', textAlign: 'center', flexShrink: 0 }}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <TextFieldCell placeholder="이름을 입력하세요." value={m.name} onChange={v => updateFamily(m.id, 'name', v)} />
                  </div>
                  <div style={{ flex: 1, display: 'flex', gap: 0 }}>
                    <CellBox style={{ flex: 1 }}>
                      <DropdownCell
                        value={m.relation} options={RELATION_OPTIONS}
                        cellId={`fam-${m.id}-rel`}
                        openCell={openCell} setOpenCell={setOpenCell}
                        onChange={v => { updateFamily(m.id, 'relation', v); if (v !== '기타') updateFamily(m.id, 'relationCustom', ''); }}
                        onCellClick={() => {}} onEditDone={() => {}}
                      />
                    </CellBox>
                    {m.relation === '기타' && (
                      <input
                        placeholder="직접 입력"
                        value={m.relationCustom ?? ''}
                        onChange={e => updateFamily(m.id, 'relationCustom', e.target.value)}
                        style={{
                          width: 110, height: CELL_H, flexShrink: 0,
                          borderBottom: '1px solid #E2E5EA', borderRight: '1px solid #E2E5EA',
                          borderTop: 'none', borderLeft: '1px solid #E2E5EA',
                          outline: 'none', padding: '0 10px',
                          fontSize: 13, fontFamily: 'var(--font-ko)',
                          color: 'var(--color-text-primary)', background: '#fff',
                        }}
                      />
                    )}
                  </div>
                  <button
                    onClick={() => removeFamily(m.id)}
                    disabled={m.id === 'guardian'}
                    style={{
                      width: 32, height: 32, borderRadius: 6, border: '1px solid #E2E5EA',
                      background: m.id === 'guardian' ? '#F9FAFB' : '#fff',
                      color: m.id === 'guardian' ? '#D1D5DB' : '#EF4444',
                      cursor: m.id === 'guardian' ? 'not-allowed' : 'pointer',
                      fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}
                  >×</button>
                </div>
              ))}
              <button
                onClick={addFamily}
                style={{
                  marginTop: 4, height: 36, border: '1px dashed #D1D5DB', borderRadius: 6,
                  background: '#F9FAFB', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                  color: '#6B7280', fontFamily: 'var(--font-ko)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <span style={{ fontSize: 16 }}>+</span> 인원 추가
              </button>
            </div>
          </SectionCard>

        </div>
      </div>
    </div>
  );
}
