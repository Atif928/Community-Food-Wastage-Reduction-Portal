/**
 * donationModel - all SQL for food listings, the recipient feed and analytics.
 *
 * Key behaviours
 *  * `search()` hides expired listings by default (best_before > NOW()).
 *  * Radius search uses a bounding-box pre-filter on the indexed coordinate
 *    columns, then an exact haversine distance computed in SQL.
 *  * Aggregate helpers feed the donor dashboard and the admin charts.
 */
const { pool } = require('../config/db');
const { boundingBox, isValidCoordinate } = require('../utils/geo');
const { definedOnly } = require('../utils/helpers');

/** Shared SELECT list: donation + category + donor + rating + primary image. */
const BASE_SELECT = `
  d.id, d.donor_id, d.category_id, d.title, d.description,
  d.quantity_kg, d.quantity_servings, d.unit, d.best_before,
  d.pickup_address, d.pickup_city, d.pickup_latitude, d.pickup_longitude,
  d.status, d.created_at, d.updated_at,
  c.name AS category_name, c.slug AS category_slug, c.type AS category_type,
  u.full_name AS donor_name, u.org_type AS donor_org_type, u.city AS donor_city,
  u.phone AS donor_phone, u.email AS donor_email,
  (SELECT ROUND(AVG(f.rating), 2) FROM feedback f WHERE f.donor_id = d.donor_id) AS donor_rating,
  (SELECT COUNT(*) FROM feedback f WHERE f.donor_id = d.donor_id)                AS donor_rating_count,
  (SELECT i.image_url FROM donation_images i
    WHERE i.donation_id = d.id ORDER BY i.is_primary DESC, i.id ASC LIMIT 1)      AS primary_image,
  (SELECT COUNT(*) FROM donation_images i WHERE i.donation_id = d.id)            AS image_count,
  (SELECT cl.recipient_id FROM claims cl WHERE cl.donation_id = d.id LIMIT 1)     AS claimed_by`;

/** Haversine km from (?, ?, ?) = (lat, lat, lng) to the donation pickup point. */
const DISTANCE_SQL = `(6371 * 2 * ASIN(SQRT(
  POWER(SIN(RADIANS(d.pickup_latitude - ?) / 2), 2) +
  COS(RADIANS(?)) * COS(RADIANS(d.pickup_latitude)) *
  POWER(SIN(RADIANS(d.pickup_longitude - ?) / 2), 2)
)))`;

const CLAIM_JOIN_SELECT = `
  cl.id AS claim_id, cl.status AS claim_status, cl.claimed_at, cl.delivered_at,
  cl.pickup_note, cl.delivered_proof_url, cl.recipient_id,
  ru.full_name AS recipient_name, ru.email AS recipient_email,
  ru.phone AS recipient_phone, ru.org_type AS recipient_org_type`;

/**
 * Translate filter options into a WHERE fragment + parameter list.
 * Exported for reuse by the aggregate/count queries so filters never drift.
 */
function buildFilters(filters = {}) {
  const parts = [];
  const params = [];

  if (Array.isArray(filters.statuses) && filters.statuses.length > 0) {
    parts.push(`d.status IN (${filters.statuses.map(() => '?').join(', ')})`);
    params.push(...filters.statuses);
  } else if (filters.status) {
    parts.push('d.status = ?');
    params.push(filters.status);
  }

  // Hide everything that has passed its best-before time (default behaviour).
  if (!filters.includeExpired) parts.push('d.best_before > NOW()');

  if (filters.city) { parts.push('d.pickup_city = ?'); params.push(filters.city); }
  if (filters.categoryId) { parts.push('d.category_id = ?'); params.push(filters.categoryId); }
  if (filters.type) { parts.push('c.type = ?'); params.push(filters.type); }
  if (filters.donorId) { parts.push('d.donor_id = ?'); params.push(filters.donorId); }
  if (filters.excludeDonorId) { parts.push('d.donor_id <> ?'); params.push(filters.excludeDonorId); }
  if (filters.donationId) { parts.push('d.id = ?'); params.push(filters.donationId); }

  if (filters.search) {
    // ILIKE keeps the case-insensitive behaviour MySQL's default collation had.
    parts.push('(d.title ILIKE ? OR d.description ILIKE ?)');
    const like = `%${filters.search}%`;
    params.push(like, like);
  }

  if (filters.hasCoordinates) {
    const box = boundingBox(filters.latitude, filters.longitude, filters.radiusKm || 25);
    parts.push(box.sql);
    params.push(...box.params);
  }

  return { parts, params };
}

const JOIN_SQL = `
  FROM donations d
  JOIN food_categories c ON c.id = d.category_id
  JOIN users u ON u.id = d.donor_id`;

/** Insert a listing; returns the new id. */
async function create(data, conn = pool) {
  const {
    donorId, categoryId, title, description = null,
    quantityKg = null, quantityServings = null, unit = 'kg',
    bestBefore, pickupAddress = null, pickupCity,
    pickupLatitude, pickupLongitude, status = 'AVAILABLE',
  } = data;

  const [result] = await conn.query(
    `INSERT INTO donations
       (donor_id, category_id, title, description, quantity_kg, quantity_servings,
        unit, best_before, pickup_address, pickup_city, pickup_latitude,
        pickup_longitude, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [donorId, categoryId, title, description, quantityKg, quantityServings,
      unit, bestBefore, pickupAddress, pickupCity, pickupLatitude,
      pickupLongitude, status],
  );
  return result.insertId;
}

/** Single listing. Adds distance_km when coordinates are supplied. */
async function findById(id, { latitude, longitude } = {}, conn = pool) {
  const withCoords = isValidCoordinate(latitude, longitude);
  const distanceSelect = withCoords ? `, ${DISTANCE_SQL} AS distance_km` : '';
  const params = withCoords ? [latitude, latitude, longitude, id] : [id];

  const [rows] = await conn.query(
    `SELECT ${BASE_SELECT}${distanceSelect}
     ${JOIN_SQL}
     WHERE d.id = ?
     LIMIT 1`,
    params,
  );
  return rows[0] || null;
}

/** Listing + claim + recipient details (donor/admin drill-down view). */
async function findByIdWithClaim(id, { latitude, longitude } = {}, conn = pool) {
  const withCoords = isValidCoordinate(latitude, longitude);
  const distanceSelect = withCoords ? `, ${DISTANCE_SQL} AS distance_km` : '';
  const params = withCoords ? [latitude, latitude, longitude, id] : [id];

  const [rows] = await conn.query(
    `SELECT ${BASE_SELECT}${distanceSelect}, ${CLAIM_JOIN_SELECT}
     ${JOIN_SQL}
     LEFT JOIN claims cl ON cl.donation_id = d.id
     LEFT JOIN users ru ON ru.id = cl.recipient_id
     WHERE d.id = ?
     LIMIT 1`,
    params,
  );
  return rows[0] || null;
}

/** Partial update of a listing (only supplied keys are written). */
async function update(id, fields, conn = pool) {
  const clean = definedOnly(fields);
  const map = {
    categoryId: 'category_id',
    title: 'title',
    description: 'description',
    quantityKg: 'quantity_kg',
    quantityServings: 'quantity_servings',
    unit: 'unit',
    bestBefore: 'best_before',
    pickupAddress: 'pickup_address',
    pickupCity: 'pickup_city',
    pickupLatitude: 'pickup_latitude',
    pickupLongitude: 'pickup_longitude',
    status: 'status',
  };

  const sets = [];
  const params = [];
  for (const [key, column] of Object.entries(map)) {
    if (clean[key] !== undefined) { sets.push(`${column} = ?`); params.push(clean[key]); }
  }
  if (sets.length === 0) return 0;

  params.push(id);
  const [result] = await conn.query(`UPDATE donations SET ${sets.join(', ')} WHERE id = ?`, params);
  return result.affectedRows;
}

/**
 * Optimistic status transition: only changes the row when it currently holds
 * `expectedStatus`. Returns the number of affected rows (0 = lost the race).
 */
async function transitionStatus(id, expectedStatus, nextStatus, conn = pool) {
  const [result] = await conn.query(
    'UPDATE donations SET status = ? WHERE id = ? AND status = ?',
    [nextStatus, id, expectedStatus],
  );
  return result.affectedRows;
}

async function remove(id, conn = pool) {
  const [result] = await conn.query('DELETE FROM donations WHERE id = ?', [id]);
  return result.affectedRows;
}

/* ------------------------------- images ---------------------------------- */

async function addImages(donationId, images, conn = pool) {
  if (!images.length) return 0;
  const values = images.map((img, index) => [
    donationId,
    typeof img === 'string' ? img : img.url,
    typeof img === 'string' ? (index === 0 ? 1 : 0) : (img.isPrimary ? 1 : 0),
  ]);

  // Postgres has no `VALUES ?` bulk syntax, so expand one row per photo.
  const placeholders = values
    .map((_, rowIndex) => `($${rowIndex * 3 + 1}, $${rowIndex * 3 + 2}, $${rowIndex * 3 + 3})`)
    .join(', ');

  const [result] = await conn.query(
    `INSERT INTO donation_images (donation_id, image_url, is_primary) VALUES ${placeholders}`,
    values.flat(),
  );
  return result.affectedRows;
}

async function listImages(donationId, conn = pool) {
  const [rows] = await conn.query(
    `SELECT id, donation_id, image_url, is_primary, created_at
       FROM donation_images
      WHERE donation_id = ?
      ORDER BY is_primary DESC, id ASC`,
    [donationId],
  );
  return rows;
}

async function deleteImages(donationId, conn = pool) {
  const [result] = await conn.query('DELETE FROM donation_images WHERE donation_id = ?', [donationId]);
  return result.affectedRows;
}

/* ------------------------------- search ---------------------------------- */

/**
 * The recipient feed / donor listing table / admin listing table.
 * @param {object} filters see buildFilters
 * @param {object} pagination { limit, offset }
 * @param {string} orderBy 'distance' | 'expiry' | 'newest' | 'quantity'
 */
async function search(filters = {}, { limit = 20, offset = 0 } = {}, orderBy = 'expiry', conn = pool) {
  const { parts, params } = buildFilters(filters);
  const whereSql = parts.length ? `WHERE ${parts.join(' AND ')}` : '';
  const withCoords = Boolean(filters.hasCoordinates);
  const withRadius = withCoords && filters.radiusKm;
  const coordinateParams = withCoords ? [filters.latitude, filters.latitude, filters.longitude] : [];

  const distanceSelect = withCoords ? `, ${DISTANCE_SQL} AS distance_km` : ', NULL AS distance_km';
  const radiusParams = withRadius ? [filters.radiusKm] : [];

  // Postgres does not allow output aliases in HAVING, so when a radius filter is
  // active the projection becomes a derived table and the predicate moves to the
  // outer query where distance_km is a real column.
  const alias = withRadius ? 'matches' : 'd';
  const orderSql = {
    distance: withCoords ? `${alias}.distance_km ASC, ${alias}.best_before ASC` : `${alias}.best_before ASC`,
    expiry: `${alias}.best_before ASC`,
    newest: `${alias}.created_at DESC`,
    quantity: `COALESCE(${alias}.quantity_kg, ${alias}.quantity_servings) DESC`,
  }[orderBy] || `${alias}.best_before ASC`;

  const projection = `SELECT ${BASE_SELECT}${distanceSelect}
     ${JOIN_SQL}
     ${whereSql}`;

  const [rows] = await conn.query(
    withRadius
      ? `SELECT * FROM (${projection}) AS matches
     WHERE matches.distance_km <= ?
     ORDER BY ${orderSql}
     LIMIT ? OFFSET ?`
      : `${projection}
     ORDER BY ${orderSql}
     LIMIT ? OFFSET ?`,
    [...coordinateParams, ...params, ...radiusParams, limit, offset],
  );

  // Count must repeat the radius predicate, so we wrap the filtered set.
  let total = 0;
  if (withRadius) {
    const [countRows] = await conn.query(
      `SELECT COUNT(*) AS total FROM (
         SELECT ${DISTANCE_SQL} AS distance_km
         ${JOIN_SQL}
         ${whereSql}
       ) AS matches
       WHERE matches.distance_km <= ?`,
      [...coordinateParams, ...params, ...radiusParams],
    );
    total = Number(countRows[0].total);
  } else {
    const [countRows] = await conn.query(
      `SELECT COUNT(*) AS total ${JOIN_SQL} ${whereSql}`,
      params,
    );
    total = Number(countRows[0].total);
  }

  return { rows, total };
}

/** Admin table: listing + claim + recipient in one pass, expired included. */
async function adminList(filters = {}, { limit = 20, offset = 0 } = {}, conn = pool) {
  const { parts, params } = buildFilters({ includeExpired: true, ...filters });
  const whereSql = parts.length ? `WHERE ${parts.join(' AND ')}` : '';

  const [countRows] = await conn.query(`SELECT COUNT(*) AS total ${JOIN_SQL} ${whereSql}`, params);

  const [rows] = await conn.query(
    `SELECT ${BASE_SELECT}, ${CLAIM_JOIN_SELECT}
     ${JOIN_SQL}
     LEFT JOIN claims cl ON cl.donation_id = d.id
     LEFT JOIN users ru ON ru.id = cl.recipient_id
     ${whereSql}
     ORDER BY d.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return { rows, total: countRows[0].total };
}

/* ----------------------------- aggregates -------------------------------- */

/** Sum of what is currently available (used on the recipient dashboard). */
async function availableTotals(filters = {}, conn = pool) {
  const { parts, params } = buildFilters(filters);
  parts.push("d.status = 'AVAILABLE'");
  const whereSql = `WHERE ${parts.join(' AND ')}`;

  const [rows] = await conn.query(
    `SELECT COUNT(*) AS listing_count,
            COALESCE(SUM(d.quantity_kg), 0)       AS total_kg,
            COALESCE(SUM(d.quantity_servings), 0) AS total_servings,
            COALESCE(SUM(CASE WHEN d.unit = 'kg' THEN d.quantity_kg * 2
                              ELSE d.quantity_servings END), 0) AS meals_available
     ${JOIN_SQL}
     ${whereSql}`,
    params,
  );
  return rows[0];
}

/** Everything the donor dashboard needs, in one round trip. */
async function donorStats(donorId, conn = pool) {
  const [rows] = await conn.query(
    `SELECT
        COUNT(*)                                                                          AS total_listings,
        SUM(CASE WHEN d.status = 'AVAILABLE' THEN 1 ELSE 0 END)                           AS active_listings,
        SUM(CASE WHEN d.status = 'CLAIMED'   THEN 1 ELSE 0 END)                           AS claimed_listings,
        SUM(CASE WHEN d.status = 'DELIVERED' THEN 1 ELSE 0 END)                           AS delivered_listings,
        SUM(CASE WHEN d.status = 'AVAILABLE' AND d.best_before <= NOW() THEN 1 ELSE 0 END) AS expired_listings,
        COALESCE(SUM(d.quantity_kg), 0)                                 AS total_kg,
        COALESCE(SUM(d.quantity_servings), 0)                           AS total_servings,
        COALESCE(SUM(CASE WHEN d.status = 'DELIVERED' AND d.unit = 'kg'
                          THEN d.quantity_kg * 2
                          WHEN d.status = 'DELIVERED' THEN d.quantity_servings
                          ELSE 0 END), 0)                               AS meals_saved,
        COALESCE(SUM(CASE WHEN d.unit = 'kg' THEN d.quantity_kg ELSE 0 END), 0) AS lifetime_kg
       FROM donations d
      WHERE d.donor_id = ?`,
    [donorId],
  );
  return rows[0];
}

/** Donations created per month for the last N months (donor sparkline). */
async function donorMonthlyTrend(donorId, months = 6, conn = pool) {
  const [rows] = await conn.query(
    `SELECT to_char(d.created_at, 'YYYY-MM') AS month,
            COUNT(*)                          AS donations,
            COALESCE(SUM(CASE WHEN d.status = 'DELIVERED' AND d.unit = 'kg'
                              THEN d.quantity_kg * 2
                              WHEN d.status = 'DELIVERED' THEN d.quantity_servings
                              ELSE 0 END), 0) AS meals_saved
       FROM donations d
      WHERE d.donor_id = ?
        AND d.created_at >= (CURRENT_DATE - make_interval(months => ?))
      GROUP BY month
      ORDER BY month ASC`,
    [donorId, months],
  );
  return rows;
}

/* ------------------------- admin report queries --------------------------- */

/** Platform-wide headline numbers. */
async function platformTotals(conn = pool) {
  const [rows] = await conn.query(
    `SELECT
        COUNT(*)                                                                          AS total_donations,
        SUM(CASE WHEN d.status = 'DELIVERED' THEN 1 ELSE 0 END)                           AS delivered_donations,
        SUM(CASE WHEN d.status = 'AVAILABLE' THEN 1 ELSE 0 END)                           AS active_donations,
        COALESCE(SUM(CASE WHEN d.unit = 'kg' THEN d.quantity_kg
                          ELSE d.quantity_servings::numeric / 2 END), 0) AS total_kg,
        COALESCE(SUM(CASE WHEN d.status = 'DELIVERED' AND d.unit = 'kg'
                          THEN d.quantity_kg * 2
                          WHEN d.status = 'DELIVERED' THEN d.quantity_servings
                          ELSE 0 END), 0)                               AS meals_saved
       FROM donations d`,
  );
  return rows[0];
}

/** City-wise donation trend by month (line chart). */
async function cityTrends(months = 6, conn = pool) {
  const [rows] = await conn.query(
    `SELECT d.pickup_city                                AS city,
            to_char(d.created_at, 'YYYY-MM')             AS month,
            COUNT(*)                                     AS donations,
            SUM(CASE WHEN d.status = 'DELIVERED' THEN 1 ELSE 0 END) AS delivered,
            COALESCE(SUM(CASE WHEN d.unit = 'kg' THEN d.quantity_kg
                              ELSE d.quantity_servings::numeric / 2 END), 0) AS quantity_kg,
            COALESCE(SUM(CASE WHEN d.status = 'DELIVERED' AND d.unit = 'kg'
                              THEN d.quantity_kg * 2
                              WHEN d.status = 'DELIVERED' THEN d.quantity_servings
                              ELSE 0 END), 0)                  AS meals_saved
       FROM donations d
      WHERE d.created_at >= (CURRENT_DATE - make_interval(months => ?))
      GROUP BY city, month
      ORDER BY month ASC, donations DESC`,
    [months],
  );
  return rows;
}

/** Per-city rollup for the bar chart. */
async function citySummary(conn = pool) {
  const [rows] = await conn.query(
    `SELECT d.pickup_city AS city,
            COUNT(*)     AS donations,
            SUM(CASE WHEN d.status = 'DELIVERED' THEN 1 ELSE 0 END) AS delivered,
            COALESCE(SUM(CASE WHEN d.status = 'DELIVERED' AND d.unit = 'kg'
                              THEN d.quantity_kg * 2
                              WHEN d.status = 'DELIVERED' THEN d.quantity_servings
                              ELSE 0 END), 0) AS meals_saved
       FROM donations d
      GROUP BY d.pickup_city
      ORDER BY meals_saved DESC, donations DESC`,
  );
  return rows;
}

/** Veg / Non-Veg + category split (pie chart). */
async function categoryBreakdown(conn = pool) {
  const [rows] = await conn.query(
    `SELECT c.id, c.name AS category, c.type,
            COUNT(d.id) AS donations,
            COALESCE(SUM(CASE WHEN d.unit = 'kg' THEN d.quantity_kg
                              ELSE d.quantity_servings::numeric / 2 END), 0) AS quantity_kg
       FROM food_categories c
       LEFT JOIN donations d ON d.category_id = c.id
      GROUP BY c.id, c.name, c.type
      ORDER BY donations DESC`,
  );
  return rows;
}

/** Monthly platform trend (line chart). */
async function monthlyTrends(months = 6, conn = pool) {
  const [rows] = await conn.query(
    `SELECT to_char(d.created_at, 'YYYY-MM') AS month,
            COUNT(*)                          AS donations,
            SUM(CASE WHEN d.status = 'DELIVERED' THEN 1 ELSE 0 END) AS delivered,
            COALESCE(SUM(CASE WHEN d.status = 'DELIVERED' AND d.unit = 'kg'
                              THEN d.quantity_kg * 2
                              WHEN d.status = 'DELIVERED' THEN d.quantity_servings
                              ELSE 0 END), 0) AS meals_saved
       FROM donations d
      WHERE d.created_at >= (CURRENT_DATE - make_interval(months => ?))
      GROUP BY month
      ORDER BY month ASC`,
    [months],
  );
  return rows;
}

/** Leaderboard used on the admin reports page. */
async function topDonors(limit = 5, conn = pool) {
  const [rows] = await conn.query(
    `SELECT u.id, u.full_name, u.org_type, u.city,
            COUNT(d.id)                AS donations,
            SUM(CASE WHEN d.status = 'DELIVERED' THEN 1 ELSE 0 END) AS delivered,
            COALESCE(SUM(CASE WHEN d.status = 'DELIVERED' AND d.unit = 'kg'
                              THEN d.quantity_kg * 2
                              WHEN d.status = 'DELIVERED' THEN d.quantity_servings
                              ELSE 0 END), 0) AS meals_saved,
            (SELECT ROUND(AVG(f.rating), 2) FROM feedback f WHERE f.donor_id = u.id) AS average_rating
       FROM users u
       JOIN donations d ON d.donor_id = u.id
      WHERE u.role = 'DONOR'
      GROUP BY u.id, u.full_name, u.org_type, u.city
      ORDER BY meals_saved DESC, delivered DESC
      LIMIT ?`,
    [limit],
  );
  return rows;
}

/** Distinct cities present in the data, for the filter dropdown. */
async function listCities(conn = pool) {
  const [rows] = await conn.query(
    `SELECT DISTINCT pickup_city AS city FROM donations
      WHERE pickup_city IS NOT NULL AND pickup_city <> ''
      ORDER BY pickup_city ASC`,
  );
  return rows.map((r) => r.city);
}

/** Count of listings past their best-before date (admin "needs attention"). */
async function countExpired(conn = pool) {
  const [rows] = await conn.query(
    "SELECT COUNT(*) AS total FROM donations WHERE status = 'AVAILABLE' AND best_before <= NOW()",
  );
  return Number(rows[0]?.total || 0);
}

module.exports = {
  BASE_SELECT,
  DISTANCE_SQL,
  buildFilters,
  create,
  findById,
  findByIdWithClaim,
  update,
  transitionStatus,
  remove,
  addImages,
  listImages,
  deleteImages,
  search,
  adminList,
  availableTotals,
  donorStats,
  donorMonthlyTrend,
  platformTotals,
  cityTrends,
  citySummary,
  categoryBreakdown,
  monthlyTrends,
  topDonors,
  listCities,
  countExpired,
};
