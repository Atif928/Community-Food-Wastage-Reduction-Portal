/**
 * feedbackService - post-delivery ratings ("food quality & hygiene").
 *
 * Rules
 *   * only the recipient who collected the donation may rate it
 *   * the donation must be DELIVERED
 *   * one rating per donation (enforced by UNIQUE(donation_id))
 *   * the donor is notified and their average rating updates automatically
 */
const feedbackModel = require('../models/feedbackModel');
const claimModel = require('../models/claimModel');
const userModel = require('../models/userModel');
const notificationService = require('./notificationService');
const { ApiError } = require('../middleware/errorHandler');
const { parsePagination, paginated } = require('../utils/helpers');
const { feedbackView } = require('../utils/serializers');

/**
 * Create feedback for a delivered donation.
 * Accepts either a claimId or a donationId so the UI can post from either view.
 */
async function createFeedback(recipientId, { claimId = null, donationId = null, rating, comment = null }) {
  const score = Number(rating);
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    throw ApiError.badRequest('Rating must be a whole number between 1 and 5.');
  }

  // Resolve the claim (and therefore the donation + donor).
  const claim = claimId
    ? await claimModel.findById(claimId)
    : await claimModel.findByDonationId(donationId);

  if (!claim) throw ApiError.notFound('Claim not found for that donation.');
  if (claim.recipient_id !== recipientId) {
    throw ApiError.forbidden('Only the recipient who collected this donation can rate it.');
  }
  if (claim.status !== 'DELIVERED') {
    throw ApiError.conflict('You can rate a donation once the delivery is confirmed.');
  }

  const existing = await feedbackModel.findByDonation(claim.donation_id);
  if (existing) throw ApiError.conflict('You have already rated this donation.');

  const recipient = await userModel.findById(recipientId);

  let feedbackId;
  try {
    feedbackId = await feedbackModel.create({
      donationId: claim.donation_id,
      recipientId,
      donorId: claim.donor_id,
      rating: score,
      comment: comment?.trim() || null,
    });
  } catch (err) {
    if (err && (err.code === 'ER_DUP_ENTRY' || err.code === '23505')) {
      throw ApiError.conflict('You have already rated this donation.');
    }
    throw err;
  }

  notificationService.notifyFeedbackReceived({
    donorId: claim.donor_id,
    rating: score,
    comment: comment?.trim() || null,
    donationTitle: claim.donation_title,
    recipientName: recipient?.full_name || 'A recipient',
  }).catch(() => {});

  return { id: feedbackId, donationId: claim.donation_id, rating: score, comment: comment || null };
}

/** Reviews received by a donor (public profile view). */
async function listDonorFeedback(donorId, query = {}) {
  const { page, limit, offset } = parsePagination(query, { defaultLimit: 10 });
  const { rows, total } = await feedbackModel.listForDonor(donorId, { limit, offset });
  return {
    ...paginated(rows.map(feedbackView), total, page, limit),
    summary: await getDonorRatingSummary(donorId),
  };
}

/** Aggregate rating for a donor. */
async function getDonorRatingSummary(donorId) {
  const summary = await feedbackModel.donorRatingSummary(donorId);
  return {
    average: summary.average_rating === null || summary.average_rating === undefined
      ? null
      : Number(summary.average_rating),
    count: Number(summary.rating_count || 0),
    distribution: {
      5: Number(summary.five_star || 0),
      4: Number(summary.four_star || 0),
      3: Number(summary.three_star || 0),
      2: Number(summary.two_star || 0),
      1: Number(summary.one_star || 0),
    },
  };
}

/** Feedback left on one donation. */
async function getFeedbackForDonation(donationId) {
  return feedbackView(await feedbackModel.findByDonation(donationId));
}

module.exports = {
  createFeedback,
  listDonorFeedback,
  getDonorRatingSummary,
  getFeedbackForDonation,
};
