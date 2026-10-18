/**
 * authService - registration, login and password handling.
 *
 * Role rules enforced here:
 *   DONOR                             -> ACTIVE immediately
 *   RECIPIENT + VOLUNTEER             -> ACTIVE immediately
 *   RECIPIENT + NGO / SHELTER         -> PENDING_VERIFICATION + a verification
 *                                        document is mandatory at signup
 *   ADMIN                             -> cannot self register
 */
const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');
const verificationModel = require('../models/verificationModel');
const notificationModel = require('../models/notificationModel');
const emailService = require('./emailService');
const { sign } = require('../config/jwt');
const { withTransaction } = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');
const { userPublic } = require('../utils/serializers');

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 10);

/** Roles that must submit verification documents and wait for approval. */
const VERIFICATION_ORG_TYPES = ['NGO', 'SHELTER'];

/** Hash a plaintext password with bcrypt. */
async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/** Compare a plaintext password against a stored hash. */
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/** Build the JWT payload for a user row. */
function buildToken(user) {
  return sign({ userId: user.id, role: user.role, email: user.email });
}

/**
 * Register a new account.
 *
 * @param {object} input validated request body
 * @param {object} [document] multer file for verification (required for NGO/shelter)
 */
async function register(input, document = null) {
  const {
    email, password, fullName, phone = null, city = null, address = null,
    latitude = null, longitude = null, role = 'DONOR', orgType = null,
    documentType = 'REGISTRATION_CERTIFICATE',
  } = input;

  const normalizedRole = String(role).toUpperCase();
  if (normalizedRole === 'ADMIN') {
    throw ApiError.forbidden('Admin accounts cannot be created through registration.');
  }
  if (!['DONOR', 'RECIPIENT'].includes(normalizedRole)) {
    throw ApiError.badRequest('Invalid role. Choose DONOR or RECIPIENT.');
  }

  const normalizedOrgType = orgType ? String(orgType).toUpperCase() : null;
  const needsVerification =
    normalizedRole === 'RECIPIENT' && VERIFICATION_ORG_TYPES.includes(normalizedOrgType);

  if (needsVerification && !document) {
    throw ApiError.badRequest(
      'NGO and shelter accounts must upload a verification document (PDF or image).',
    );
  }

  // Uniqueness check up-front so we return a clean 409 (the UNIQUE index is
  // still the real guarantee under concurrency).
  if (await userModel.emailExists(email)) {
    throw ApiError.conflict('An account with that email already exists.');
  }

  const passwordHash = await hashPassword(password);

  const { userId } = await withTransaction(async (conn) => {
    const newUserId = await userModel.create({
      email: email.toLowerCase().trim(),
      passwordHash,
      fullName,
      phone,
      city,
      address,
      latitude,
      longitude,
      orgType: normalizedOrgType,
      role: normalizedRole,
      accountStatus: needsVerification ? 'PENDING_VERIFICATION' : 'ACTIVE',
    }, conn);

    if (needsVerification) {
      await verificationModel.create({
        userId: newUserId,
        documentType,
        documentUrl: document.path, // relative /uploads path from the storage service
      }, conn);

      // Tell every admin there is something to review.
      const admins = await userModel.list({ role: 'ADMIN' }, { limit: 50, conn });
      const items = admins.rows.map((admin) => ({
        userId: admin.id,
        type: 'VERIFICATION_SUBMITTED',
        title: 'New NGO awaiting approval',
        message: `${fullName} submitted verification documents for review.`,
        payload: { userId: newUserId },
      }));
      await notificationModel.createMany(items, conn);
    }

    return { userId: newUserId };
  });

  const user = await userModel.findById(userId);
  const token = buildToken(user);

  // Fire-and-forget welcome / pending emails (never block registration).
  const mailer = needsVerification
    ? emailService.sendVerificationReceived(user)
    : emailService.sendWelcome(user);
  Promise.resolve(mailer).catch(() => {});

  return {
    token,
    user: userPublic(user),
    requiresVerification: needsVerification,
  };
}

/**
 * Authenticate a user.
 * Pending accounts CAN log in (so they can see the "under review" screen) but
 * the requireActiveAccount middleware blocks claiming until approved.
 */
async function login({ email, password }) {
  const user = await userModel.findByEmail(email, { withPassword: true });

  // Same message for unknown email and wrong password (no account enumeration).
  if (!user) throw new ApiError(401, 'Invalid email or password.');

  const matches = await verifyPassword(password, user.password_hash);
  if (!matches) throw new ApiError(401, 'Invalid email or password.');

  if (user.account_status === 'SUSPENDED') {
    throw ApiError.forbidden('This account has been suspended. Please contact the administrator.');
  }

  const token = buildToken(user);
  return { token, user: userPublic(user) };
}

/** Change the password of the signed-in user. */
async function changePassword(userId, currentPassword, newPassword) {
  const user = await userModel.findByEmail(
    (await userModel.findById(userId)).email,
    { withPassword: true },
  );
  if (!user) throw ApiError.notFound('Account not found.');

  const matches = await verifyPassword(currentPassword, user.password_hash);
  if (!matches) throw ApiError.badRequest('Your current password is incorrect.');

  const passwordHash = await hashPassword(newPassword);
  await userModel.update(userId, { passwordHash });
  return true;
}

module.exports = {
  hashPassword,
  verifyPassword,
  buildToken,
  register,
  login,
  changePassword,
  VERIFICATION_ORG_TYPES,
};
