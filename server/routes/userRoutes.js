/**
 * User / profile routes: /api/users/*
 */
const express = require('express');
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { avatarUpload } = require('../middleware/upload');
const { updateProfileRules } = require('../validators/authValidators');
const { idParamRules, paginationRules } = require('../validators/commonValidators');

const router = express.Router();

// Every user route requires a valid session.
router.use(authenticate);

router.get('/me', userController.getProfile);

// multipart/form-data when an avatar is uploaded, JSON otherwise.
router.patch(
  '/me',
  avatarUpload.single('avatar'),
  updateProfileRules,
  validate,
  userController.updateProfile,
);

// Public donor profile + reviews (still behind auth so the directory is not
// scrapeable by anonymous visitors).
router.get('/donors/:id', idParamRules, validate, userController.getDonorProfile);
router.get('/donors/:id/reviews', idParamRules, paginationRules, validate, userController.getDonorReviews);

module.exports = router;
