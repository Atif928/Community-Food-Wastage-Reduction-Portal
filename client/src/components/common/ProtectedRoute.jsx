/**
 * ProtectedRoute - route guard.
 *
 *   <Route element={<ProtectedRoute />}>                        any signed-in user
 *   <Route element={<ProtectedRoute roles={['ADMIN']} />}>       admins only
 *
 * Behaviour
 *   * while the session is rehydrating -> full page loader
 *   * not signed in                    -> redirect to /login (remembers where
 *                                          the user was heading)
 *   * wrong role                       -> redirect to their own dashboard
 *   * suspended account                -> logout + login screen
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageLoader } from '../common/Spinner';

export function ProtectedRoute({ roles = null }) {
  const { isAuthenticated, initializing, user, dashboardRoute, isSuspended, logout } = useAuth();
  const location = useLocation();

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <PageLoader label="Checking your session…" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  if (isSuspended) {
    logout();
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    // Signed in but not allowed here - send them somewhere useful.
    return <Navigate to={dashboardRoute} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
