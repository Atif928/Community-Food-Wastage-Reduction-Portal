/**
 * Auth + profile validation chains.
 */
const { body } = require('express-validator');

const ORG_TYPES = ['NGO', 'SHELTER', 'VOLUNTEER', 'RESTAURANT', 'HOTEL', 'INDIVIDUAL'];

/** POST /api/auth/register */
const registerRules = [
  body('email')
    .trim()
    .isEmail().withMessage('Enter a valid email address.')
    .isLength({ max: 255 }).withMessage('Email is too long.')
    .normalizeEmail(),

  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.')
    .isLength({ max: 72 }).withMessage('Password must be at most 72 characters long.')
    .matches(/[A-Za-z]/).withMessage('Password must contain at least one letter.')
    .matches(/\d/).withMessage('Password must contain at least one number.'),

  body('fullName')
    .trim()
    .notEmpty().withMessage('Full name is required.')
    .isLength({ min: 2, max: 150 }).withMessage('Full name must be between 2 and 150 characters.'),

  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 30 }).withMessage('Phone number is too long.'),

  body('city')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 100 }).withMessage('City name is too long.'),

  body('address')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 255 }).withMessage('Address is too long.'),

  body('role')
    .trim()
    .toUpperCase()
    .isIn(['DONOR', 'RECIPIENT']).withMessage('Role must be DONOR or RECIPIENT.'),

  body('orgType')
    .optional({ values: 'falsy' })
    .trim()
    .toUpperCase()
    .isIn(ORG_TYPES).withMessage(`Organisation type must be one of: ${ORG_TYPES.join(', ')}.`),

  body('latitude').optional({ values: 'falsy' }).isFloat({ min: -90, max: 90 }).withMessage('latitude must be between -90 and 90.'),
  body('longitude').optional({ values: 'falsy' }).isFloat({ min: -180, max: 180 }).withMessage('longitude must be between -180 and 180.'),

  body('documentType')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 80 }).withMessage('Document type is too long.'),
];

/** POST /api/auth/login */
const loginRules = [
  body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.'),
];

/** PATCH /api/users/me */
const updateProfileRules = [
  body('fullName')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 2, max: 150 }).withMessage('Full name must be between 2 and 150 characters.'),

  body('phone').optional({ values: 'falsy' }).trim().isLength({ max: 30 }),
  body('city').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  body('address').optional({ values: 'falsy' }).trim().isLength({ max: 255 }),

  body('orgType')
    .optional({ values: 'falsy' })
    .trim()
    .toUpperCase()
    .isIn(ORG_TYPES).withMessage(`Organisation type must be one of: ${ORG_TYPES.join(', ')}.`),

  body('latitude').optional({ values: 'falsy' }).isFloat({ min: -90, max: 90 }),
  body('longitude').optional({ values: 'falsy' }).isFloat({ min: -180, max: 180 }),
];

/** PATCH /api/users/me/password */
const changePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Your current password is required.'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters long.')
    .matches(/[A-Za-z]/).withMessage('New password must contain at least one letter.')
    .matches(/\d/).withMessage('New password must contain at least one number.'),
];

module.exports = { registerRules, loginRules, updateProfileRules, changePasswordRules, ORG_TYPES };
