// 캠프 상세 페이지 — Figma 496:2735
import { useState, useEffect, useRef } from 'react';
import type { CampTab, Camp } from '../App';
import CampUserBoardPage from './CampUserBoardPage';
import CampTimetableEdit from './CampTimetableEdit';
import type { TimetableEditHandle } from './CampTimetableEdit';
import CampAccommodationTab from './CampAccommodationTab';
import CampStaffTab from './CampStaffTab';
import CampClassTab, { loadClasses } from './CampClassTab';
import type { ClassLevel } from './CampClassTab';
import type { Student } from './StudentBoardPage';


function isoToDisplay(iso: string) {
  return iso.length >= 10 ? iso.slice(2).replace(/-/g, '/') : iso;
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  '진행중': { bg: 'var(--color-success-light)', color: 'var(--color-success)' },
  '준비중': { bg: 'var(--color-primary-bg)',                    color: 'var(--color-primary)' },
  '종료':   { bg: 'var(--color-bg-subtle)',                    color: 'var(--color-ink-soft)' },
};

function TagList({ items, color }: { items: string[]; color: string }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {items.map((item, i) => (
        <span key={i} className="ew-tag" style={{ background: color === 'var(--color-primary)' ? 'var(--color-primary-light)' : 'var(--color-primary-bg)', color, fontFamily: 'var(--font-ko)', fontSize: 12 }}>
          {item}
        </span>
      ))}
    </div>
  );
}

function InfoItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', minWidth: 0 }}>
      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--color-ink-soft)', letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase' }}>{label}</span>
      <div style={{ fontSize: 'var(--text-md)', color: 'var(--color-ink-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{children}</div>
    </div>
  );
}

const TABS: CampTab[] = ['Students', 'Accommodation', 'Staff', 'Class', 'Timetable'];

export default function CampDetailPage({
  camps, campId, activeTab, onTabChange, onBack, onEdit, students, onStudentUpdate, onCampUpdate, onCampDelete, onStudentClick, agents = [],
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
  onCampDelete?: (campId: string) => void;
  onStudentClick?: (studentId: string) => void;
  agents?: { id: string; name: string }[];
}) {
  const camp = camps.find(c => c.id === campId);

  const [classes,                setClasses]                = useState<ClassLevel[]>(() => loadClasses(campId));
  const [activeTimetableClassId, setActiveTimetableClassId] = useState<string | null>(() => {
    const cls = loadClasses(campId);
    return cls.length > 0 ? cls[0].id : null;
  });
  const timetableEditRef = useRef<TimetableEditHandle>(null);

  // Re-sync classes when switching to Timetable tab
  useEffect(() => {
    if (activeTab === 'Timetable') {
      const fresh = loadClasses(campId);
      setClasses(fresh);
      if (fresh.length > 0 && !fresh.find(c => c.id === activeTimetableClassId)) {
        setActiveTimetableClassId(fresh[0].id);
      }
    }
  }, [activeTab]);

  function handleTabSwitch(tab: CampTab) {
    if (tab === activeTab) return;
    onTabChange(tab);
  }

  const statusStyle = STATUS_STYLE[camp?.status ?? ''] ?? { bg: 'var(--color-bg-subtle)', color: 'var(--color-ink-soft)' };

  return (
    <div style={{ minWidth: 1440 }}>

      {/* 상단 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--page-px)', borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-canvas)' }}>
        <button
          className="ew-btn ew-btn--ghost ew-btn--sm"
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}
        >
          <img src="/icon/arrow_fill_left.svg" alt="" style={{ width: 14, height: 14 }} />
          캠프 목록
        </button>
        <div style={{ width: 1, height: 20, background: 'var(--color-border-subtle)' }} />
        <span style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--color-ink-strong)', letterSpacing: 'var(--tracking-tight)', flex: 1 }}>
          캠프 상세
        </span>
        {onEdit && (
          <button className="ew-btn ew-btn--secondary ew-btn--sm" onClick={onEdit}>정보 수정</button>
        )}
        <button className="ew-btn ew-btn--danger ew-btn--sm" onClick={() => {
          if (!onCampDelete) return;
          const enrolledCount = (students ?? []).filter(s => s.history.current_camp_id === campId).length;
          if (enrolledCount > 0) {
            alert(`등록된 학생 ${enrolledCount}명이 있습니다.\n학생을 모두 제거한 후 삭제할 수 있습니다.`);
            return;
          }
          if (window.confirm(`'${camp?.name}' 캠프를 삭제합니다.\n시간표, 숙소, 스탭 등 모든 데이터가 삭제됩니다.\n계속하시겠습니까?`)) {
            onCampDelete(campId);
          }
        }}>정보삭제</button>
      </div>

      <div style={{ padding: 'var(--space-6) var(--page-px)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

        {camp ? (
          <>
            {/* 캠프 기본 정보 카드 */}
            <div style={{ background: 'var(--color-canvas)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5) var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', boxShadow: 'var(--shadow-soft)' }}>
              <div style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--color-ink-strong)', letterSpacing: 'var(--tracking-tight)' }}>캠프 기본 정보</div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--space-6)' }}>
                <InfoItem label="캠프명">
                  <span style={{ fontWeight: 600, fontSize: 'var(--text-lg)', color: 'var(--color-ink-strong)' }}>{camp.name}</span>
                </InfoItem>
                <InfoItem label="캠프코드">
                  <span style={{ fontFamily: 'var(--font-mono)', fontFeatureSettings: '"tnum" 1' }}>{camp.id}</span>
                </InfoItem>
                <InfoItem label="기간">
                  <span style={{ fontFamily: 'var(--font-mono)', fontFeatureSettings: '"tnum" 1' }}>
                    {isoToDisplay(camp.start_date)} ~ {isoToDisplay(camp.end_date)}
                  </span>
                </InfoItem>
                <InfoItem label="지역">{camp.location}</InfoItem>
                <InfoItem label="숙소">{camp.accommodation}</InfoItem>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--space-6)' }}>
                <InfoItem label="스탭">
                  <TagList items={camp.staff} color="var(--color-primary)" />
                </InfoItem>
                <InfoItem label="정원">
                  <span style={{ fontFamily: 'var(--font-mono)', fontFeatureSettings: '"tnum" 1' }}>{camp.capacity}<span style={{ color: 'var(--color-ink-soft)', marginLeft: 2 }}>명</span></span>
                </InfoItem>
                <InfoItem label="상태">
                  <span className="ew-tag" style={{ background: statusStyle.bg, color: statusStyle.color }}>
                    {camp.status}
                  </span>
                </InfoItem>
                <div /><div />
              </div>
            </div>

            {/* 탭 */}
            <div style={{ background: 'var(--color-canvas)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div className="ew-tab-bar" style={{ padding: '0 var(--space-3)' }}>
                {TABS.map(tab => {
                  const disabled = tab === 'Timetable' && classes.length === 0;
                  return (
                    <button
                      key={tab}
                      onClick={() => !disabled && handleTabSwitch(tab)}
                      disabled={disabled}
                      title={disabled ? '클래스를 먼저 추가해주세요' : undefined}
                      className={`ew-tab${activeTab === tab ? ' active' : ''}`}
                      style={{ opacity: disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>

              <div>
                {activeTab === 'Students' && (
                  <CampUserBoardPage
                    campId={campId}
                    students={students}
                    onStudentUpdate={onStudentUpdate}
                    onStudentClick={onStudentClick}
                    agents={agents}
                  />
                )}

                {activeTab === 'Accommodation' && (
                  <CampAccommodationTab
                    campId={campId}
                    onHotelsChange={hotels => {
                      if (!camp || !onCampUpdate) return;
                      const primaryName = hotels.find(h => h.name.trim())?.name ?? camp.accommodation;
                      if (primaryName !== camp.accommodation) onCampUpdate({ ...camp, accommodation: primaryName });
                    }}
                  />
                )}

                {activeTab === 'Staff' && (
                  <CampStaffTab
                    campId={campId}
                    onStaffChange={staffNames => {
                      if (!camp || !onCampUpdate) return;
                      onCampUpdate({ ...camp, staff: staffNames });
                    }}
                  />
                )}

                {activeTab === 'Class' && (
                  <CampClassTab
                    campId={campId}
                    students={students}
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
                      campId={campId}
                      classId={activeTimetableClassId ?? undefined}
                      startDate={camp?.start_date}
                      endDate={camp?.end_date}
                      onDateRangeChange={(s, e) => {
                        if (!camp || !onCampUpdate) return;
                        onCampUpdate({ ...camp, start_date: s, end_date: e });
                      }}
                    />
                  </div>
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
