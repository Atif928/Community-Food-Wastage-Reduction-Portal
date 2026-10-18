/**
 * dashboardController - the two role dashboards.
 */
const donationService = require('../services/donationService');
const { ok } = require('../utils/respond');

/** GET /api/dashboard/donor */
async function donorDashboard(req, res) {
  const data = await donationService.getDonorDashboard(req.user.id);
  return ok(res, data);
}

/** GET /api/dashboard/recipient */
async function recipientDashboard(req, res) {
  const data = await donationService.getRecipientDashboard(req.user.id);
  return ok(res, data);
}

module.exports = { donorDashboard, recipientDashboard };
