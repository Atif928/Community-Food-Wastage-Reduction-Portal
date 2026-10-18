/**
 * Admin action validation chains.
 */
const { body, query } = require('express-validator');

/** PATCH /api/admin/users/:id/status */
const userStatusRules = [
  body('accountStatus')
    .trim()
    .toUpperCase()
    .isIn(['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'])
    .withMessage('accountStatus must be ACTIVE, SUSPENDED or PENDING_VERIFICATION.'),
  body('note')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 }).withMessage('Note must be at most 500 characters.'),
];

/** GET /api/admin/users */
const adminUserFilterRules = [
  query('role').optional({ values: 'falsy' }).trim().toUpperCase()
    .isIn(['DONOR', 'RECIPIENT', 'ADMIN']).withMessage('Invalid role filter.'),
  query('status').optional({ values: 'falsy' }).trim().toUpperCase()
    .isIn(['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION']).withMessage('Invalid status filter.'),
  query('search').optional({ values: 'falsy' }).trim().isLength({ max: 120 }),
];

/** PATCH /api/admin/verifications/:id */
const verificationReviewRules = [
  body('status')
    .trim()
    .toUpperCase()
    .isIn(['APPROVED', 'REJECTED'])
    .withMessage('status must be APPROVED or REJECTED.'),
  body('reviewNote')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 }).withMessage('Review note must be at most 500 characters.'),
];

/** POST /api/categories and PUT /api/categories/:id */
const categoryRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Category name is required.')
    .isLength({ min: 2, max: 100 }).withMessage('Category name must be between 2 and 100 characters.'),
  body('type')
    .trim()
    .toUpperCase()
    .isIn(['VEG', 'NON_VEG']).withMessage('Type must be VEG or NON_VEG.'),
  body('isActive').optional({ values: 'falsy' }).isBoolean().withMessage('isActive must be true or false.'),
];

/** PATCH /api/admin/donations/:id */
const donationStatusRules = [
  body('status')
    .trim()
    .toUpperCase()
    .isIn(['AVAILABLE', 'CLAIMED', 'DELIVERED', 'CANCELLED'])
    .withMessage('status must be AVAILABLE, CLAIMED, DELIVERED or CANCELLED.'),
  body('note')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 }).withMessage('Note must be at most 500 characters.'),
];

/** POST /api/admin/broadcast */
const broadcastRules = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required.')
    .isLength({ max: 200 }).withMessage('Title must be at most 200 characters.'),
  body('message')
    .trim()
    .notEmpty().withMessage('Message is required.')
    .isLength({ max: 500 }).withMessage('Message must be at most 500 characters.'),
  body('audience')
    .optional({ values: 'falsy' })
    .trim()
    .toUpperCase()
    .isIn(['ALL', 'DONOR', 'RECIPIENT'])
    .withMessage('audience must be ALL, DONOR or RECIPIENT.'),
];

module.exports = {
  userStatusRules,
  adminUserFilterRules,
  verificationReviewRules,
  categoryRules,
  donationStatusRules,
  broadcastRules,
};
