/**
 * Geo helpers for the distance based search.
 *
 * Strategy: first shrink the candidate set with a cheap bounding box on the
 * indexed (pickup_latitude, pickup_longitude) columns, then compute the exact
 * haversine distance in SQL so we can filter and sort by it.
 */

const EARTH_RADIUS_KM = 6371;

/** Convert degrees to radians. */
const toRad = (deg) => (deg * Math.PI) / 180;

/** Great-circle distance between two coordinates, in kilometres. */
function haversineKm(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * SQL snippet computing the haversine distance (km) between an inline point and
 * the donation row, ready to be used in SELECT and ORDER BY.
 * Parameters order: lat, lat, lng, lng.
 */
function distanceSqlExpression(latAlias = '?', lngAlias = '?') {
  return `(${EARTH_RADIUS_KM} * 2 * ASIN(SQRT(
    POWER(SIN(RADIANS(d.pickup_latitude - ${latAlias}) / 2), 2) +
    COS(RADIANS(${latAlias})) * COS(RADIANS(d.pickup_latitude)) *
    POWER(SIN(RADIANS(d.pickup_longitude - ${lngAlias}) / 2), 2)
  )))`;
}

/**
 * Bounding box filter used as a cheap pre-filter before the haversine pass.
 * Returns { sql, params } to append to a WHERE clause.
 */
function boundingBox(latitude, longitude, radiusKm) {
  const latDelta = radiusKm / 111.32; // 1 degree latitude ~ 111.32 km
  const cosLat = Math.cos(toRad(latitude));
  // Guard against division by zero near the poles.
  const lngDelta = radiusKm / (111.32 * Math.max(cosLat, 0.000001));

  return {
    sql: `d.pickup_latitude BETWEEN ? AND ? AND d.pickup_longitude BETWEEN ? AND ?`,
    params: [latitude - latDelta, latitude + latDelta, longitude - lngDelta, longitude + lngDelta],
  };
}

/** Is a coordinate pair usable? */
function isValidCoordinate(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return (
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
  );
}

module.exports = { EARTH_RADIUS_KM, haversineKm, distanceSqlExpression, boundingBox, isValidCoordinate, toRad };
