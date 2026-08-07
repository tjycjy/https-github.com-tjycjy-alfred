import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ClientModeToggle } from './ClientModeToggle';
import { BottomTabBar, ClientModeBottomTabBar } from './BottomTabBar';
import { Logo } from '../ui/Logo';
import { useAppMode } from '../../state/AppModeContext';
import { useAuth } from '../../state/AuthContext';
import { useTheme } from '../../state/ThemeContext';

export function AppShell() {
  const { mode, activeClientId, privacyMode, togglePrivacyMode } = useAppMode();
  const { pinConfigured, biometricConfigured, lock } = useAuth();
  const { resolvedDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isClientMode = mode === 'client';
  const isWhiteboard = location.pathname === '/whiteboard';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <button
            onClick={() => navigate(isClientMode && activeClientId ? `/clients/${activeClientId}/portfolio` : '/')}
            className="flex items-center gap-2 text-lg font-bold text-slate-800"
          >
            <Logo size={36} />
            <span className="hidden sm:inline">A.L.F.R.E.D.</span>
          </button>

          <div className="flex items-center gap-3">
            <ClientModeToggle />
            <button
              onClick={togglePrivacyMode}
              title={privacyMode ? 'Client names hidden — tap to reveal' : 'Client names visible — tap to hide'}
              className="rounded-full p-2.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              {privacyMode ? '🙈' : '👁️'}
            </button>
            <button
              onClick={toggleTheme}
              title={resolvedDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="rounded-full p-2.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              {resolvedDark ? '☀️' : '🌙'}
            </button>
            {(pinConfigured || biometricConfigured) && (
              <button
                onClick={lock}
                title="Lock app"
                className="rounded-full p-2.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                🔒
              </button>
            )}
          </div>
        </div>
      </header>

      <main className={isWhiteboard ? '' : 'mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6'}>
        <Outlet />
      </main>

      {isClientMode && activeClientId ? (
        <ClientModeBottomTabBar activeClientId={activeClientId} />
      ) : (
        !isClientMode && <BottomTabBar />
      )}
    </div>
  );
}
