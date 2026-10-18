/**
 * Feedback routes: /api/feedback/*
 */
const express = require('express');
const feedbackController = require('../controllers/feedbackController');
const { authenticate, requireRole, requireActiveAccount } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { feedbackRules } = require('../validators/claimValidators');
const { paginationRules } = require('../validators/commonValidators');

const router = express.Router();

router.use(authenticate);

// Recipients rate a delivered donation.
router.post(
  '/',
  requireRole('RECIPIENT'),
  requireActiveAccount,
  feedbackRules,
  validate,
  feedbackController.create,
);

router.get('/donor/:donorId', paginationRules, validate, feedbackController.donorReviews);
router.get('/donation/:donationId', validate, feedbackController.donationFeedback);

module.exports = router;
