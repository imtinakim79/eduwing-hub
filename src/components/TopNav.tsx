// TopNav — 피그마 node 49:5613 / 472:5113 기반


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
  return (
    <nav className="ew-nav" style={{ justifyContent: 'space-between' }}>
      {/* Logo */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <img
          src="/image/EDUWING WORLD_LOGO 34 3-1.png"
          alt=""
          style={{ height: 32, objectFit: 'contain' }}
        />
        <img
          src="/image/EDUWING WORLD_LOGO 34 4.png"
          alt="EduWing World"
          style={{ height: 18, objectFit: 'contain' }}
        />
      </div>

      {/* Nav links */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            className={`ew-nav-menu${activePage === item.key ? ' active' : ''}`}
            style={{ background: 'none', border: 'none' }}
            onClick={() => onNavigate(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Right: settings, notifications, user */}
      <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center', flexShrink: 0, justifyContent: 'flex-end' }}>
        <button
          aria-label="Settings"
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', height: 32, width: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => onNavigate('account')}
        >
          <img src="/icon/settings.svg" alt="" style={{ width: 22, height: 22, opacity: 0.75 }} />
        </button>
        <button
          aria-label="Notifications"
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', height: 32, width: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <img src="/icon/notification.svg" alt="" style={{ width: 22, height: 22, opacity: 0.75 }} />
        </button>
        <div style={{ width: 1, height: 20, background: 'var(--color-border-subtle)' }} />
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          <img
            src="/image/thumb=Avatar56.png"
            alt=""
            style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
            <span style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--color-ink-strong)', letterSpacing: 'var(--tracking-tight)' }}>
              김가영
            </span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-soft)', letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase' }}>
              Master
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}
