/**
 * Donation listing validation + feed filter validation.
 */
const { body, query } = require('express-validator');

/** POST /api/donations and PUT /api/donations/:id */
const donationRules = [
  body('title')
    .trim()
    .notEmpty().withMessage('Item name is required.')
    .isLength({ min: 3, max: 200 }).withMessage('Item name must be between 3 and 200 characters.'),

  body('description')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 2000 }).withMessage('Description must be at most 2000 characters.'),

  body('categoryId')
    .notEmpty().withMessage('Food category is required.')
    .isInt({ min: 1 }).withMessage('Choose a valid food category.'),

  body('unit')
    .trim()
    .isIn(['kg', 'servings']).withMessage('Unit must be either kg or servings.'),

  // Accept the generic `quantity` field as well as the unit-specific ones.
  body('quantity').optional({ values: 'falsy' }).isFloat({ gt: 0 }).withMessage('Quantity must be greater than zero.'),
  body('quantityKg').optional({ values: 'falsy' }).isFloat({ gt: 0 }).withMessage('Quantity (kg) must be greater than zero.'),
  body('quantityServings').optional({ values: 'falsy' }).isInt({ gt: 0 }).withMessage('Servings must be a whole number greater than zero.'),

  body('bestBefore')
    .notEmpty().withMessage('Best before date/time is required.')
    .isISO8601().withMessage('Best before must be a valid date and time.'),

  body('pickupCity')
    .trim()
    .notEmpty().withMessage('Pickup city is required.')
    .isLength({ max: 100 }).withMessage('City name is too long.'),

  body('pickupAddress')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 255 }).withMessage('Pickup address is too long.'),

  body('pickupLatitude')
    .notEmpty().withMessage('Pickup location is required - pick it on the map.')
    .isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90.'),

  body('pickupLongitude')
    .notEmpty().withMessage('Pickup location is required - pick it on the map.')
    .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180.'),
];

/** GET /api/donations (recipient feed filters) */
const feedFilterRules = [
  query('status').optional({ values: 'falsy' }).trim().toUpperCase()
    .isIn(['AVAILABLE', 'CLAIMED', 'DELIVERED', 'CANCELLED', 'ALL']).withMessage('Invalid status filter.'),

  query('type').optional({ values: 'falsy' }).trim().toUpperCase()
    .isIn(['VEG', 'NON_VEG']).withMessage('Type must be VEG or NON_VEG.'),

  query('categoryId').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('categoryId must be a positive integer.'),
  query('city').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  query('search').optional({ values: 'falsy' }).trim().isLength({ max: 120 }),
  query('sort').optional({ values: 'falsy' }).trim().isIn(['distance', 'expiry', 'newest', 'quantity']).withMessage('Invalid sort option.'),
  query('latitude').optional({ values: 'falsy' }).isFloat({ min: -90, max: 90 }),
  query('longitude').optional({ values: 'falsy' }).isFloat({ min: -180, max: 180 }),
  query('radiusKm').optional({ values: 'falsy' }).isFloat({ min: 0.5, max: 500 }),
];

/** Donor's own listing table filters. */
const myListingFilterRules = [
  query('status').optional({ values: 'falsy' }).trim().toUpperCase()
    .isIn(['AVAILABLE', 'CLAIMED', 'DELIVERED', 'CANCELLED', 'ALL']).withMessage('Invalid status filter.'),
  query('search').optional({ values: 'falsy' }).trim().isLength({ max: 120 }),
  query('categoryId').optional({ values: 'falsy' }).isInt({ min: 1 }),
];

module.exports = { donationRules, feedFilterRules, myListingFilterRules };
