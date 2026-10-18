/**
 * userController - profile management and public donor profiles.
 */
const userModel = require('../models/userModel');
const donationService = require('../services/donationService');
const feedbackService = require('../services/feedbackService');
const storageService = require('../services/storageService');
const { userPublic } = require('../utils/serializers');
const { ok } = require('../utils/respond');
const { ApiError } = require('../middleware/errorHandler');

/** GET /api/users/me */
async function getProfile(req, res) {
  const user = await userModel.findById(req.user.id);
  if (!user) throw ApiError.notFound('Account not found.');
  return ok(res, { user: userPublic(user) });
}

/**
 * PATCH /api/users/me
 * Accepts JSON or multipart/form-data (avatar upload).
 */
async function updateProfile(req, res) {
  const fields = {};

  if (req.body.fullName !== undefined) fields.fullName = req.body.fullName;
  if (req.body.phone !== undefined) fields.phone = req.body.phone;
  if (req.body.city !== undefined) fields.city = req.body.city;
  if (req.body.address !== undefined) fields.address = req.body.address;
  if (req.body.orgType !== undefined) fields.orgType = req.body.orgType;
  if (req.body.latitude !== undefined && req.body.latitude !== '') fields.latitude = Number(req.body.latitude);
  if (req.body.longitude !== undefined && req.body.longitude !== '') fields.longitude = Number(req.body.longitude);

  if (req.file) {
    const url = await storageService.persist(req.file, 'avatars');
    fields.avatarUrl = url;
  }

  if (Object.keys(fields).length === 0) {
    throw ApiError.badRequest('Nothing to update - provide at least one profile field.');
  }

  await userModel.update(req.user.id, fields);
  const user = await userModel.findById(req.user.id);
  return ok(res, { user: userPublic(user) });
}

/**
 * GET /api/users/donors/:id
 * Public donor profile: impact metrics, average rating and active listings.
 */
async function getDonorProfile(req, res) {
  const profile = await donationService.getDonorProfile(Number(req.params.id));
  return ok(res, profile);
}

/** GET /api/users/donors/:id/reviews */
async function getDonorReviews(req, res) {
  const result = await feedbackService.listDonorFeedback(Number(req.params.id), req.query);
  return ok(res, result);
}

module.exports = { getProfile, updateProfile, getDonorProfile, getDonorReviews };
