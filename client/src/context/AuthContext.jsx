/**
 * AuthContext - session state for the whole app.
 *
 *  * keeps the JWT in localStorage (see api/axiosClient.js)
 *  * rehydrates the user on page load via GET /auth/me
 *  * stores the recipient's verification record so the UI can show the
 *    "awaiting admin approval" screen
 *  * listens for the `auth:unauthorized` event emitted by the axios interceptor
 *    and clears the session when the token expires or the account is suspended
 */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { authApi, userApi } from '../api/endpoints';
import { getStoredToken, setStoredToken } from '../api/axiosClient';
import { DASHBOARD_ROUTE_BY_ROLE, ROLES } from '../utils/constants';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [verification, setVerification] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [authError, setAuthError] = useState(null);

  /** Load the session from a persisted token. */
  const bootstrap = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setInitializing(false);
      return;
    }

    try {
      const data = await authApi.me();
      setUser(data.user);
      setVerification(data.verification || null);
    } catch {
      // Token invalid / expired / account suspended.
      setStoredToken(null);
      setUser(null);
      setVerification(null);
    } finally {
      setInitializing(false);
    }
  }, []);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  /** Global 401 handler wired to the axios interceptor. */
  useEffect(() => {
    const handler = () => {
      setStoredToken(null);
      setUser(null);
      setVerification(null);
    };
    window.addEventListener('auth:unauthorized', handler);
    return () => window.removeEventListener('auth:unauthorized', handler);
  }, []);

  const login = useCallback(async (credentials) => {
    setAuthError(null);
    const data = await authApi.login(credentials);
    setStoredToken(data.token);
    setUser(data.user);
    setVerification(null);
    // Pull the verification record so pending NGOs see their status at once.
    try {
      const me = await authApi.me();
      setUser(me.user);
      setVerification(me.verification || null);
    } catch { /* non fatal */ }
    return data;
  }, []);

  const register = useCallback(async (payload, document) => {
    setAuthError(null);
    const data = await authApi.register(payload, document);
    setStoredToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* stateless - ignore */ }
    setStoredToken(null);
    setUser(null);
    setVerification(null);
  }, []);

  /** Refresh the cached user (after a profile edit or admin approval). */
  const refreshUser = useCallback(async () => {
    const data = await userApi.getProfile();
    setUser(data.user);
    return data.user;
  }, []);

  /** Refresh just the verification record (pending NGO screen). */
  const refreshVerification = useCallback(async () => {
    const data = await authApi.me();
    setUser(data.user);
    setVerification(data.verification || null);
    return data;
  }, []);

  const value = useMemo(() => {
    const role = user?.role || null;
    return {
      user,
      verification,
      role,
      initializing,
      authError,
      setAuthError,
      isAuthenticated: Boolean(user),
      isDonor: role === ROLES.DONOR,
      isRecipient: role === ROLES.RECIPIENT,
      isAdmin: role === ROLES.ADMIN,
      /** NGOs/shelters stay here until an admin approves them. */
      isPendingAccount: Boolean(user) && user.accountStatus === 'PENDING_VERIFICATION',
      isSuspended: Boolean(user) && user.accountStatus === 'SUSPENDED',
      dashboardRoute: DASHBOARD_ROUTE_BY_ROLE[role] || '/',
      login,
      register,
      logout,
      refreshUser,
      refreshVerification,
      setUser,
    };
  }, [user, verification, initializing, authError, login, register, logout, refreshUser, refreshVerification]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside an AuthProvider.');
  return context;
}

export default AuthContext;
