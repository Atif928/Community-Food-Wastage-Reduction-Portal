/**
 * Admin routes: /api/admin/*
 * The whole router is behind an ADMIN-only guard.
 */
const express = require('express');
const adminController = require('../controllers/adminController');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  userStatusRules,
  adminUserFilterRules,
  verificationReviewRules,
  donationStatusRules,
  broadcastRules,
} = require('../validators/adminValidators');
const { idParamRules, paginationRules } = require('../validators/commonValidators');

const router = express.Router();

router.use(authenticate, requireRole('ADMIN'));

/* ------------------------------- overview -------------------------------- */
router.get('/overview', adminController.overview);
router.get('/reports', adminController.reports);
router.get('/stats', adminController.stats);

/* --------------------------- user management ----------------------------- */
router.get('/users', adminUserFilterRules, paginationRules, validate, adminController.listUsers);
router.get('/users/:id', idParamRules, validate, adminController.getUser);
router.patch(
  '/users/:id/status',
  idParamRules,
  userStatusRules,
  validate,
  adminController.updateUserStatus,
);

/* ----------------------- NGO / shelter verifications --------------------- */
router.get('/verifications', paginationRules, validate, adminController.listVerifications);
router.patch(
  '/verifications/:id',
  idParamRules,
  verificationReviewRules,
  validate,
  adminController.reviewVerification,
);

/* --------------------------- donation moderation ------------------------- */
router.get('/donations', paginationRules, validate, adminController.listDonations);
router.patch('/donations/:id', idParamRules, donationStatusRules, validate, adminController.updateDonationStatus);
router.delete('/donations/:id', idParamRules, validate, adminController.deleteDonation);

/* ------------------------------- broadcast ------------------------------- */
router.post('/broadcast', broadcastRules, validate, adminController.broadcast);

module.exports = router;
