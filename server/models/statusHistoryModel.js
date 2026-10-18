/**
 * statusHistoryModel - append-only audit trail for donation status changes.
 */
const { pool } = require('../config/db');

/** Append one status change. */
async function add({ donationId, status, changedBy, note = null }, conn = pool) {
  const [result] = await conn.query(
    `INSERT INTO status_history (donation_id, status, changed_by, note)
     VALUES (?, ?, ?, ?)`,
    [donationId, status, changedBy, note],
  );
  return result.insertId;
}

/** Full timeline for a donation, oldest first. */
async function listByDonation(donationId, conn = pool) {
  const [rows] = await conn.query(
    `SELECT h.id, h.donation_id, h.status, h.changed_by, h.note, h.changed_at,
            u.full_name AS changed_by_name, u.role AS changed_by_role
       FROM status_history h
       JOIN users u ON u.id = h.changed_by
      WHERE h.donation_id = ?
      ORDER BY h.changed_at ASC, h.id ASC`,
    [donationId],
  );
  return rows;
}

/** Most recent transition per donation (used in admin tables). */
async function latestForDonations(donationIds, conn = pool) {
  if (!donationIds.length) return [];
  // Postgres takes an array parameter for the IN list (mysql2 expanded `IN (?)`).
  const [rows] = await conn.query(
    `SELECT h.donation_id, h.status, h.note, h.changed_at
       FROM status_history h
       JOIN (
         SELECT donation_id, MAX(id) AS max_id
           FROM status_history
          WHERE donation_id = ANY(?::int[])
          GROUP BY donation_id
       ) latest ON latest.max_id = h.id`,
    [donationIds],
  );
  return rows;
}

module.exports = { add, listByDonation, latestForDonations };
