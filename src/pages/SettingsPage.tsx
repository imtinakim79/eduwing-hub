// 설정 페이지 — 계정 관리 + 휴지통
import { useState } from 'react';
import type { Student } from './StudentBoardPage';

type SettingsTab = 'account' | 'trash';

interface AdminAccount {
  id: string;
  name: string;
  email: string;
  role: '마스터' | '서브마스터' | '스탭';
  avatarUrl?: string;
}

const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  '마스터':    { bg: '#FEF3C7', color: '#92400E' },
  '서브마스터': { bg: '#EEF3FD', color: '#2F6FED' },
  '스탭':      { bg: '#F3F4F6', color: '#6B7280' },
};

// 현재는 목업 — Supabase 연동 후 실제 계정으로 교체
const MOCK_ACCOUNTS: AdminAccount[] = [
  { id: '1', name: '김가영', email: 'imtinakim@gmail.com', role: '마스터', avatarUrl: '/image/thumb=Avatar56.png' },
];

function formatDate(iso: string) {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

interface Props {
  trashedStudents: (Student & { deletedAt: string })[];
  onRestore: (ids: string[]) => void;
  onPermanentDelete: (ids: string[]) => void;
}

export default function SettingsPage({ trashedStudents, onRestore, onPermanentDelete }: Props) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [selected,  setSelected]  = useState<Set<string>>(new Set());
  const [query,     setQuery]     = useState('');

  function toggleRow(id: string) {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(filtered.map(s => s.id)) : new Set());
  }

  const filtered = trashedStudents.filter(s =>
    !query || s.name_ko.includes(query) || s.name_en.toLowerCase().includes(query.toLowerCase())
  );
  const allChecked = filtered.length > 0 && filtered.every(s => selected.has(s.id));

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
    <div style={{ padding: '24px 30px'}}>

      {/* 탭 */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border-table)', marginBottom: 24 }}>
        {([['account', '계정 관리'], ['trash', '휴지통']] as [SettingsTab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => { setActiveTab(key); setSelected(new Set()); setQuery(''); }}
            style={{
              padding: '12px 24px', fontSize: 14, fontFamily: 'var(--font-ko)',
              fontWeight: activeTab === key ? 600 : 400,
              color: activeTab === key ? 'var(--color-primary)' : 'var(--color-text-sub)',
              background: 'none', border: 'none',
              borderBottom: activeTab === key ? '2px solid var(--color-primary)' : '2px solid transparent',
              cursor: 'pointer', marginBottom: -1,
            }}>
            {label}
            {key === 'trash' && trashedStudents.length > 0 && (
              <span style={{ marginLeft: 6, background: '#EF4444', color: '#fff', borderRadius: 10, fontSize: 11, padding: '1px 6px' }}>
                {trashedStudents.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── 계정 관리 탭 ── */}
      {activeTab === 'account' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* 안내 배너 */}
          <div style={{ background: '#FEF9C3', border: '1px solid #FDE68A', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#92400E', fontFamily: 'var(--font-ko)' }}>
            ⚠ 실제 로그인 및 권한 제어는 Supabase 연동 후 적용됩니다. 현재는 UI 미리보기 상태입니다.
          </div>

          {/* 계정 목록 */}
          <div style={{ background: '#fff', border: '1px solid var(--color-border-table)', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--color-border-table)' }}>
              <span style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-ko)', color: 'var(--color-text-primary)' }}>어드민 계정</span>
              <button className="ew-btn ew-btn--primary ew-btn--sm" disabled style={{ opacity: 0.4, cursor: 'not-allowed' }}>+ 계정 초대</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['이름', '이메일', '권한', ''].map(h => <th key={h} style={thStyle}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {MOCK_ACCOUNTS.map(acc => {
                  const rs = ROLE_STYLE[acc.role] ?? ROLE_STYLE['스탭'];
                  return (
                    <tr key={acc.id}>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {acc.avatarUrl && <img src={acc.avatarUrl} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} alt="" />}
                          <span style={{ fontWeight: 600 }}>{acc.name}</span>
                        </div>
                      </td>
                      <td style={{ ...tdStyle, fontFamily: 'var(--font-en)' }}>{acc.email}</td>
                      <td style={tdStyle}>
                        <span style={{ ...rs, padding: '3px 10px', borderRadius: 10, fontSize: 12 }}>{acc.role}</span>
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--color-text-muted)', fontSize: 12 }}>
                        {acc.role === '마스터' ? '마스터 이양 가능 (Supabase 연동 후)' : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 권한 설명 */}
          <div style={{ background: '#fff', border: '1px solid var(--color-border-table)', borderRadius: 8, padding: '20px 24px' }}>
            <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-ko)', color: 'var(--color-text-primary)', marginBottom: 14 }}>권한 안내</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['기능', '마스터', '서브마스터', '스탭'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {[
                  ['데이터 열람', '✅', '✅', '✅'],
                  ['데이터 편집/삭제', '✅', '✅', '❌'],
                  ['계정 초대', '✅', '✅', '❌'],
                  ['권한 변경', '✅', '✅', '❌'],
                  ['마스터 이양', '✅', '❌', '❌'],
                ].map(([feature, ...vals]) => (
                  <tr key={feature}>
                    <td style={tdStyle}>{feature}</td>
                    {vals.map((v, i) => <td key={i} style={{ ...tdStyle, textAlign: 'center' }}>{v}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 휴지통 탭 ── */}
      {activeTab === 'trash' && (
        <div style={{ background: '#fff', border: '1px solid var(--color-border-table)', borderRadius: 8 }}>

          {/* 액션 바 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--color-border-table)', background: '#FAFBFF' }}>
            <input
              type="text" placeholder="이름 검색" value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ height: 32, padding: '0 10px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, fontFamily: 'var(--font-ko)', outline: 'none', width: 200 }}
            />
            <span style={{ flex: 1, fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-ko)' }}>
              {selected.size > 0 ? `${selected.size}명 선택됨` : `총 ${trashedStudents.length}명`}
            </span>
            {selected.size > 0 && (
              <>
                <button className="ew-btn ew-btn--primary ew-btn--sm" onClick={() => { onRestore(Array.from(selected)); setSelected(new Set()); }}>복구</button>
                <button className="ew-btn ew-btn--danger ew-btn--sm" onClick={() => {
                  if (window.confirm(`선택한 ${selected.size}명을 영구 삭제합니다. 이 작업은 되돌릴 수 없습니다. 계속하시겠습니까?`)) {
                    onPermanentDelete(Array.from(selected));
                    setSelected(new Set());
                  }
                }}>영구 삭제</button>
              </>
            )}
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13, fontFamily: 'var(--font-ko)' }}>
              {query ? '검색 결과가 없습니다' : '휴지통이 비어있습니다'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: 40, textAlign: 'center' }}>
                    <input type="checkbox" className="ew-checkbox" checked={allChecked} onChange={e => toggleAll(e.target.checked)} />
                  </th>
                  {['이름', '성별', '에이전시', '삭제일'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <input type="checkbox" className="ew-checkbox" checked={selected.has(s.id)} onChange={() => toggleRow(s.id)} />
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 600 }}>{s.name_ko}</span>
                      <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-en)', marginLeft: 6 }}>{s.name_en}</span>
                    </td>
                    <td style={tdStyle}>{s.gender === 'Male' ? '남' : s.gender === 'Female' ? '여' : '-'}</td>
                    <td style={tdStyle}>{s.history?.agent_id || '-'}</td>
                    <td style={{ ...tdStyle, fontFamily: 'var(--font-en)', color: 'var(--color-text-muted)' }}>{formatDate(s.deletedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
