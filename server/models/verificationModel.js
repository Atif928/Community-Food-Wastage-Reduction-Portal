/**
 * verificationModel - NGO / shelter document verification records.
 */
const { pool } = require('../config/db');

const COLUMNS = `
  v.id, v.user_id, v.document_type, v.document_url, v.status,
  v.review_note, v.reviewed_by, v.submitted_at, v.reviewed_at`;

/** Create (or replace) the single verification row for a user. */
async function create({ userId, documentType, documentUrl }, conn = pool) {
  const [result] = await conn.query(
    `INSERT INTO ngo_verifications (user_id, document_type, document_url, status)
     VALUES (?, ?, ?, 'PENDING')
     ON CONFLICT (user_id) DO UPDATE SET
       document_type = EXCLUDED.document_type,
       document_url  = EXCLUDED.document_url,
       status        = 'PENDING',
       review_note   = NULL,
       reviewed_by   = NULL,
       reviewed_at   = NULL,
       submitted_at  = CURRENT_TIMESTAMP`,
    [userId, documentType, documentUrl],
  );
  // RETURNING id yields the row id on both the insert and the update path.
  if (result.insertId) return result.insertId;
  const existing = await findByUserId(userId, conn);
  return existing ? existing.id : null;
}

/** A single verification record by id (admin review flow). */
async function findById(id, conn = pool) {
  const [rows] = await conn.query(
    `SELECT ${COLUMNS} FROM ngo_verifications v WHERE v.id = ? LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

/** The verification row for a user, joined with the applicant's profile. */
async function findByUserId(userId, conn = pool) {
  const [rows] = await conn.query(
    `SELECT ${COLUMNS},
            u.full_name AS applicant_name, u.email AS applicant_email,
            u.org_type AS applicant_org_type, u.city AS applicant_city,
            u.account_status AS applicant_status
       FROM ngo_verifications v
       JOIN users u ON u.id = v.user_id
      WHERE v.user_id = ?
      LIMIT 1`,
    [userId],
  );
  return rows[0] || null;
}

/** Queue for the admin panel. Defaults to PENDING only. */
async function list({ status = 'PENDING', search } = {}, { limit = 50, offset = 0, conn = pool } = {}) {
  const where = [];
  const params = [];

  if (status && status !== 'ALL') { where.push('v.status = ?'); params.push(status); }
  if (search) {
    where.push('(u.full_name ILIKE ? OR u.email ILIKE ?)');
    const like = `%${search}%`;
    params.push(like, like);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [countRows] = await conn.query(
    `SELECT COUNT(*) AS total
       FROM ngo_verifications v
       JOIN users u ON u.id = v.user_id
       ${whereSql}`,
    params,
  );

  const [rows] = await conn.query(
    `SELECT ${COLUMNS},
            u.full_name AS applicant_name, u.email AS applicant_email,
            u.phone AS applicant_phone, u.org_type AS applicant_org_type,
            u.city AS applicant_city, u.address AS applicant_address,
            u.account_status AS applicant_status
       FROM ngo_verifications v
       JOIN users u ON u.id = v.user_id
       ${whereSql}
      ORDER BY CASE v.status WHEN 'PENDING' THEN 1 WHEN 'REJECTED' THEN 2 ELSE 3 END, v.submitted_at ASC
      LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return { rows, total: countRows[0].total };
}

/** Admin decision on a verification record. */
async function review(id, { status, reviewNote = null, reviewedBy }, conn = pool) {
  const [result] = await conn.query(
    `UPDATE ngo_verifications
        SET status = ?, review_note = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
    [status, reviewNote, reviewedBy, id],
  );
  return result.affectedRows;
}

/** Count of pending verifications (admin dashboard badge). */
async function countPending(conn = pool) {
  const [rows] = await conn.query(
    "SELECT COUNT(*) AS total FROM ngo_verifications WHERE status = 'PENDING'",
  );
  return Number(rows[0]?.total || 0);
}

module.exports = { create, findById, findByUserId, list, review, countPending };
