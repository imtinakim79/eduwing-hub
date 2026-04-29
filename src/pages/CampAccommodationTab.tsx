// 숙박정보 탭 — 캠프 관리자가 호텔/룸타입 설정
// 저장: localStorage ew-hotels-{campId}
// StudentDetailPage Hotel Info에서 이 데이터를 읽어 룸타입 옵션으로 사용
import { useEffect } from 'react';
import { useDirtyForm } from '../hooks/useDirtyForm';
import { useDirtyGuard } from '../hooks/useDirtyGuard';

export interface RoomType {
  id: string;
  name: string;
  extraBed: boolean;
}
export interface Hotel {
  id: string;
  name: string;
  roomTypes: RoomType[];
  invoiceEnabled: boolean;
}

function uid() { return Math.random().toString(36).slice(2, 9); }

export function loadHotels(campId: string): Hotel[] {
  try { const r = localStorage.getItem(`ew-hotels-${campId}`); return r ? JSON.parse(r) : []; }
  catch { return []; }
}
function saveHotels(campId: string, hotels: Hotel[]) {
  try { localStorage.setItem(`ew-hotels-${campId}`, JSON.stringify(hotels)); } catch {}
}

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{ width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', background: value ? 'var(--color-primary)' : '#D1D5DB', position: 'relative', padding: 0, flexShrink: 0 }}
    >
      <span style={{ position: 'absolute', top: 2, left: value ? 16 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.15s' }} />
    </button>
  );
}

// ── X button ─────────────────────────────────────────────────────────────────
function XBtn({ onClick, title }: { onClick: () => void; title?: string }) {
  return (
    <button
      onClick={onClick} title={title}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 14, padding: '2px 6px', borderRadius: 4, lineHeight: 1 }}
    >✕</button>
  );
}

// ── Completed read-only view ──────────────────────────────────────────────────
export function HotelCompletedView({ campId }: { campId: string }) {
  const hotels = loadHotels(campId);
  if (!hotels.length) {
    return (
      <div style={{ padding: '24px', color: 'var(--color-text-muted)', fontSize: 13, fontFamily: 'var(--font-ko)' }}>
        등록된 호텔이 없습니다.
      </div>
    );
  }
  return (
    <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {hotels.map((hotel, idx) => (
        <div key={hotel.id} style={{ border: '1px solid var(--color-border-table)', borderRadius: 8, padding: '12px 16px', background: '#FAFBFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: hotel.roomTypes.length ? 10 : 0 }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-ko)', minWidth: 18, textAlign: 'center' }}>{idx + 1}</span>
            <span style={{ fontWeight: 600, fontSize: 14, fontFamily: 'var(--font-ko)', color: 'var(--color-text-primary)' }}>
              {hotel.name || '(이름 없음)'}
            </span>
            {hotel.invoiceEnabled && (
              <span className="ew-tag" style={{ background: '#EEF3FD', color: '#2F6FED', fontSize: 11, fontFamily: 'var(--font-ko)' }}>
                인보이스 발행
              </span>
            )}
          </div>
          {hotel.roomTypes.length > 0 && (
            <div style={{ marginLeft: 26, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {hotel.roomTypes.map(r => (
                <span key={r.id} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 10px', borderRadius: 20, fontSize: 12, fontFamily: 'var(--font-ko)',
                  background: '#F3F4F6', color: 'var(--color-text-sub)',
                }}>
                  {r.name || '(이름 없음)'}
                  {r.extraBed && <span style={{ color: 'var(--color-primary)', fontSize: 11 }}>· 엑스트라베드</span>}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function CampAccommodationTab({ campId, onHotelsChange }: { campId?: string; onHotelsChange?: (hotels: Hotel[]) => void }) {
  type HotelsForm = { hotels: Hotel[] };
  const form = useDirtyForm<HotelsForm>({ hotels: campId ? loadHotels(campId) : [] });
  const hotels = form.draft.hotels;
  const setHotels = (action: React.SetStateAction<Hotel[]>) => {
    form.setDraft(prev => ({
      hotels: typeof action === 'function' ? (action as (p: Hotel[]) => Hotel[])(prev.hotels) : action,
    }));
  };
  const update = (next: Hotel[]) => setHotels(next);

  // campId 변경 시 sync
  useEffect(() => {
    form.sync({ hotels: campId ? loadHotels(campId) : [] });
  }, [campId]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearGuard = useDirtyGuard('CampAccommodationTab', form.isDirty);

  function handleSave() {
    if (campId) saveHotels(campId, hotels);
    onHotelsChange?.(hotels);
    form.sync({ hotels });
    clearGuard();
  }
  function handleReset() {
    form.setDraft({ hotels: [] });
  }

  const addHotel = () =>
    update([...hotels, { id: uid(), name: '', roomTypes: [], invoiceEnabled: false }]);

  const removeHotel = (hid: string) =>
    update(hotels.filter(h => h.id !== hid));

  function setHotelField<K extends keyof Hotel>(hid: string, field: K, value: Hotel[K]) {
    update(hotels.map(h => h.id === hid ? { ...h, [field]: value } : h));
  }

  const addRoom = (hid: string) =>
    update(hotels.map(h => h.id === hid
      ? { ...h, roomTypes: [...h.roomTypes, { id: uid(), name: '', extraBed: false }] }
      : h));

  const removeRoom = (hid: string, rid: string) =>
    update(hotels.map(h => h.id === hid
      ? { ...h, roomTypes: h.roomTypes.filter(r => r.id !== rid) }
      : h));

  function setRoomField<K extends keyof RoomType>(hid: string, rid: string, field: K, value: RoomType[K]) {
    update(hotels.map(h => h.id === hid
      ? { ...h, roomTypes: h.roomTypes.map(r => r.id === rid ? { ...r, [field]: value } : r) }
      : h));
  }

  return (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* 헤더: 제목 + 액션 버튼 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1D23', fontFamily: 'var(--font-ko)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {form.isDirty && <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-warning)', display: 'inline-block', flexShrink: 0 }} />}
          숙박정보
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
      <div style={{ height: 1, background: '#E2E5EA' }} />

      {hotels.length === 0 && (
        <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 14, fontFamily: 'var(--font-ko)' }}>
          등록된 호텔이 없습니다. 아래 버튼으로 추가하세요.
        </div>
      )}

      {hotels.map((hotel, hIdx) => (
        <div key={hotel.id} style={{ border: '1px solid var(--color-border-table)', borderRadius: 8, padding: '16px 20px', background: '#FAFBFF' }}>

          {/* 호텔 헤더 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', fontFamily: 'var(--font-ko)', width: 18, textAlign: 'center', flexShrink: 0 }}>
              {hIdx + 1}
            </span>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-sub)', fontFamily: 'var(--font-ko)', flexShrink: 0 }}>호텔명</span>
            <input
              value={hotel.name}
              onChange={e => setHotelField(hotel.id, 'name', e.target.value)}
              placeholder="호텔 이름 입력"
              style={{ ...INPUT, flex: 1, maxWidth: 260 }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                className="ew-checkbox"
                checked={hotel.invoiceEnabled}
                onChange={e => setHotelField(hotel.id, 'invoiceEnabled', e.target.checked)}
              />
              <span style={{ fontSize: 13, color: 'var(--color-text-sub)', fontFamily: 'var(--font-ko)' }}>인보이스 발행</span>
            </label>
            <div style={{ flex: 1 }} />
            <XBtn onClick={() => removeHotel(hotel.id)} title="호텔 삭제" />
          </div>

          {/* 룸 타입 */}
          <div style={{ marginLeft: 28, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-ko)', marginBottom: 2 }}>룸 타입</div>

            {hotel.roomTypes.length === 0 && (
              <div style={{ fontSize: 12, color: '#D1D5DB', fontFamily: 'var(--font-ko)', paddingBottom: 4 }}>룸 타입을 추가하세요.</div>
            )}

            {hotel.roomTypes.map(room => (
              <div key={room.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  value={room.name}
                  onChange={e => setRoomField(hotel.id, room.id, 'name', e.target.value)}
                  placeholder="룸 타입 (예: Deluxe TWN)"
                  style={{ ...INPUT, width: 220 }}
                />
                <span style={{ fontSize: 12, color: 'var(--color-text-sub)', fontFamily: 'var(--font-ko)', whiteSpace: 'nowrap' }}>
                  엑스트라 베드
                </span>
                <Toggle value={room.extraBed} onChange={v => setRoomField(hotel.id, room.id, 'extraBed', v)} />
                <span style={{ fontSize: 11, fontFamily: 'var(--font-ko)', color: room.extraBed ? 'var(--color-primary)' : 'var(--color-text-muted)', minWidth: 32 }}>
                  {room.extraBed ? '지원' : '미지원'}
                </span>
                <XBtn onClick={() => removeRoom(hotel.id, room.id)} title="룸 삭제" />
              </div>
            ))}

            <button
              className="ew-btn ew-btn--ghost ew-btn--xsm"
              onClick={() => addRoom(hotel.id)}
              style={{ alignSelf: 'flex-start', marginTop: 2 }}
            >
              + 룸 타입 추가
            </button>
          </div>
        </div>
      ))}

      <button
        className="ew-btn ew-btn--ghost ew-btn--sm"
        onClick={addHotel}
        style={{ alignSelf: 'flex-start' }}
      >
        + 호텔 추가
      </button>

      {hotels.length > 0 && (
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-ko)', margin: 0 }}>
          ※ 엑스트라 베드 <strong>미지원</strong> 룸 타입은 학생 숙박정보 입력 시 해당 항목이 비활성화됩니다.
        </p>
      )}
    </div>
  );
}

const INPUT: React.CSSProperties = {
  height: 36, padding: '0 10px', border: '1px solid #D1D5DB', borderRadius: 6,
  fontSize: 13, fontFamily: 'var(--font-ko)', outline: 'none', background: '#fff', boxSizing: 'border-box',
};
