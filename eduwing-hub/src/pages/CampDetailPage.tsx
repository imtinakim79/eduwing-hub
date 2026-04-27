// 캠프 상세 페이지 — Figma 496:2735
import { useState } from 'react';
import type { CampTab, Camp } from '../App';
import CampUserBoardPage, { CampUserBoardCompleted } from './CampUserBoardPage';
import CampTimetableView from './CampTimetableView';
import CampTimetableEdit from './CampTimetableEdit';
import CampAccommodationTab, { HotelCompletedView } from './CampAccommodationTab';
import CampStaffTab, { StaffCompletedView } from './CampStaffTab';
import TabCard from '../components/TabCard';
import type { Student } from './StudentBoardPage';


function isoToDisplay(iso: string) {
  return iso.length >= 10 ? iso.slice(2).replace(/-/g, '/') : iso;
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  '진행중': { bg: 'var(--color-success-light)', color: 'var(--color-success)' },
  '준비중': { bg: '#EEF3FD',                    color: '#2F6FED' },
  '종료':   { bg: '#F3F4F6',                    color: '#6B7280' },
};

function TagList({ items, color }: { items: string[]; color: string }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {items.map((item, i) => (
        <span key={i} className="ew-tag" style={{ background: color === '#3B82F6' ? '#E0E9FE' : '#EEF3FD', color, fontFamily: 'var(--font-ko)', fontSize: 12 }}>
          {item}
        </span>
      ))}
    </div>
  );
}

function InfoItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-sub)', fontFamily: 'var(--font-ko)' }}>{label}</span>
      <div style={{ fontSize: 14, color: 'var(--color-text-primary)', fontFamily: 'var(--font-ko)' }}>{children}</div>
    </div>
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
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-ko)' }}>
            저장되지 않은 변경사항
          </span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-text-sub)', fontFamily: 'var(--font-ko)', lineHeight: 1.8, margin: '0 0 24px' }}>
          현재 수정 중인 내용이 저장되지 않습니다.<br />
          탭을 이동하시겠습니까?
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="ew-btn ew-btn--ghost ew-btn--sm" onClick={onCancel}>취소</button>
          <button className="ew-btn ew-btn--primary ew-btn--sm" onClick={onConfirm}>이동</button>
        </div>
      </div>
    </div>
  );
}

const TABS: CampTab[] = ['학생명단', '시간표', '숙박정보', '스탭&강사'];

export default function CampDetailPage({
  camps, campId, activeTab, onTabChange, onBack, onEdit, students, onStudentUpdate, onCampUpdate,
}: {
  camps: Camp[];
  campId: string;
  activeTab: CampTab;
  onTabChange: (tab: CampTab) => void;
  onBack: () => void;
  onEdit?: () => void;
  students?: Student[];
  onStudentUpdate?: (s: Student) => void;
  onCampUpdate?: (camp: Camp) => void;
}) {
  const camp = camps.find(c => c.id === campId);
  const [resetKeys,        setResetKeys]        = useState<Record<CampTab, number>>({
    '학생명단': 0, '시간표': 0, '숙박정보': 0, '스탭&강사': 0,
  });
  const [timetableEditing, setTimetableEditing] = useState(false);
  const [tabEditing,       setTabEditing]       = useState<Record<CampTab, boolean>>({
    '학생명단': false, '시간표': false, '숙박정보': false, '스탭&강사': false,
  });
  const [pendingTab,    setPendingTab]    = useState<CampTab | null>(null);
  // 수정 진입 시 데이터 스냅샷 (이동 확인 시 복원)
  const [dataSnapshots, setDataSnapshots] = useState<Partial<Record<CampTab, string | null>>>({});

  // 탭별 auto-save localStorage 키
  const DATA_KEY: Partial<Record<CampTab, string>> = {
    '숙박정보':  `ew-hotels-${campId}`,
    '스탭&강사': `ew-campstaff-${campId}`,
    '시간표':    `ew-timetable-${campId}`,
  };

  function handleTabEditingChange(tab: CampTab, editing: boolean) {
    setTabEditing(prev => ({ ...prev, [tab]: editing }));
    if (editing) {
      const key = DATA_KEY[tab];
      try { setDataSnapshots(prev => ({ ...prev, [tab]: key ? localStorage.getItem(key) : null })); } catch {}
    } else {
      setDataSnapshots(prev => ({ ...prev, [tab]: undefined }));
    }
  }

  // ── 탭 전환 인터셉트 ─────────────────────────────────────────────────────────
  const isEditing = activeTab === '시간표' ? timetableEditing : tabEditing[activeTab];

  function handleTabSwitch(tab: CampTab) {
    if (tab === activeTab) return;
    if (isEditing) { setPendingTab(tab); return; }
    onTabChange(tab);
  }

  function confirmLeave() {
    if (!pendingTab) return;

    if (activeTab === '시간표') {
      // 시간표 데이터 복원
      const snap = dataSnapshots['시간표'];
      try {
        if (snap === undefined || snap === null) localStorage.removeItem(`ew-timetable-${campId}`);
        else localStorage.setItem(`ew-timetable-${campId}`, snap);
      } catch {}
      setTimetableEditing(false);
      setResetKeys(prev => ({ ...prev, '시간표': prev['시간표'] + 1 }));
    } else {
      // 탭 데이터 복원
      const key = DATA_KEY[activeTab];
      const snap = dataSnapshots[activeTab];
      if (key) {
        try {
          if (snap === undefined || snap === null) localStorage.removeItem(key);
          else localStorage.setItem(key, snap);
        } catch {}
      }
      // isDone=true 복원 (수정 완료 상태로 되돌림)
      try {
        const statusKey = `ew-tab-status-${campId}`;
        const s = JSON.parse(localStorage.getItem(statusKey) || '{}');
        s[activeTab] = true;
        localStorage.setItem(statusKey, JSON.stringify(s));
      } catch {}
      setResetKeys(prev => ({ ...prev, [activeTab]: prev[activeTab] + 1 }));
    }

    setTabEditing(prev => ({ ...prev, [activeTab]: false }));
    setDataSnapshots(prev => ({ ...prev, [activeTab]: undefined }));
    onTabChange(pendingTab);
    setPendingTab(null);
  }

  function cancelLeave() { setPendingTab(null); }

  // ── 개별 탭 리셋 ─────────────────────────────────────────────────────────────
  function handleReset(tab: CampTab) {
    if (tab === '시간표')    try { localStorage.removeItem(`ew-timetable-${campId}`); } catch {}
    if (tab === '숙박정보')  try { localStorage.removeItem(`ew-hotels-${campId}`); } catch {}
    if (tab === '스탭&강사') try { localStorage.removeItem(`ew-campstaff-${campId}`); } catch {}
    setResetKeys(prev => ({ ...prev, [tab]: prev[tab] + 1 }));
  }

  const statusStyle = STATUS_STYLE[camp?.status ?? ''] ?? { bg: '#F3F4F6', color: '#6B7280' };

  return (
    <div style={{ minWidth: 1440 }}>
      {pendingTab && <LeaveModal onConfirm={confirmLeave} onCancel={cancelLeave} />}

      {/* 상단 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 30px', borderBottom: '1px solid var(--color-border-table)', background: '#fff' }}>
        <button
          className="ew-btn ew-btn--ghost ew-btn--sm"
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <img src="/icon/arrow_fill_left.svg" alt="" style={{ width: 14, height: 14 }} />
          캠프 목록
        </button>
        <div style={{ width: 1, height: 20, background: 'var(--color-border-table)' }} />
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-ko)', flex: 1 }}>
          캠프 상세
        </span>
        {onEdit && (
          <button className="ew-btn ew-btn--ghost ew-btn--sm" onClick={onEdit}>정보수정</button>
        )}
        <button className="ew-btn ew-btn--danger ew-btn--sm">정보삭제</button>
      </div>

      <div style={{ padding: '24px 30px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {camp ? (
          <>
            {/* 캠프 기본 정보 카드 */}
            <div style={{ background: '#fff', border: '1px solid var(--color-border-table)', borderRadius: 8, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-ko)' }}>캠프 기본 정보</div>

              <div style={{ display: 'flex', gap: 40 }}>
                <InfoItem label="캠프명">
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{camp.name}</span>
                </InfoItem>
                <InfoItem label="캠프코드">
                  <span style={{ fontFamily: 'var(--font-en)' }}>{camp.id}</span>
                </InfoItem>
                <InfoItem label="기간">
                  <span style={{ fontFamily: 'var(--font-en)' }}>
                    {isoToDisplay(camp.start_date)} ~ {isoToDisplay(camp.end_date)}
                  </span>
                </InfoItem>
                <InfoItem label="지역">{camp.location}</InfoItem>
                <InfoItem label="숙소">{camp.accommodation}</InfoItem>
              </div>

              <div style={{ display: 'flex', gap: 40 }}>
                <InfoItem label="스탭">
                  <TagList items={camp.staff} color="#3B82F6" />
                </InfoItem>
                <InfoItem label="강사">
                  <TagList items={camp.teachers} color="#2663D7" />
                </InfoItem>
                <InfoItem label="정원">
                  <span>{camp.capacity}명</span>
                </InfoItem>
                <InfoItem label="상태">
                  <span className="ew-tag" style={{ background: statusStyle.bg, color: statusStyle.color, fontFamily: 'var(--font-ko)', fontSize: 12 }}>
                    {camp.status}
                  </span>
                </InfoItem>
              </div>
            </div>

            {/* 탭 */}
            <div style={{ background: '#fff', border: '1px solid var(--color-border-table)', borderRadius: 8 }}>
              <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border-table)' }}>
                {TABS.map(tab => (
                  <button
                    key={tab}
                    onClick={() => handleTabSwitch(tab)}
                    style={{
                      padding: '12px 20px', fontSize: 14, fontFamily: 'var(--font-ko)',
                      fontWeight: activeTab === tab ? 600 : 400,
                      color: activeTab === tab ? 'var(--color-primary)' : 'var(--color-text-sub)',
                      background: 'none', border: 'none',
                      borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent',
                      cursor: 'pointer', marginBottom: -1,
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div>
                {activeTab === '학생명단' && (
                  <TabCard tab="학생명단" campId={campId} onReset={() => handleReset('학생명단')}
                    completedView={<CampUserBoardCompleted campId={campId} students={students ?? []} />}
                    onEditingChange={e => handleTabEditingChange('학생명단', e)}
                  >
                    <CampUserBoardPage key={resetKeys['학생명단']} campId={campId} students={students} onStudentUpdate={onStudentUpdate} />
                  </TabCard>
                )}

                {activeTab === '시간표' && (
                  timetableEditing ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px', borderBottom: '1px solid var(--color-border-table)', background: '#FAFBFF' }}>
                        <div style={{ flex: 1 }} />
                        <button className="ew-btn ew-btn--ghost ew-btn--sm" onClick={() => {
                          try { localStorage.removeItem(`ew-timetable-${campId}`); } catch {}
                          setResetKeys(prev => ({ ...prev, '시간표': prev['시간표'] + 1 }));
                        }}>초기화</button>
                        <button className="ew-btn ew-btn--primary ew-btn--sm" onClick={() => {
                          setTimetableEditing(false);
                          setTabEditing(prev => ({ ...prev, '시간표': false }));
                        }}>저장</button>
                      </div>
                      <CampTimetableEdit key={resetKeys['시간표']} campId={campId} startDate={camp?.start_date} endDate={camp?.end_date}
                        onDateRangeChange={(s, e) => {
                          if (!camp || !onCampUpdate) return;
                          onCampUpdate({ ...camp, start_date: s, end_date: e });
                        }}
                      />
                    </div>
                  ) : (
                    <CampTimetableView campId={campId} onEdit={() => {
                      setTimetableEditing(true);
                      handleTabEditingChange('시간표', true);
                    }} />
                  )
                )}

                {activeTab === '숙박정보' && (
                  <TabCard tab="숙박정보" campId={campId} onReset={() => handleReset('숙박정보')}
                    completedView={<HotelCompletedView campId={campId} />}
                    onEditingChange={e => handleTabEditingChange('숙박정보', e)}
                  >
                    <CampAccommodationTab key={resetKeys['숙박정보']} campId={campId}
                      onHotelsChange={hotels => {
                        if (!camp || !onCampUpdate) return;
                        const primaryName = hotels.find(h => h.name.trim())?.name ?? camp.accommodation;
                        if (primaryName !== camp.accommodation) onCampUpdate({ ...camp, accommodation: primaryName });
                      }}
                    />
                  </TabCard>
                )}

                {activeTab === '스탭&강사' && (
                  <TabCard tab="스탭&강사" campId={campId} onReset={() => handleReset('스탭&강사')}
                    completedView={<StaffCompletedView campId={campId} />}
                    onEditingChange={e => handleTabEditingChange('스탭&강사', e)}
                  >
                    <CampStaffTab key={resetKeys['스탭&강사']} campId={campId}
                      onStaffChange={(staffNames, teacherNames) => {
                        if (!camp || !onCampUpdate) return;
                        onCampUpdate({ ...camp, staff: staffNames, teachers: teacherNames });
                      }}
                    />
                  </TabCard>
                )}
              </div>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--color-text-muted)', fontSize: 14, fontFamily: 'var(--font-ko)' }}>
            캠프를 찾을 수 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
