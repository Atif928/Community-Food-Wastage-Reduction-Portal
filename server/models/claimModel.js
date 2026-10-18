/**
 * claimModel - recipient claims on donations.
 *
 * Concurrency note: `create` is always called inside a transaction whose first
 * statement is a `SELECT ... FOR UPDATE` on the donation row (see
 * claimService.claimDonation). That row lock serialises competing claims, and
 * the UNIQUE(donation_id) key is the final safety net.
 */
const { pool } = require('../config/db');

/** Claim + donation + donor + recipient, used by the claim views. */
const DETAIL_SELECT = `
  cl.id, cl.donation_id, cl.recipient_id, cl.status, cl.pickup_note,
  cl.claimed_at, cl.delivered_at, cl.delivered_proof_url,
  d.title AS donation_title, d.description AS donation_description,
  d.unit, d.quantity_kg, d.quantity_servings, d.best_before, d.status AS donation_status,
  d.pickup_address, d.pickup_city, d.pickup_latitude, d.pickup_longitude,
  c.name AS category_name, c.type AS category_type,
  du.id AS donor_id, du.full_name AS donor_name, du.phone AS donor_phone,
  du.email AS donor_email, du.org_type AS donor_org_type, du.city AS donor_city,
  ru.full_name AS recipient_name, ru.email AS recipient_email,
  ru.phone AS recipient_phone, ru.org_type AS recipient_org_type,
  (SELECT i.image_url FROM donation_images i
    WHERE i.donation_id = d.id ORDER BY i.is_primary DESC, i.id ASC LIMIT 1) AS primary_image,
  f.id AS feedback_id, f.rating AS feedback_rating, f.comment AS feedback_comment,
  (SELECT ROUND(AVG(f2.rating), 2) FROM feedback f2 WHERE f2.donor_id = du.id) AS donor_rating`;

const DETAIL_JOINS = `
  FROM claims cl
  JOIN donations d  ON d.id = cl.donation_id
  JOIN food_categories c ON c.id = d.category_id
  JOIN users du     ON du.id = d.donor_id
  JOIN users ru     ON ru.id = cl.recipient_id
  LEFT JOIN feedback f ON f.donation_id = d.id`;

/** Row lock on a donation. Must run inside a transaction. */
async function lockDonation(donationId, conn) {
  const [rows] = await conn.query(
    'SELECT id, donor_id, status, best_before, title FROM donations WHERE id = ? FOR UPDATE',
    [donationId],
  );
  return rows[0] || null;
}

async function create({ donationId, recipientId, pickupNote = null }, conn = pool) {
  const [result] = await conn.query(
    `INSERT INTO claims (donation_id, recipient_id, status, pickup_note)
     VALUES (?, ?, 'ACTIVE', ?)`,
    [donationId, recipientId, pickupNote],
  );
  return result.insertId;
}

async function findById(id, conn = pool) {
  const [rows] = await conn.query(
    `SELECT ${DETAIL_SELECT} ${DETAIL_JOINS} WHERE cl.id = ? LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

async function findByDonationId(donationId, conn = pool) {
  const [rows] = await conn.query(
    `SELECT ${DETAIL_SELECT} ${DETAIL_JOINS} WHERE cl.donation_id = ? LIMIT 1`,
    [donationId],
  );
  return rows[0] || null;
}

/** Claims made by one recipient (history + active pickups). */
async function listByRecipient(recipientId, { status, search } = {}, { limit = 20, offset = 0 } = {}, conn = pool) {
  const where = ['cl.recipient_id = ?'];
  const params = [recipientId];

  if (status) { where.push('cl.status = ?'); params.push(status); }
  if (search) { where.push('d.title ILIKE ?'); params.push(`%${search}%`); }

  const whereSql = `WHERE ${where.join(' AND ')}`;

  const [countRows] = await conn.query(
    `SELECT COUNT(*) AS total
       FROM claims cl JOIN donations d ON d.id = cl.donation_id
       ${whereSql}`,
    params,
  );

  const [rows] = await conn.query(
    `SELECT ${DETAIL_SELECT} ${DETAIL_JOINS} ${whereSql}
      ORDER BY CASE cl.status WHEN 'ACTIVE' THEN 1 WHEN 'DELIVERED' THEN 2 ELSE 3 END, cl.claimed_at DESC
      LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return { rows, total: countRows[0].total };
}

/** Claims received on one donor's listings (donor dashboard table). */
async function listByDonor(donorId, { status, search } = {}, { limit = 20, offset = 0 } = {}, conn = pool) {
  const where = ['d.donor_id = ?'];
  const params = [donorId];

  if (status) { where.push('cl.status = ?'); params.push(status); }
  if (search) { where.push('d.title ILIKE ?'); params.push(`%${search}%`); }

  const whereSql = `WHERE ${where.join(' AND ')}`;

  const [countRows] = await conn.query(
    `SELECT COUNT(*) AS total
       FROM claims cl JOIN donations d ON d.id = cl.donation_id
       ${whereSql}`,
    params,
  );

  const [rows] = await conn.query(
    `SELECT ${DETAIL_SELECT} ${DETAIL_JOINS} ${whereSql}
      ORDER BY CASE cl.status WHEN 'ACTIVE' THEN 1 WHEN 'DELIVERED' THEN 2 ELSE 3 END, cl.claimed_at DESC
      LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return { rows, total: countRows[0].total };
}

/** Recipient confirms delivery: mark the claim delivered. */
async function markDelivered(id, { proofUrl = null } = {}, conn = pool) {
  const [result] = await conn.query(
    `UPDATE claims
        SET status = 'DELIVERED',
            delivered_at = CURRENT_TIMESTAMP,
            delivered_proof_url = COALESCE(?, delivered_proof_url)
      WHERE id = ? AND status = 'ACTIVE'`,
    [proofUrl, id],
  );
  return result.affectedRows;
}

/** Recipient backs out of a claim (only while still ACTIVE). */
async function cancel(id, conn = pool) {
  const [result] = await conn.query(
    "UPDATE claims SET status = 'CANCELLED' WHERE id = ? AND status = 'ACTIVE'",
    [id],
  );
  return result.affectedRows;
}

/** Recipient impact numbers. */
async function recipientStats(recipientId, conn = pool) {
  const [rows] = await conn.query(
    `SELECT
        COUNT(*)                                                                    AS total_claims,
        SUM(CASE WHEN cl.status = 'ACTIVE'    THEN 1 ELSE 0 END)                    AS active_claims,
        SUM(CASE WHEN cl.status = 'DELIVERED' THEN 1 ELSE 0 END)                    AS delivered_claims,
        COALESCE(SUM(CASE WHEN cl.status = 'DELIVERED' AND d.unit = 'kg'
                          THEN d.quantity_kg * 2
                          WHEN cl.status = 'DELIVERED' THEN d.quantity_servings
                          ELSE 0 END), 0)   AS meals_received,
        COALESCE(SUM(CASE WHEN cl.status = 'DELIVERED' AND d.unit = 'kg'
                          THEN d.quantity_kg ELSE 0 END), 0) AS kg_received
       FROM claims cl
       JOIN donations d ON d.id = cl.donation_id
      WHERE cl.recipient_id = ?`,
    [recipientId],
  );
  return rows[0];
}

/** Active pickup commitments for a donor (dashboard badge). */
async function countActiveForDonor(donorId, conn = pool) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS total
       FROM claims cl JOIN donations d ON d.id = cl.donation_id
      WHERE d.donor_id = ? AND cl.status = 'ACTIVE'`,
    [donorId],
  );
  return Number(rows[0]?.total || 0);
}

/** Platform-wide claim counters for the admin dashboard. */
async function claimTotals(conn = pool) {
  const [rows] = await conn.query(
    `SELECT COUNT(*)                                      AS total_claims,
            SUM(CASE WHEN status = 'ACTIVE'    THEN 1 ELSE 0 END) AS active_claims,
            SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END) AS delivered_claims,
            SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled_claims
       FROM claims`,
  );
  return rows[0];
}

module.exports = {
  lockDonation,
  create,
  findById,
  findByDonationId,
  listByRecipient,
  listByDonor,
  markDelivered,
  cancel,
  recipientStats,
  countActiveForDonor,
  claimTotals,
};
