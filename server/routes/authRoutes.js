/**
 * Auth routes: /api/auth/*
 */
const express = require('express');
const authController = require('../controllers/authController');
const { registerRules, loginRules, changePasswordRules } = require('../validators/authValidators');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { documentUpload } = require('../middleware/upload');

const router = express.Router();

/**
 * Registration accepts BOTH application/json (donors, volunteers) and
 * multipart/form-data (NGOs/shelters attaching a verification document).
 * The optional uploader tolerates requests without a file.
 */
router.post(
  '/register',
  documentUpload.single('document'),
  registerRules,
  validate,
  authController.register,
);

router.post('/login', loginRules, validate, authController.login);

// Stateless JWT: logout exists so the client has an explicit action to call.
router.post('/logout', authenticate, authController.logout);

// Current session (user + verification record).
router.get('/me', authenticate, authController.me);

router.patch('/password', authenticate, changePasswordRules, validate, authController.changePassword);

module.exports = router;
