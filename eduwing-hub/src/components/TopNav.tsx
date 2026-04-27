// TopNav — 피그마 node 49:5613 / 472:5113 기반


type NavItem = { label: string; key: string };

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', key: 'dashboard' },
  { label: '학생관리',   key: 'students' },
  { label: '캠프관리',   key: 'camps' },
  { label: 'Agent',     key: 'agent' },
  { label: '게시판',    key: 'board' },
  { label: '계정관리',  key: 'account' },
  { label: '🎨 Gallery', key: 'gallery' },
];

interface TopNavProps {
  activePage: string;
  onNavigate: (key: string) => void;
}

export default function TopNav({ activePage, onNavigate }: TopNavProps) {
  return (
    <nav className="ew-nav" style={{ justifyContent: 'space-between', minWidth: 1440 }}>
      {/* Logo */}
      <div style={{ flexShrink: 0, width: 180 }}>
        <img
          src="/image/EDUWING WORLD_LOGO 34 3-1.png"
          alt="EduWing World"
          style={{ height: 38, objectFit: 'contain' }}
        />
      </div>

      {/* Nav links */}
      <div style={{ display: 'flex', gap: 60, alignItems: 'center', flex: 1, justifyContent: 'center' }}>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            className={`ew-nav-menu${activePage === item.key ? ' active' : ''}`}
            style={{ background: 'none', border: 'none', padding: 0 }}
            onClick={() => onNavigate(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Right: settings, notifications, user */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexShrink: 0, width: 280, justifyContent: 'flex-end' }}>
        <button style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
          <img src="/icon/settings.svg" alt="Settings" style={{ width: 32, height: 32 }} />
        </button>
        <button style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
          <img src="/icon/notification.svg" alt="Notifications" style={{ width: 32, height: 32 }} />
        </button>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <img
            src="/image/thumb=Avatar56.png"
            alt="avatar"
            style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
          />
          <div style={{ lineHeight: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 500, fontFamily: 'var(--font-ko)', color: 'var(--color-text-primary)' }}>
              김가영
            </div>
            <div style={{ fontSize: 13, color: '#717171', fontFamily: 'var(--font-ko)' }}>
              Master
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
