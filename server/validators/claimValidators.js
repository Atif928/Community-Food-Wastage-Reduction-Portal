/**
 * Claim + feedback validation chains.
 */
const { body, query } = require('express-validator');

/** POST /api/claims */
const claimRules = [
  body('donationId')
    .notEmpty().withMessage('donationId is required.')
    .isInt({ min: 1 }).withMessage('donationId must be a positive integer.'),
  body('pickupNote')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 }).withMessage('Pickup note must be at most 500 characters.'),
];

/** POST /api/claims/:id/deliver */
const deliverRules = [
  body('note')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 }).withMessage('Note must be at most 500 characters.'),
];

/** POST /api/claims/:id/cancel */
const cancelClaimRules = [
  body('reason')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 }).withMessage('Reason must be at most 500 characters.'),
];

/** Claim list filters. */
const claimFilterRules = [
  query('status').optional({ values: 'falsy' }).trim().toUpperCase()
    .isIn(['ACTIVE', 'DELIVERED', 'CANCELLED']).withMessage('Invalid claim status.'),
  query('search').optional({ values: 'falsy' }).trim().isLength({ max: 120 }),
];

/** POST /api/feedback */
const feedbackRules = [
  body('rating')
    .notEmpty().withMessage('A star rating is required.')
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5 stars.'),
  body('comment')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 1000 }).withMessage('Comment must be at most 1000 characters.'),
  body('claimId').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('claimId must be a positive integer.'),
  body('donationId').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('donationId must be a positive integer.'),
];

module.exports = { claimRules, deliverRules, cancelClaimRules, claimFilterRules, feedbackRules };
