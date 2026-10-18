/**
 * NotificationsPage - full history of your in-app notifications.
 *
 * Fetches all notifications (paginated) from the API and lets you mark items as
 * read, mark everything as read or delete them. The NotificationContext bell is
 * kept in sync by calling `refreshUnreadCount()`.
 */
import { useCallback, useEffect, useState } from 'react';
import { notificationApi } from '../../api/endpoints';
import { useNotifications } from '../../context/NotificationContext';
import PageHeader from '../../components/layout/PageHeader';
import { Card, EmptyState, ErrorState } from '../../components/common/States';
import { PageLoader } from '../../components/common/Spinner';
import Button from '../../components/common/Button';
import Pagination from '../../components/common/Pagination';
import { formatDateTime } from '../../utils/formatters';
import { NOTIFICATION_TYPE_ICONS } from '../../utils/constants';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
];

export default function NotificationsPage() {
  const { refreshUnreadCount } = useNotifications();
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);

  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 30 };
      if (filter === 'unread') params.unreadOnly = true;
      const data = await notificationApi.list(params);
      setItems(data.items || []);
      setUnreadCount(data.unreadCount || 0);
      setPagination(data.pagination || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [filter]);

  const markRead = async (id) => {
    try {
      await notificationApi.markRead(id);
      setItems((current) => current.map((item) => item.id === id ? { ...item, isRead: true, readAt: new Date().toISOString() } : item));
      setUnreadCount((count) => Math.max(0, count - 1));
      refreshUnreadCount();
    } catch (err) {
      setError(err.message);
    }
  };

  const markAll = async () => {
    if (unreadCount === 0) return;
    setWorking(true);
    try {
      await notificationApi.markAllRead();
      setItems((current) => current.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
      refreshUnreadCount();
    } catch (err) {
      setError(err.message);
    } finally {
      setWorking(false);
    }
  };

  const remove = async (id) => {
    try {
      await notificationApi.remove(id);
      setItems((current) => current.filter((item) => item.id !== id));
      // unread may have decreased if it was unread
      refreshUnreadCount();
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle="All of your in-app alerts."
        actions={
          <>
            <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
              {FILTERS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setFilter(tab.value)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${filter === tab.value ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <Button variant="secondary" onClick={markAll} disabled={working || unreadCount === 0}>Mark all read</Button>
          </>
        }
      />

      {loading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={load} /> : items.length === 0 ? (
        <EmptyState icon="🔔" title="No notifications" message="You're all caught up." />
      ) : (
        <div className="space-y-2">
          {items.map((notification) => (
            <Card key={notification.id} className={`border ${notification.isRead ? 'border-slate-200' : 'border-brand-200 bg-brand-50/40'}`}>
              <div className="flex flex-wrap items-start gap-3 p-4">
                <span className="text-2xl" aria-hidden="true">{NOTIFICATION_TYPE_ICONS[notification.type] || '🔔'}</span>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm ${notification.isRead ? 'font-medium text-slate-700' : 'font-semibold text-slate-900'}`}>
                      {notification.title}
                    </h3>
                    {!notification.isRead && <span className="h-2 w-2 rounded-full bg-brand-500" />}
                    <span className="ml-auto text-xs text-slate-400">{formatDateTime(notification.createdAt)}</span>
                  </div>
                  <p className="text-sm text-slate-600">{notification.message}</p>
                  <div className="flex flex-wrap gap-2">
                    {!notification.isRead && (
                      <button type="button" onClick={() => markRead(notification.id)} className="link text-xs">Mark read</button>
                    )}
                    <button type="button" onClick={() => remove(notification.id)} className="text-xs text-slate-500 hover:text-red-600">Delete</button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Pagination pagination={pagination} onPageChange={setPage} disabled={loading} />
    </div>
  );
}
