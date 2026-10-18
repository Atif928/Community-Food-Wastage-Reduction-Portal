/**
 * NotificationBell - dropdown listing the latest notifications.
 *
 * The unread count itself comes from NotificationContext (which polls), so this
 * component only renders + dispatches read actions.
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import { NOTIFICATION_TYPE_ICONS } from '../../utils/constants';
import { formatDateTime } from '../../utils/formatters';
import { EmptyState } from '../common/States';

export function NotificationBell() {
  const {
    notifications, unreadCount, loading, fetchNotifications, markRead, markAllRead,
  } = useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Close when clicking outside.
  useEffect(() => {
    if (!open) return undefined;
    const onClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) fetchNotifications({ silent: true });
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 animate-fade-in overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs font-semibold text-brand-700 hover:underline">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && notifications.length === 0 && (
              <p className="p-4 text-sm text-slate-500">Loading…</p>
            )}

            {!loading && notifications.length === 0 && (
              <div className="p-2">
                <EmptyState
                  icon="🔔"
                  title="No notifications yet"
                  message="We will let you know as soon as something happens."
                />
              </div>
            )}

            {notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => { if (!notification.isRead) markRead(notification.id); }}
                className={`flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition-colors last:border-0 hover:bg-slate-50 ${
                  notification.isRead ? 'bg-white' : 'bg-brand-50/60'
                }`}
              >
                <span aria-hidden="true" className="text-lg">
                  {NOTIFICATION_TYPE_ICONS[notification.type] || '🔔'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className={`truncate text-sm ${notification.isRead ? 'font-medium text-slate-700' : 'font-semibold text-slate-900'}`}>
                      {notification.title}
                    </span>
                    {!notification.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-600">{notification.message}</span>
                  <span className="mt-1 block text-[11px] text-slate-400">{formatDateTime(notification.createdAt)}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="border-t border-slate-100 px-4 py-2 text-center">
            <Link to="/notifications" onClick={() => setOpen(false)} className="link text-xs">
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
