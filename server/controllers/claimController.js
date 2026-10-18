/**
 * claimController - claiming a donation and confirming delivery.
 */
const claimService = require('../services/claimService');
const { ok, created } = require('../utils/respond');

/** POST /api/claims (recipient) */
async function claim(req, res) {
  const claim = await claimService.claimDonation(req.user.id, Number(req.body.donationId), {
    pickupNote: req.body.pickupNote || null,
  });
  return created(res, { claim });
}

/** GET /api/claims/mine (recipient history) */
async function mine(req, res) {
  const filters = {
    status: req.query.status ? String(req.query.status).toUpperCase() : undefined,
    search: req.query.search,
  };
  const result = await claimService.listMyClaims(req.user.id, filters, req.query);
  return ok(res, result);
}

/** GET /api/claims/:id */
async function detail(req, res) {
  const claim = await claimService.getClaim(req.user, Number(req.params.id));
  return ok(res, { claim });
}

/**
 * POST /api/claims/:id/deliver (recipient)
 * multipart/form-data when a proof photo is attached.
 */
async function deliver(req, res) {
  // Multer stores the file first; the service decides where it ends up.
  const claim = await claimService.markDelivered(req.user.id, Number(req.params.id), {
    proofFile: req.file || null,
    note: req.body.note || null,
  });
  return ok(res, { claim });
}

/** POST /api/claims/:id/cancel (recipient) */
async function cancel(req, res) {
  const result = await claimService.cancelClaim(req.user.id, Number(req.params.id), {
    reason: req.body.reason || null,
  });
  return ok(res, result);
}

module.exports = { claim, mine, detail, deliver, cancel };
