/**
 * feedbackModel - recipient ratings + hygiene comments.
 */
const { pool } = require('../config/db');

const COLUMNS = `
  f.id, f.donation_id, f.recipient_id, f.donor_id, f.rating, f.comment, f.created_at`;

async function create({ donationId, recipientId, donorId, rating, comment = null }, conn = pool) {
  const [result] = await conn.query(
    `INSERT INTO feedback (donation_id, recipient_id, donor_id, rating, comment)
     VALUES (?, ?, ?, ?, ?)`,
    [donationId, recipientId, donorId, rating, comment],
  );
  return result.insertId;
}

/** Feedback written for one donation (null when not reviewed yet). */
async function findByDonation(donationId, conn = pool) {
  const [rows] = await conn.query(
    `SELECT ${COLUMNS}, u.full_name AS recipient_name
       FROM feedback f
       JOIN users u ON u.id = f.recipient_id
      WHERE f.donation_id = ?
      LIMIT 1`,
    [donationId],
  );
  return rows[0] || null;
}

/** All reviews received by a donor (newest first). */
async function listForDonor(donorId, { limit = 50, offset = 0 } = {}, conn = pool) {
  const [countRows] = await conn.query(
    'SELECT COUNT(*) AS total FROM feedback WHERE donor_id = ?',
    [donorId],
  );

  const [rows] = await conn.query(
    `SELECT ${COLUMNS},
            d.title AS donation_title,
            u.full_name AS recipient_name, u.org_type AS recipient_org_type
       FROM feedback f
       JOIN donations d ON d.id = f.donation_id
       JOIN users u ON u.id = f.recipient_id
      WHERE f.donor_id = ?
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?`,
    [donorId, limit, offset],
  );

  return { rows, total: countRows[0].total };
}

/**
 * Aggregate rating for a donor:
 *   { average_rating, rating_count, five_star, ... }
 */
async function donorRatingSummary(donorId, conn = pool) {
  const [rows] = await conn.query(
    `SELECT
        COUNT(*)                        AS rating_count,
        ROUND(AVG(rating), 2)           AS average_rating,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) AS five_star,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) AS four_star,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) AS three_star,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) AS two_star,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) AS one_star
       FROM feedback
      WHERE donor_id = ?`,
    [donorId],
  );
  return rows[0] || { rating_count: 0, average_rating: null };
}

/** Distribution used by admin reports. */
async function globalRatingDistribution(conn = pool) {
  const [rows] = await conn.query(
    'SELECT rating, COUNT(*) AS total FROM feedback GROUP BY rating ORDER BY rating DESC',
  );
  return rows;
}

module.exports = { create, findByDonation, listForDonor, donorRatingSummary, globalRatingDistribution };
