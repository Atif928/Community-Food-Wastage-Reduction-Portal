/**
 * NotificationContext - powers the navbar bell + unread badge.
 *
 * Real-time behaviour is implemented with polling (see README): the unread
 * count is refreshed every VITE_NOTIFICATION_POLL_MS (default 30s). Polling
 * pauses while the tab is hidden and resumes - with an immediate fetch - when
 * the user comes back, which keeps the badge fresh without wasting requests.
 */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { notificationApi } from '../api/endpoints';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

const POLL_MS = Number(import.meta.env.VITE_NOTIFICATION_POLL_MS || 30000);

export function NotificationProvider({ children }) {
  const { isAuthenticated } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const timerRef = useRef(null);

  /** Fetch the newest notifications + the badge count in one round trip. */
  const fetchNotifications = useCallback(async ({ silent = false } = {}) => {
    if (!isAuthenticated) return;
    if (!silent) setLoading(true);
    try {
      const data = await notificationApi.list({ limit: 20 });
      setNotifications(data.items || []);
      setUnreadCount(data.unreadCount || 0);
      setError(null);
    } catch (err) {
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [isAuthenticated]);

  /** Cheap badge-only refresh used by the polling loop. */
  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await notificationApi.unreadCount();
      setUnreadCount(data.unreadCount || 0);
    } catch { /* keep the previous count on transient failures */ }
  }, [isAuthenticated]);

  const markRead = useCallback(async (id) => {
    // Optimistic update so the badge reacts instantly.
    setNotifications((current) => current.map((item) => (
      item.id === id ? { ...item, isRead: true } : item
    )));
    setUnreadCount((count) => Math.max(0, count - 1));

    try {
      const data = await notificationApi.markRead(id);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      fetchNotifications({ silent: true });
    }
  }, [fetchNotifications]);

  const markAllRead = useCallback(async () => {
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
    try {
      await notificationApi.markAllRead();
    } catch {
      fetchNotifications({ silent: true });
    }
  }, [fetchNotifications]);

  const removeNotification = useCallback(async (id) => {
    setNotifications((current) => current.filter((item) => item.id !== id));
    try {
      await notificationApi.remove(id);
    } finally {
      refreshUnreadCount();
    }
  }, [refreshUnreadCount]);

  /* --------------------------- polling lifecycle -------------------------- */

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return undefined;
    }

    fetchNotifications({ silent: true });

    const start = () => {
      if (timerRef.current) return;
      timerRef.current = window.setInterval(refreshUnreadCount, POLL_MS);
    };
    const stop = () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        refreshUnreadCount();
        start();
      }
    };

    start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isAuthenticated, fetchNotifications, refreshUnreadCount]);

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    refreshUnreadCount,
    markRead,
    markAllRead,
    removeNotification,
    pollIntervalMs: POLL_MS,
  }), [
    notifications, unreadCount, loading, error,
    fetchNotifications, refreshUnreadCount, markRead, markAllRead, removeNotification,
  ]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used inside a NotificationProvider.');
  return context;
}

export default NotificationContext;
