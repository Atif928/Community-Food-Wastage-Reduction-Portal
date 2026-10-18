/**
 * Shared express-validator chains (pagination, ids, coordinates).
 */
const { query, param, body } = require('express-validator');

/** ?page & ?limit for every list endpoint. */
const paginationRules = [
  query('page').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('page must be a positive integer.'),
  query('limit').optional({ values: 'falsy' }).isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100.'),
];

/** :id route params. */
const idParamRules = [
  param('id').isInt({ min: 1 }).withMessage('A valid id is required.'),
];

/** Optional lat/lng pair used by distance aware endpoints. */
const coordinateRules = [
  query('latitude').optional({ values: 'falsy' }).isFloat({ min: -90, max: 90 }).withMessage('latitude must be between -90 and 90.'),
  query('longitude').optional({ values: 'falsy' }).isFloat({ min: -180, max: 180 }).withMessage('longitude must be between -180 and 180.'),
  query('radiusKm').optional({ values: 'falsy' }).isFloat({ min: 0.5, max: 500 }).withMessage('radiusKm must be between 0.5 and 500.'),
];

/** Body fields that describe a point (used by listing/profile forms). */
const bodyCoordinateRules = [
  body('latitude').optional({ values: 'falsy', checkFalsy: true }).isFloat({ min: -90, max: 90 }).withMessage('latitude must be between -90 and 90.'),
  body('longitude').optional({ values: 'falsy', checkFalsy: true }).isFloat({ min: -180, max: 180 }).withMessage('longitude must be between -180 and 180.'),
];

module.exports = { paginationRules, idParamRules, coordinateRules, bodyCoordinateRules };
