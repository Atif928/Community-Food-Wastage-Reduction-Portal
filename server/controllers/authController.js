/**
 * authController - registration, login, session and password.
 */
const authService = require('../services/authService');
const userModel = require('../models/userModel');
const verificationModel = require('../models/verificationModel');
const storageService = require('../services/storageService');
const { userPublic, verificationView } = require('../utils/serializers');
const { ok, created } = require('../utils/respond');
const { ApiError } = require('../middleware/errorHandler');

/**
 * POST /api/auth/register
 * multipart/form-data when an NGO/shelter uploads a document, otherwise JSON.
 */
async function register(req, res) {
  let document = null;

  if (req.file) {
    // STORAGE_DRIVER decides whether this stays on disk or goes to Firebase.
    const url = await storageService.persist(req.file, 'verifications');
    document = { path: url, originalName: req.file.originalname };
  }

  const result = await authService.register(req.body, document);
  return created(res, result);
}

/** POST /api/auth/login */
async function login(req, res) {
  const result = await authService.login({
    email: req.body.email,
    password: req.body.password,
  });
  return ok(res, result);
}

/**
 * GET /api/auth/me
 * Returns the signed-in user plus (for recipients) their verification record so
 * the client can render the "under review" screen.
 */
async function me(req, res) {
  const user = await userModel.findById(req.user.id);
  if (!user) throw ApiError.notFound('Account not found.');

  let verification = null;
  if (user.role === 'RECIPIENT') {
    const record = await verificationModel.findByUserId(user.id);
    verification = record ? verificationView(record) : null;
  }

  return ok(res, { user: userPublic(user), verification });
}

/**
 * POST /api/auth/logout
 * JWTs are stateless, so logout is a client side token discard. The endpoint
 * exists so the UI has an auditable action and the token can be reported later.
 */
async function logout(req, res) {
  return ok(res, { message: 'Logged out. Please discard your token.' });
}

/** PATCH /api/auth/password */
async function changePassword(req, res) {
  await authService.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
  return ok(res, { message: 'Password updated successfully.' });
}

module.exports = { register, login, me, logout, changePassword };
