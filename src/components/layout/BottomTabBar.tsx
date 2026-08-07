import { NavLink } from 'react-router-dom';

const ALL_TABS = [
  { to: '/', label: 'Home', icon: '🏠', end: true },
  { to: '/clients', label: 'Clients', icon: '👥' },
  { to: '/tasks', label: 'Tasks', icon: '✅' },
  { to: '/commission', label: 'Commission', icon: '💰' },
  { to: '/goals', label: 'Goals', icon: '🎯' },
  { to: '/calculators', label: 'Tools', icon: '🧮' },
  { to: '/whiteboard', label: 'Board', icon: '✏️' },
  { to: '/news', label: 'News', icon: '📰' },
  { to: '/fund-tools', label: 'Funds', icon: '📊' },
  { to: '/knowledge', label: 'Ask', icon: '💬' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[9px] font-semibold leading-tight transition ${
    isActive ? 'text-indigo-600' : 'text-slate-400'
  }`;

export function BottomTabBar() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-4xl items-stretch overflow-x-auto">
        {ALL_TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.end} className={tabClass} style={{ minWidth: 52 }}>
            <span className="text-lg leading-none">{tab.icon}</span>
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export function ClientModeBottomTabBar({ activeClientId }: { activeClientId: string }) {
  const tabs = [
    { to: `/clients/${activeClientId}/portfolio`, label: 'Portfolio', icon: '💼' },
    { to: '/whiteboard', label: 'Whiteboard', icon: '✏️' },
  ];
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-amber-200 bg-amber-50/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-3xl items-stretch justify-around">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold transition ${
                isActive ? 'text-indigo-600' : 'text-slate-400'
              }`
            }
          >
            <span className="text-2xl leading-none">{tab.icon}</span>
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
