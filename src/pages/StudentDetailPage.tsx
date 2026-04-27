// 학생 상세 페이지 — Figma node 448:1991
import { useState, useRef, useEffect } from 'react';
import { avatarColor, initials, isoToDisplay, CalendarCell, CalendarTimeCell, DropdownCell } from '../components/board/cells';
import type { Student, CampRecord } from './StudentBoardPage';
import type { Camp } from '../App';
import { loadHotels } from './CampAccommodationTab';

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

function SectionCard({ title, children, onSave, onReset }: {
  title: string; children: React.ReactNode;
  onSave?: () => void; onReset?: () => void;
}) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #E5E7EA', borderRadius: 8,
      padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1D23', fontFamily: 'var(--font-en)' }}>{title}</span>
        {(onSave || onReset) && (
          <div style={{ display: 'flex', gap: 8 }}>
            {onReset && (
              <button onClick={onReset} style={{ height: 34, padding: '0 14px', border: '1px solid #E2E5EA', borderRadius: 6, background: '#fff', fontSize: 13, fontWeight: 500, color: '#6B7280', cursor: 'pointer', fontFamily: 'var(--font-ko)' }}>초기화</button>
            )}
            {onSave && (
              <button onClick={onSave} style={{ height: 34, padding: '0 14px', border: 'none', borderRadius: 6, background: '#3C82F5', fontSize: 13, fontWeight: 500, color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-ko)' }}>저장</button>
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
  student, camps, onBack, onEdit, onStudentUpdate,
}: {
  student: Student; camps: Camp[]; onBack: () => void; onEdit?: () => void;
  onStudentUpdate?: (updated: Student) => void;
}) {
  const campMap = Object.fromEntries(camps.map(c => [c.id, c]));

  const currentId = student.history.current_camp_id;
  const recordCampIds = student.camp_records.map(r => r.camp_id);
  // 현재 캠프 첫 번째, 나머지는 최신순(역순)
  const otherIds = recordCampIds.filter(id => id !== currentId).reverse();
  const campIds = currentId
    ? (recordCampIds.includes(currentId) ? [currentId, ...otherIds] : [currentId, ...recordCampIds.slice().reverse()])
    : otherIds;
  const [activeTab, setActiveTab] = useState(student.history.current_camp_id || campIds[0] || '');
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
  const [stayShared, setStayShared] = useState<{ checkIn: string; checkOut: string; invoiceName: string }>(
    initRec?.stay ? { checkIn: initRec.stay.checkIn, checkOut: initRec.stay.checkOut, invoiceName: initRec.stay.invoiceName }
                  : { checkIn: '', checkOut: '', invoiceName: '' }
  );
  const [rooms, setRooms] = useState<RoomEntry[]>(initRec?.stay?.rooms ?? defaultRooms);
  const invoiceRef = useRef<HTMLInputElement>(null);
  const stayDays   = calcStayDays(stayShared.checkIn, stayShared.checkOut);
  const checkOutErr = !!(stayShared.checkOut && stayShared.checkIn && stayShared.checkOut <= stayShared.checkIn);

  // Reload hotel/flight when tab changes
  useEffect(() => {
    const rec = student.camp_records.find(r => r.camp_id === activeTab);
    setStayShared(rec?.stay ? { checkIn: rec.stay.checkIn, checkOut: rec.stay.checkOut, invoiceName: rec.stay.invoiceName }
                            : { checkIn: '', checkOut: '', invoiceName: '' });
    setRooms(rec?.stay?.rooms ?? defaultRooms);
    setFlightInfo(rec?.flight ?? { passportNo: '', passportName: '', departure: emptyFlight, return: emptyFlight });
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  function saveHotel() {
    onStudentUpdate?.(updateCampRecord(activeTab, { stay: { checkIn: stayShared.checkIn, checkOut: stayShared.checkOut, invoiceName: stayShared.invoiceName, rooms } }));
  }
  function resetHotel() {
    onStudentUpdate?.(updateCampRecord(activeTab, { stay: undefined }));
    setStayShared({ checkIn: '', checkOut: '', invoiceName: '' });
    setRooms(defaultRooms);
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

  // ── Flight Info ────────────────────────────────────────────────────────────
  const [flightInfo, setFlightInfo] = useState(
    initRec?.flight ?? { passportNo: '', passportName: '', departure: emptyFlight, return: emptyFlight }
  );

  function saveFlight() {
    onStudentUpdate?.(updateCampRecord(activeTab, { flight: flightInfo }));
  }
  function resetFlight() {
    onStudentUpdate?.(updateCampRecord(activeTab, { flight: undefined }));
    setFlightInfo({ passportNo: '', passportName: '', departure: emptyFlight, return: emptyFlight });
  }

  // ── Family Info ────────────────────────────────────────────────────────────
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>(loadFamily() ?? defaultFamily);

  function saveFamily() {
    localStorage.setItem(familyKey, JSON.stringify(familyMembers));
    alert('Family Info. 저장되었습니다.');
  }
  function resetFamily() {
    localStorage.removeItem(familyKey);
    setFamilyMembers(defaultFamily);
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
    <div style={{ background: '#F5F7FA', minHeight: 'calc(100vh - 66px)', overflowX: 'auto' }}>

      {/* Page Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        height: 52, padding: '0 40px',
        background: '#fff', borderBottom: '1px solid #E2E5EA',
        minWidth: 1360,
      }}>
        <button
          onClick={onBack}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', fontSize: 14, color: '#6B7280', fontFamily: 'var(--font-en)' }}
        >
          ←
        </button>
        <span style={{ fontSize: 16, fontWeight: 500, color: '#1A1D23', fontFamily: 'var(--font-ko)' }}>학생 상세</span>
      </div>

      <div style={{ padding: '32px 40px', minWidth: 1360, display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* ProfileCard */}
        <div style={{ background: '#fff', border: '1px solid #E2E5EA', borderRadius: 8, padding: 24, display: 'flex', alignItems: 'center', gap: 20, marginBottom: 0 }}>
          {student.profile_img_url ? (
            <img src={student.profile_img_url} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: avatarBg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-en)' }}>
              {initStr}
            </div>
          )}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20, fontWeight: 500, color: '#1A1D23', fontFamily: 'var(--font-ko)' }}>{student.name_ko}</span>
              <span style={{ fontSize: 13, color: '#9CA3AF', fontFamily: 'var(--font-en)' }}>{student.name_en.toLowerCase()}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#6B7280', fontFamily: 'var(--font-ko)' }}>
              <span>{student.age}세</span><span style={{ color: '#9CA3AF' }}>·</span>
              <span>{student.gender}</span><span style={{ color: '#9CA3AF' }}>·</span>
              <span style={{ color: '#9CA3AF' }}>가입일 {student.history.joined_date}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, fontFamily: 'var(--font-ko)' }}>
              <span style={{ color: '#6B7280' }}>보호자 {student.guardian.name}({relLabel(student.guardian.relation)})</span>
              <span style={{ color: '#9CA3AF' }}>·</span>
              <span style={{ color: '#6B7280', fontFamily: 'var(--font-en)' }}>{student.guardian.contact}</span>
              <span style={{ color: '#9CA3AF' }}>·</span>
              <span style={{ color: '#9CA3AF', fontFamily: 'var(--font-en)' }}>{student.guardian.email}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
            <button onClick={onEdit} style={{ height: 40, minWidth: 80, padding: '0 16px', background: '#fff', border: '1px solid #E2E5EA', borderRadius: 6, fontSize: 13, fontWeight: 500, color: '#6B7280', cursor: 'pointer', fontFamily: 'var(--font-ko)' }}>수정</button>
            <button style={{ height: 40, minWidth: 80, padding: '0 16px', background: '#F5F7FA', border: '1px solid #FF7070', borderRadius: 6, fontSize: 13, fontWeight: 500, color: '#FF7070', cursor: 'pointer', fontFamily: 'var(--font-ko)' }}>삭제</button>
          </div>
        </div>

        {/* TabBar */}
        <div style={{ display: 'flex', borderBottom: '2px solid #E5E7EB', padding: '0 4px' }}>
          {campIds.map(id => {
            const isActive  = id === activeTab;
            const isCurrent = id === student.history.current_camp_id;
            const campName  = campMap[id]?.name ?? id;
            return (
              <button key={id} onClick={() => setActiveTab(id)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '14px 16px 0', background: 'none', border: 'none', cursor: 'pointer',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: isActive ? '#4173F5' : '#73808F', fontFamily: 'var(--font-en)', whiteSpace: 'nowrap' }}>{campName}</span>
                  {isCurrent && (
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#E5F7ED', color: '#16A34A', fontFamily: 'var(--font-ko)', fontWeight: 500, whiteSpace: 'nowrap' }}>참여중</span>
                  )}
                </div>
                <div style={{ width: '100%', height: 2, borderRadius: 1, background: isActive ? '#4173F5' : 'transparent' }} />
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
                  <span style={{ fontSize: 12, color: '#73808F', fontFamily: 'var(--font-ko)' }}>강사</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {camp.teachers?.map(t => <Pill key={t} label={t} />) ?? <span style={{ fontSize: 14, color: '#21262E' }}>-</span>}
                  </div>
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
                        {['픽업', '드랍', '없음'].map(o => <option key={o} value={o}>{o}</option>)}
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
