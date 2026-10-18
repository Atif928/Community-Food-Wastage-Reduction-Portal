/**
 * notificationController - in-app notification bell.
 */
const notificationService = require('../services/notificationService');
const { ok } = require('../utils/respond');

/** GET /api/notifications?unreadOnly=true */
async function list(req, res) {
  const result = await notificationService.listNotifications(req.user.id, {
    unreadOnly: req.query.unreadOnly === 'true',
    limit: Math.min(100, Number(req.query.limit) || 30),
    page: Math.max(1, Number(req.query.page) || 1),
  });
  return ok(res, result);
}

/** GET /api/notifications/unread-count (polled by the badge) */
async function unreadCount(req, res) {
  return ok(res, { unreadCount: await notificationService.getUnreadCount(req.user.id) });
}

/** PATCH /api/notifications/:id/read */
async function markRead(req, res) {
  const affected = await notificationService.markRead(req.user.id, Number(req.params.id));
  return ok(res, { updated: affected, unreadCount: await notificationService.getUnreadCount(req.user.id) });
}

/** PATCH /api/notifications/read-all */
async function markAllRead(req, res) {
  const updated = await notificationService.markAllRead(req.user.id);
  return ok(res, { updated, unreadCount: 0 });
}

/** DELETE /api/notifications/:id */
async function remove(req, res) {
  const deleted = await notificationService.deleteNotification(req.user.id, Number(req.params.id));
  return ok(res, { deleted });
}

module.exports = { list, unreadCount, markRead, markAllRead, remove };
