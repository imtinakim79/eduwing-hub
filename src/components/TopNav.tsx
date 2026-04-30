// TopNav — 피그마 node 49:5613 / 472:5113 기반
// 데스크톱(1024px+): 가로 nav. 모바일/태블릿(1024px 미만): 햄버거 + 슬라이드 사이드바.
import { useEffect, useState } from 'react';

type NavItem = { label: string; key: string };

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', key: 'dashboard' },
  { label: '학생관리',   key: 'students' },
  { label: '캠프관리',   key: 'camps' },
  { label: 'Agent',     key: 'agent' },
  { label: '게시판',    key: 'board' },
  { label: '계정관리',  key: 'account' },
];

interface TopNavProps {
  activePage: string;
  onNavigate: (key: string) => void;
}

export default function TopNav({ activePage, onNavigate }: TopNavProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 사이드바 열렸을 때 ESC로 닫기 + body 스크롤 잠금
  useEffect(() => {
    if (!sidebarOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSidebarOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [sidebarOpen]);

  function handleNav(key: string) {
    setSidebarOpen(false);
    onNavigate(key);
  }

  function Logo({ className }: { className?: string }) {
    return (
      <div className={className} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <img src="/image/EDUWING WORLD_LOGO 34 3-1.png" alt="" style={{ height: 32, objectFit: 'contain' }} />
        <img src="/image/EDUWING WORLD_LOGO 34 4.png" alt="EduWing World" style={{ height: 18, objectFit: 'contain' }} />
      </div>
    );
  }

  function IconButton({ kind, active, ariaLabel, onClick }: {
    kind: 'settings' | 'notification';
    active: boolean;
    ariaLabel: string;
    onClick?: () => void;
  }) {
    const [hover, setHover] = useState(false);
    const src = active
      ? `/icon/${kind}_selected.svg`
      : hover
        ? `/icon/${kind}_hover.svg`
        : `/icon/${kind}.svg`;
    return (
      <button
        aria-label={ariaLabel}
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          height: 32, width: 32, display: 'inline-flex',
          alignItems: 'center', justifyContent: 'center',
          borderRadius: 'var(--radius-sm)',
          transition: 'background var(--dur-fast) var(--ease-out)',
        }}
      >
        <img src={src} alt="" style={{ width: 22, height: 22 }} />
      </button>
    );
  }

  const RightActions = (
    <div className="ew-nav__right" style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center', flexShrink: 0, justifyContent: 'flex-end' }}>
      <IconButton
        kind="settings"
        ariaLabel="Settings"
        active={activePage === 'account'}
        onClick={() => handleNav('account')}
      />
      <IconButton
        kind="notification"
        ariaLabel="Notifications"
        active={false}
      />
      <div style={{ width: 1, height: 20, background: 'var(--color-border-subtle)' }} />
      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
        <img src="/image/thumb=Avatar56.png" alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
        <div className="ew-nav__user-text" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
          <span style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--color-ink-strong)', letterSpacing: 'var(--tracking-tight)' }}>
            김가영
          </span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-soft)', letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase' }}>
            Master
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <nav className="ew-nav" style={{ justifyContent: 'space-between' }}>
        {/* Mobile menu button (data-mobile-only via CSS) */}
        <button
          className="ew-mobile-menu-btn ew-nav__hamburger"
          aria-label="메뉴 열기"
          onClick={() => setSidebarOpen(true)}
        >
          <span /><span /><span />
        </button>

        <Logo className="ew-nav__logo" />

        {/* Desktop nav links */}
        <div className="ew-nav__links" style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`ew-nav-menu${activePage === item.key ? ' active' : ''}`}
              style={{ background: 'none', border: 'none' }}
              onClick={() => handleNav(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {RightActions}
      </nav>

      {/* Mobile sidebar + backdrop */}
      <div
        className="ew-nav-backdrop"
        data-open={sidebarOpen}
        onClick={() => setSidebarOpen(false)}
        aria-hidden
      />
      <aside
        className="ew-nav-sidebar"
        data-open={sidebarOpen}
        aria-hidden={!sidebarOpen}
      >
        <div className="ew-nav-sidebar__header">
          <Logo />
          <button
            aria-label="메뉴 닫기"
            className="ew-nav-sidebar__close"
            onClick={() => setSidebarOpen(false)}
          >
            ✕
          </button>
        </div>
        <div className="ew-nav-sidebar__menu">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`ew-nav-sidebar__item${activePage === item.key ? ' active' : ''}`}
              onClick={() => handleNav(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </aside>
    </>
  );
}
