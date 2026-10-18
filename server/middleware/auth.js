/**
 * Authentication + role based access control middleware.
 */
const jwt = require('jsonwebtoken');
const { ApiError } = require('./errorHandler');
const { pool } = require('../config/db');

/** Pull a bearer token out of the Authorization header. */
function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

/**
 * Require a valid JWT. On success attaches `req.user`:
 *   { id, role, email, accountStatus }
 * The database is queried so a suspended or pending account is rejected
 * immediately, even if the token is still cryptographically valid.
 */
async function authenticate(req, res, next) {
  const token = extractToken(req);
  if (!token) throw new ApiError(401, 'Authentication required. Please log in.');

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || 'insecure-dev-secret-change-me');
  } catch (err) {
    const message = err.name === 'TokenExpiredError'
      ? 'Your session has expired. Please log in again.'
      : 'Invalid authentication token.';
    throw new ApiError(401, message);
  }

  const [rows] = await pool.query(
    'SELECT id, email, role, account_status FROM users WHERE id = ? LIMIT 1',
    [decoded.userId],
  );

  if (rows.length === 0) throw new ApiError(401, 'Account no longer exists.');
  const user = rows[0];
  if (user.account_status === 'SUSPENDED') {
    throw new ApiError(403, 'Your account has been suspended. Contact the administrator.');
  }

  req.user = {
    id: user.id,
    email: user.email,
    role: user.role,
    accountStatus: user.account_status,
  };
  next();
}

/** Require one of the given roles, e.g. requireRole('DONOR', 'ADMIN'). */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) throw new ApiError(401, 'Authentication required.');
    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, `Access denied. This action is limited to: ${roles.join(', ')}.`);
    }
    next();
  };
}

/**
 * Require a fully approved account. NGOs/shelters sit in PENDING_VERIFICATION
 * until an admin approves them, and cannot claim food before that.
 */
function requireActiveAccount(req, res, next) {
  if (!req.user) throw new ApiError(401, 'Authentication required.');
  if (req.user.accountStatus !== 'ACTIVE') {
    throw new ApiError(
      403,
      'Your account is awaiting admin verification. You will be notified once approved.',
    );
  }
  next();
}

/** Optional auth: attaches req.user when a token is present, never throws. */
async function optionalAuthenticate(req, res, next) {
  if (!extractToken(req)) return next();
  try {
    await authenticate(req, res, () => {});
    return next();
  } catch (err) {
    return next();
  }
}

module.exports = { authenticate, requireRole, requireActiveAccount, optionalAuthenticate };
