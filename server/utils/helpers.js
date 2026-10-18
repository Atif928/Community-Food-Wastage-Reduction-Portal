/**
 * Small shared helpers (pagination, urls, slugs, dates).
 */

/** Parse ?page & ?limit into safe integers plus an OFFSET. */
function parsePagination(query, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, offset: (page - 1) * limit };
}

/** Wrap a paginated result in the standard envelope. */
function paginated(rows, total, page, limit) {
  return {
    items: rows,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}

/** Turn a stored path into an absolute URL for emails / external clients. */
function toAbsoluteUrl(relativePath) {
  if (!relativePath) return null;
  if (/^https?:\/\//i.test(relativePath)) return relativePath;
  const base = (process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, '');
  return `${base}${relativePath.startsWith('/') ? '' : '/'}${relativePath}`;
}

/** URL-safe slug. */
function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/** UTC ISO-8601 string for a Postgres TIMESTAMPTZ column (timestamptz-safe). */
function toSqlTimestamp(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

/** Round to 2 decimals (used for distances and impact numbers). */
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * Convert a donation quantity into an estimated "meals saved" figure.
 * 1 serving = 1 meal, 1 kg of food = 2 meals (industry rule of thumb).
 */
function estimateMeals({ unit, quantity_kg: kg, quantity_servings: servings }) {
  if (unit === 'servings') return Number(servings || 0);
  return Math.round(Number(kg || 0) * 2);
}

/** Strip undefined keys so partial UPDATE statements stay clean. */
function definedOnly(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

module.exports = {
  parsePagination,
  paginated,
  toAbsoluteUrl,
  slugify,
  toSqlTimestamp,
  round2,
  estimateMeals,
  definedOnly,
};
