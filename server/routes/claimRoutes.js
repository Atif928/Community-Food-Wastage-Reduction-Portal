/**
 * Claim routes: /api/claims/*
 */
const express = require('express');
const claimController = require('../controllers/claimController');
const { authenticate, requireRole, requireActiveAccount } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { deliveryUpload } = require('../middleware/upload');
const { claimRules, deliverRules, cancelClaimRules, claimFilterRules } = require('../validators/claimValidators');
const { idParamRules, paginationRules } = require('../validators/commonValidators');

const router = express.Router();

router.use(authenticate);

// Recipients claim food (approved accounts only).
router.post(
  '/',
  requireRole('RECIPIENT'),
  requireActiveAccount,
  claimRules,
  validate,
  claimController.claim,
);

// Static path before /:id.
router.get(
  '/mine',
  requireRole('RECIPIENT'),
  claimFilterRules,
  paginationRules,
  validate,
  claimController.mine,
);

router.get('/:id', idParamRules, validate, claimController.detail);

// Recipient confirms the pickup (optionally with a proof photo).
router.post(
  '/:id/deliver',
  requireRole('RECIPIENT'),
  idParamRules,
  deliveryUpload.single('proof'),
  deliverRules,
  validate,
  claimController.deliver,
);

// Recipient backs out - the listing becomes available again.
router.post(
  '/:id/cancel',
  requireRole('RECIPIENT'),
  idParamRules,
  cancelClaimRules,
  validate,
  claimController.cancel,
);

module.exports = router;
