/**
 * notificationModel - in-app dashboard notifications.
 */
const { pool } = require('../config/db');

const COLUMNS = 'n.id, n.user_id, n.type, n.title, n.message, n.payload, n.read_at, n.created_at';

/** Insert one notification (used by the notification service). */
async function create({ userId, type, title, message, payload = null }, conn = pool) {
  const [result] = await conn.query(
    `INSERT INTO notifications (user_id, type, title, message, payload)
     VALUES (?, ?, ?, ?, ?::jsonb)`,
    [userId, type, title, message, payload ? JSON.stringify(payload) : null],
  );
  return result.insertId;
}

/** Insert the same notification for many users at once (bulk fan-out). */
async function createMany(items, conn = pool) {
  if (!items.length) return 0;

  const values = items.map((item) => [
    item.userId, item.type, item.title, item.message,
    item.payload ? JSON.stringify(item.payload) : null,
  ]);

  // Postgres has no `VALUES ?` bulk syntax, so expand one row per item.
  const placeholders = values
    .map((_, rowIndex) => {
      const base = rowIndex * 5;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}::jsonb)`;
    })
    .join(', ');

  const [result] = await conn.query(
    `INSERT INTO notifications (user_id, type, title, message, payload)
     VALUES ${placeholders}`,
    values.flat(),
  );
  return result.affectedRows;
}

/** Newest first, with unreadOnly support. */
async function list(userId, { unreadOnly = false, limit = 30, offset = 0 } = {}, conn = pool) {
  const where = ['n.user_id = ?'];
  const params = [userId];
  if (unreadOnly) where.push('n.read_at IS NULL');

  const [rows] = await conn.query(
    `SELECT ${COLUMNS}
       FROM notifications n
      WHERE ${where.join(' AND ')}
      ORDER BY n.created_at DESC, n.id DESC
      LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  return rows;
}

/** Badge number: how many notifications have never been read. */
async function unreadCount(userId, conn = pool) {
  const [rows] = await conn.query(
    'SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND read_at IS NULL',
    [userId],
  );
  return Number(rows[0]?.total || 0);
}

/** Mark a single notification as read (scoped to the owner!). */
async function markRead(userId, notificationId, conn = pool) {
  const [result] = await conn.query(
    `UPDATE notifications
        SET read_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ? AND read_at IS NULL`,
    [notificationId, userId],
  );
  return result.affectedRows;
}

/** Mark every unread notification as read. */
async function markAllRead(userId, conn = pool) {
  const [result] = await conn.query(
    `UPDATE notifications
        SET read_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND read_at IS NULL`,
    [userId],
  );
  return result.affectedRows;
}

async function remove(userId, notificationId, conn = pool) {
  const [result] = await conn.query(
    'DELETE FROM notifications WHERE id = ? AND user_id = ?',
    [notificationId, userId],
  );
  return result.affectedRows;
}

module.exports = { create, createMany, list, unreadCount, markRead, markAllRead, remove };
