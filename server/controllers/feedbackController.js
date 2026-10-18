/**
 * feedbackController - ratings and reviews.
 */
const feedbackService = require('../services/feedbackService');
const { ok, created } = require('../utils/respond');

/** POST /api/feedback (recipient, after a confirmed delivery) */
async function create(req, res) {
  const feedback = await feedbackService.createFeedback(req.user.id, {
    claimId: req.body.claimId ? Number(req.body.claimId) : null,
    donationId: req.body.donationId ? Number(req.body.donationId) : null,
    rating: req.body.rating,
    comment: req.body.comment || null,
  });
  return created(res, { feedback });
}

/** GET /api/feedback/donor/:donorId */
async function donorReviews(req, res) {
  const result = await feedbackService.listDonorFeedback(Number(req.params.donorId), req.query);
  return ok(res, result);
}

/** GET /api/feedback/donation/:donationId */
async function donationFeedback(req, res) {
  const feedback = await feedbackService.getFeedbackForDonation(Number(req.params.donationId));
  return ok(res, { feedback });
}

module.exports = { create, donorReviews, donationFeedback };
