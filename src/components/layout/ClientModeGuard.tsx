import { Navigate, Outlet, useParams } from 'react-router-dom';
import { useAppMode } from '../../state/AppModeContext';

export function ClientModeGuard() {
  const { mode, activeClientId } = useAppMode();

  if (mode === 'client' && activeClientId) {
    return <Outlet />;
  }
  if (mode === 'client' && !activeClientId) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

export function ClientModeRestrictedRoute({ children }: { children: React.ReactNode }) {
  const { mode, activeClientId } = useAppMode();
  const { clientId } = useParams();

  if (mode === 'client') {
    if (!activeClientId) return <Navigate to="/" replace />;
    if (clientId !== activeClientId) return <Navigate to={`/clients/${activeClientId}/portfolio`} replace />;
  }
  return <>{children}</>;
}

export function AdvisorOnlyRoute({ children }: { children: React.ReactNode }) {
  const { mode, activeClientId } = useAppMode();
  if (mode === 'client') {
    return <Navigate to={activeClientId ? `/clients/${activeClientId}/portfolio` : '/'} replace />;
  }
  return <>{children}</>;
}
