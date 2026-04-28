// 대시보드 페이지
import { useMemo } from 'react';
import type { Camp } from '../App';
import type { Student } from './StudentBoardPage';
import type { Agent } from './AgentBoardPage';

interface Props {
  students: Student[];
  camps: Camp[];
  agents: Agent[];
  onNavigate: (page: string, options?: { campId?: string; studentId?: string }) => void;
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  '진행중': { bg: 'var(--color-success-light)', color: 'var(--color-success)' },
  '준비중': { bg: '#EEF3FD',                    color: '#2F6FED' },
  '종료':   { bg: '#F3F4F6',                    color: '#6B7280' },
};

const ASSIGN_LABEL: Record<string, { bg: string; color: string; text: string }> = {
  assigned:   { bg: 'var(--color-success-light)', color: 'var(--color-success)', text: '캠프 배정됨' },
  preparing:  { bg: '#EEF3FD',                    color: '#2F6FED',              text: '준비중 캠프' },
  unassigned: { bg: '#F3F4F6',                    color: '#6B7280',              text: '미배정' },
};

function KpiCard({ label, value, sub, onClick }: { label: string; value: number | string; sub?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        flex: 1, background: '#fff', border: '1px solid var(--color-border-table)',
        borderRadius: 8, padding: '20px 24px', cursor: onClick ? 'pointer' : 'default',
        display: 'flex', flexDirection: 'column', gap: 8,
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
    >
      <div style={{ fontSize: 13, color: 'var(--color-text-sub)', fontFamily: 'var(--font-ko)' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-en)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-ko)' }}>{sub}</div>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-ko)', marginBottom: 12 }}>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13, fontFamily: 'var(--font-ko)' }}>
      {text}
    </div>
  );
}

export default function DashboardPage({ students, camps, agents, onNavigate }: Props) {
  // KPI
  const activeCampCount   = useMemo(() => camps.filter(c => c.status === '진행중').length, [camps]);
  const assignedCount     = useMemo(() => students.filter(s => s.history.current_camp_id).length, [students]);

  // 캠프 현황: 진행중 → 준비중 순
  const activeCamps = useMemo(() =>
    [...camps]
      .filter(c => c.status === '진행중' || c.status === '준비중')
      .sort((a, b) => (a.status === b.status ? 0 : a.status === '진행중' ? -1 : 1)),
  [camps]);

  // 학생 현황: 최근 등록순 10명
  const recentStudents = useMemo(() =>
    [...students]
      .sort((a, b) => (b.history.joined_date ?? '').localeCompare(a.history.joined_date ?? ''))
      .slice(0, 10),
  [students]);

  // 에이전시별 학생 수
  const agentStats = useMemo(() =>
    agents.map(a => ({
      ...a,
      count: students.filter(s => s.history.agent_id === a.id).length,
    })).sort((a, b) => b.count - a.count),
  [agents, students]);

  function getAssignLabel(s: Student) {
    const campId = s.history.current_camp_id;
    if (!campId) return ASSIGN_LABEL.unassigned;
    const camp = camps.find(c => c.id === campId);
    if (camp?.status === '준비중') return ASSIGN_LABEL.preparing;
    return ASSIGN_LABEL.assigned;
  }

  function formatDate(iso: string) {
    if (!iso || iso.length < 10) return '-';
    return iso.slice(2).replace(/-/g, '/');
  }

  const thStyle: React.CSSProperties = {
    padding: '10px 16px', fontSize: 12, fontWeight: 600,
    color: 'var(--color-text-sub)', fontFamily: 'var(--font-ko)',
    borderBottom: '1px solid var(--color-border-table)',
    background: '#F9FAFB', textAlign: 'left', whiteSpace: 'nowrap',
  };
  const tdStyle: React.CSSProperties = {
    padding: '12px 16px', fontSize: 13, fontFamily: 'var(--font-ko)',
    color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border-table)',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={{ padding: '24px 30px', display: 'flex', flexDirection: 'column', gap: 24, minWidth: 1440, overflowX: 'auto' }}>

      {/* KPI 카드 */}
      <div style={{ display: 'flex', gap: 16 }}>
        <KpiCard label="전체 학생" value={students.length} sub="명" onClick={() => onNavigate('students')} />
        <KpiCard label="진행중 캠프" value={activeCampCount} sub="개" onClick={() => onNavigate('camps')} />
        <KpiCard label="캠프 배정 학생" value={assignedCount} sub={`/ ${students.length}명`} onClick={() => onNavigate('camps')} />
        <KpiCard label="에이전시" value={agents.length} sub="개사" onClick={() => onNavigate('agent')} />
      </div>

      <div style={{ display: 'flex', gap: 20 }}>

        {/* 캠프별 현황 */}
        <div style={{ flex: 2, background: '#fff', border: '1px solid var(--color-border-table)', borderRadius: 8, padding: '20px 24px' }}>
          <SectionTitle>캠프 현황</SectionTitle>
          {activeCamps.length === 0 ? (
            <Empty text="진행중이거나 준비중인 캠프가 없습니다" />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['캠프명', '지역', '기간', '정원', '상태'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                  <th style={{ ...thStyle, width: 160 }}>등록 현황</th>
                </tr>
              </thead>
              <tbody>
                {activeCamps.map(camp => {
                  const enrolled = students.filter(s => s.history.current_camp_id === camp.id).length;
                  const pct = camp.capacity > 0 ? Math.round((enrolled / camp.capacity) * 100) : 0;
                  const st = STATUS_STYLE[camp.status] ?? STATUS_STYLE['종료'];
                  return (
                    <tr
                      key={camp.id}
                      onClick={() => onNavigate('campDetail', { campId: camp.id })}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#F9FAFB'}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                    >
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{camp.name}</td>
                      <td style={tdStyle}>{camp.location}</td>
                      <td style={{ ...tdStyle, fontFamily: 'var(--font-en)', fontSize: 12 }}>
                        {camp.start_date && camp.end_date
                          ? `${formatDate(camp.start_date)} ~ ${formatDate(camp.end_date)}`
                          : '-'}
                      </td>
                      <td style={tdStyle}>{camp.capacity}명</td>
                      <td style={tdStyle}>
                        <span style={{ ...st, padding: '2px 8px', borderRadius: 10, fontSize: 12, fontFamily: 'var(--font-ko)' }}>
                          {camp.status}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: pct >= 90 ? '#EF4444' : pct >= 60 ? '#F59E0B' : 'var(--color-primary)', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 12, color: 'var(--color-text-sub)', minWidth: 52 }}>{enrolled} / {camp.capacity}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* 에이전시별 학생 수 */}
        <div style={{ flex: 1, background: '#fff', border: '1px solid var(--color-border-table)', borderRadius: 8, padding: '20px 24px' }}>
          <SectionTitle>에이전시별 학생 현황</SectionTitle>
          {agentStats.length === 0 ? (
            <Empty text="등록된 에이전시가 없습니다" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {agentStats.map(a => (
                <div
                  key={a.id}
                  onClick={() => onNavigate('agent')}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '4px 0' }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.opacity = '0.7'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.opacity = '1'}
                >
                  <span style={{ flex: 1, fontSize: 13, fontFamily: 'var(--font-ko)', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name || '(미입력)'}</span>
                  <div style={{ width: 100, height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}>
                    <div style={{ width: agentStats[0].count > 0 ? `${(a.count / agentStats[0].count) * 100}%` : '0%', height: '100%', background: 'var(--color-primary)', borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-en)', minWidth: 24, textAlign: 'right' }}>{a.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 최근 등록 학생 */}
      <div style={{ background: '#fff', border: '1px solid var(--color-border-table)', borderRadius: 8, padding: '20px 24px' }}>
        <SectionTitle>최근 등록 학생</SectionTitle>
        {recentStudents.length === 0 ? (
          <Empty text="등록된 학생이 없습니다" />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['이름', '성별', '등록일', '에이전시', '배정 상태'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentStudents.map(s => {
                const label = getAssignLabel(s);
                const agentName = agents.find(a => a.id === s.history.agent_id)?.name ?? '-';
                return (
                  <tr
                    key={s.id}
                    onClick={() => onNavigate('studentDetail', { studentId: s.id })}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#F9FAFB'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                  >
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{s.name_ko} <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-en)', fontWeight: 400 }}>{s.name_en}</span></td>
                    <td style={tdStyle}>{s.gender === 'Male' ? '남' : s.gender === 'Female' ? '여' : '-'}</td>
                    <td style={{ ...tdStyle, fontFamily: 'var(--font-en)' }}>{formatDate(s.history.joined_date)}</td>
                    <td style={tdStyle}>{agentName}</td>
                    <td style={tdStyle}>
                      <span style={{ background: label.bg, color: label.color, padding: '2px 8px', borderRadius: 10, fontSize: 12 }}>
                        {label.text}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
