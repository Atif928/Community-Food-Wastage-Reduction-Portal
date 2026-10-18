/**
 * JWT helpers.
 *
 * We only persist the user id, role and email in the token: the middleware
 * re-reads the user row on protected requests when it needs fresh data
 * (e.g. account_status changes after an admin approval).
 */
require('dotenv').config();
const jwt = require('jsonwebtoken');

const FALLBACK_SECRET = 'insecure-dev-secret-change-me';

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  // Refuse to boot in production with a guessable secret.
  throw new Error('JWT_SECRET must be set in production');
}

const SECRET = process.env.JWT_SECRET || FALLBACK_SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

if (!process.env.JWT_SECRET) {
  // eslint-disable-next-line no-console
  console.warn('[auth] JWT_SECRET is not set - using an insecure development default.');
}

/** Sign a payload into a JWT string. */
function sign(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

/** Verify and decode a JWT, throwing on invalid / expired tokens. */
function verify(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { sign, verify, EXPIRES_IN };
