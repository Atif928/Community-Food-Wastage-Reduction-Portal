/**
 * userModel - all SQL touching the `users` table.
 *
 * Model helpers accept an optional `conn` (a pooled connection acquired by a
 * service that is inside a transaction). When omitted they use the shared pool,
 * which keeps read-only call sites short.
 */
const { pool } = require('../config/db');
const { definedOnly } = require('../utils/helpers');
const { boundingBox } = require('../utils/geo');

/** Columns safe to hand back to clients (never password_hash). */
const PUBLIC_COLUMNS = `
  u.id, u.email, u.full_name, u.phone, u.city, u.address,
  u.latitude, u.longitude, u.org_type,
  u.avatar_url, u.role, u.account_status, u.created_at, u.updated_at`;

/**
 * Haversine distance (km) from (?, ?) to a user's stored coordinates.
 * Placeholder order: latitude, latitude, longitude.
 */
const USER_DISTANCE_SQL = `(6371 * 2 * ASIN(SQRT(
  POWER(SIN(RADIANS(u.latitude - ?) / 2), 2) +
  COS(RADIANS(?)) * COS(RADIANS(u.latitude)) *
  POWER(SIN(RADIANS(u.longitude - ?) / 2), 2)
)))`;

/** Insert a new user and return its id. */
async function create(data, conn = pool) {
  const {
    email, passwordHash, fullName, phone = null, city = null, address = null,
    latitude = null, longitude = null, orgType = null,
    role = 'DONOR', accountStatus = 'ACTIVE',
  } = data;

  const [result] = await conn.query(
    `INSERT INTO users
       (email, password_hash, full_name, phone, city, address, latitude, longitude,
        org_type, role, account_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [email, passwordHash, fullName, phone, city, address, latitude, longitude,
      orgType, role, accountStatus],
  );
  return result.insertId;
}

/** Find a user by email (case-insensitive). Pass withPassword to include password_hash. */
async function findByEmail(email, { withPassword = false, conn = pool } = {}) {
  const [rows] = await conn.query(
    `SELECT ${PUBLIC_COLUMNS}${withPassword ? ', u.password_hash' : ''}
       FROM users u
      WHERE lower(u.email) = lower(?)
      LIMIT 1`,
    [email],
  );
  return rows[0] || null;
}

/** Find a user by id, including donor rating aggregates. */
async function findById(id, conn = pool) {
  const [rows] = await conn.query(
    `SELECT ${PUBLIC_COLUMNS},
            (SELECT ROUND(AVG(f.rating), 2) FROM feedback f WHERE f.donor_id = u.id) AS average_rating,
            (SELECT COUNT(*)               FROM feedback f WHERE f.donor_id = u.id) AS rating_count,
            (SELECT COUNT(*) FROM donations d WHERE d.donor_id = u.id)               AS donation_count
       FROM users u
      WHERE u.id = ?
      LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

/** Does an email already exist? (case-insensitive, matches the unique index) */
async function emailExists(email, conn = pool) {
  const [rows] = await conn.query('SELECT id FROM users WHERE lower(email) = lower(?) LIMIT 1', [email]);
  return rows.length > 0;
}

/** Partial update built from only the keys the caller supplied. */
async function update(id, fields, conn = pool) {
  const clean = definedOnly(fields);
  const map = {
    fullName: 'full_name',
    phone: 'phone',
    city: 'city',
    address: 'address',
    latitude: 'latitude',
    longitude: 'longitude',
    orgType: 'org_type',
    avatarUrl: 'avatar_url',
    passwordHash: 'password_hash',
    accountStatus: 'account_status',
    role: 'role',
  };

  const sets = [];
  const params = [];
  for (const [key, column] of Object.entries(map)) {
    if (clean[key] !== undefined) {
      sets.push(`${column} = ?`);
      params.push(clean[key]);
    }
  }
  if (sets.length === 0) return 0;

  params.push(id);
  const [result] = await conn.query(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
  return result.affectedRows;
}

/** Admin action: set account_status (ACTIVE / SUSPENDED / PENDING_VERIFICATION). */
async function setAccountStatus(id, accountStatus, conn = pool) {
  const [result] = await conn.query('UPDATE users SET account_status = ? WHERE id = ?', [accountStatus, id]);
  return result.affectedRows;
}

/**
 * Paginated user list for the admin panel.
 * Supports role / status / orgType / free-text filters.
 */
async function list({ role, status, search, orgType } = {}, { limit = 20, offset = 0, conn = pool } = {}) {
  const where = [];
  const params = [];

  if (role) { where.push('u.role = ?'); params.push(role); }
  if (status) { where.push('u.account_status = ?'); params.push(status); }
  if (orgType) { where.push('u.org_type = ?'); params.push(orgType); }
  if (search) {
    where.push('(u.full_name ILIKE ? OR u.email ILIKE ? OR u.city ILIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [countRows] = await conn.query(`SELECT COUNT(*) AS total FROM users u ${whereSql}`, params);

  const [rows] = await conn.query(
    `SELECT ${PUBLIC_COLUMNS},
            (SELECT ROUND(AVG(f.rating), 2) FROM feedback f WHERE f.donor_id = u.id) AS average_rating,
            (SELECT COUNT(*) FROM donations d WHERE d.donor_id = u.id)               AS donation_count,
            (SELECT COUNT(*) FROM claims cl WHERE cl.recipient_id = u.id)            AS claim_count,
            v.status AS verification_status,
            v.document_type AS verification_document_type
       FROM users u
       LEFT JOIN ngo_verifications v ON v.user_id = u.id
       ${whereSql}
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return { rows, total: countRows[0].total };
}

/** Small counts used by the admin dashboard header cards. */
async function countsByRole(conn = pool) {
  const [rows] = await conn.query(
    `SELECT role, account_status, COUNT(*) AS total
       FROM users
      GROUP BY role, account_status`,
  );

  const summary = {
    donors: 0, recipients: 0, admins: 0,
    active: 0, pending: 0, suspended: 0,
  };

  for (const row of rows) {
    const key = { DONOR: 'donors', RECIPIENT: 'recipients', ADMIN: 'admins' }[row.role];
    if (key) summary[key] += Number(row.total);
    if (row.account_status === 'ACTIVE') summary.active += Number(row.total);
    if (row.account_status === 'PENDING_VERIFICATION') summary.pending += Number(row.total);
    if (row.account_status === 'SUSPENDED') summary.suspended += Number(row.total);
  }
  return summary;
}

/**
 * Active recipients within `radiusKm` of a point.
 *
 * Two-phase approach: a cheap bounding-box comparison on the indexed
 * (latitude, longitude) columns, then the exact haversine distance.
 * Recipients with no stored coordinates are skipped.
 */
async function findRecipientsWithinRadius(latitude, longitude, radiusKm, conn = pool) {
  const box = boundingBox(latitude, longitude, radiusKm);

  // The distance alias cannot be referenced in HAVING in Postgres, so the
  // projection is wrapped and filtered in the outer query instead.
  const [rows] = await conn.query(
    `SELECT * FROM (
       SELECT ${PUBLIC_COLUMNS},
              ${USER_DISTANCE_SQL} AS distance_km
         FROM users u
        WHERE u.role = 'RECIPIENT'
          AND u.account_status = 'ACTIVE'
          AND u.latitude IS NOT NULL
          AND u.longitude IS NOT NULL
          AND u.latitude BETWEEN ? AND ?
          AND u.longitude BETWEEN ? AND ?
     ) AS matches
     WHERE matches.distance_km <= ?
     ORDER BY matches.distance_km ASC
     LIMIT 200`,
    [latitude, latitude, longitude, ...box.params, radiusKm],
  );

  return rows;
}

module.exports = {
  PUBLIC_COLUMNS,
  USER_DISTANCE_SQL,
  create,
  findByEmail,
  findById,
  emailExists,
  update,
  setAccountStatus,
  list,
  countsByRole,
  findRecipientsWithinRadius,
};
