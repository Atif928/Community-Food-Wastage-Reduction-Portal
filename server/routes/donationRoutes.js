/**
 * Donation routes: /api/donations/*
 *
 * Route order matters: the static paths (/cities, /mine, /claims-received) are
 * declared BEFORE /:id so they are not swallowed by the id param.
 */
const express = require('express');
const donationController = require('../controllers/donationController');
const { authenticate, requireRole, requireActiveAccount } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { imageUpload } = require('../middleware/upload');
const { donationRules, feedFilterRules, myListingFilterRules } = require('../validators/donationValidators');
const { idParamRules, paginationRules } = require('../validators/commonValidators');

const router = express.Router();

router.use(authenticate);

/* ----------------------------- static paths ------------------------------ */

// Distinct cities for filter dropdowns.
router.get('/cities', donationController.cities);

// Donor's own listings (includes expired / cancelled).
router.get(
  '/mine',
  requireRole('DONOR'),
  myListingFilterRules,
  paginationRules,
  validate,
  donationController.myListings,
);

// Claims other people made on the donor's listings.
router.get(
  '/claims-received',
  requireRole('DONOR'),
  paginationRules,
  validate,
  donationController.receivedClaims,
);

/* --------------------------- recipient feed ------------------------------ */

router.get('/', feedFilterRules, paginationRules, validate, donationController.browse);

/* ------------------------------ doner CRUD ------------------------------- */

// Donors must be fully approved to publish listings.
router.post(
  '/',
  requireRole('DONOR'),
  requireActiveAccount,
  imageUpload.array('images', 5),
  donationRules,
  validate,
  donationController.create,
);

router.put(
  '/:id',
  idParamRules,
  imageUpload.array('images', 5),
  donationRules,
  validate,
  donationController.update,
);

router.post('/:id/cancel', idParamRules, validate, donationController.cancel);

router.delete('/:id', idParamRules, validate, donationController.remove);

/* ------------------------------- detail ---------------------------------- */

router.get('/:id', idParamRules, validate, donationController.detail);
router.get('/:id/history', idParamRules, validate, donationController.history);

module.exports = router;
