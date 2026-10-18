/**
 * donationController - listing CRUD, feed search and donor tables.
 */
const donationService = require('../services/donationService');
const { ok, created } = require('../utils/respond');

/** Optional coordinates supplied on the query string (for distance). */
function coordinatesFrom(req) {
  const { latitude, longitude } = req.query;
  if (latitude === undefined || longitude === undefined) return {};
  return { latitude: Number(latitude), longitude: Number(longitude) };
}

/** POST /api/donations (donor) - JSON or multipart with up to 5 photos. */
async function create(req, res) {
  const donation = await donationService.createDonation(req.user.id, req.body, req.files || []);
  return created(res, { donation });
}

/** PUT /api/donations/:id (owner or admin) */
async function update(req, res) {
  const donation = await donationService.updateDonation(
    req.user,
    Number(req.params.id),
    req.body,
    req.files || [],
  );
  return ok(res, { donation });
}

/** DELETE /api/donations/:id (owner or admin) */
async function remove(req, res) {
  const result = await donationService.deleteDonation(req.user, Number(req.params.id));
  return ok(res, result);
}

/** POST /api/donations/:id/cancel (owner or admin) */
async function cancel(req, res) {
  const donation = await donationService.cancelDonation(req.user, Number(req.params.id));
  return ok(res, { donation });
}

/** GET /api/donations/:id */
async function detail(req, res) {
  const donation = await donationService.getDonation(
    req.user,
    Number(req.params.id),
    coordinatesFrom(req),
  );
  return ok(res, { donation });
}

/** GET /api/donations/:id/history */
async function history(req, res) {
  // Reuse the detail visibility rules before exposing the timeline.
  await donationService.getDonation(req.user, Number(req.params.id));
  const statusHistory = await donationService.getStatusHistory(Number(req.params.id));
  return ok(res, { statusHistory });
}

/**
 * GET /api/donations - the recipient feed.
 * Available, unexpired listings with optional city / category / radius filters.
 */
async function browse(req, res) {
  const filters = {
    city: req.query.city,
    categoryId: req.query.categoryId ? Number(req.query.categoryId) : undefined,
    type: req.query.type ? String(req.query.type).toUpperCase() : undefined,
    search: req.query.search,
    sort: req.query.sort,
    latitude: req.query.latitude !== undefined ? Number(req.query.latitude) : undefined,
    longitude: req.query.longitude !== undefined ? Number(req.query.longitude) : undefined,
    radiusKm: req.query.radiusKm !== undefined ? Number(req.query.radiusKm) : undefined,
    // A donor never needs to see their own listings in the claimable feed.
    excludeDonorId: req.user?.role === 'DONOR' ? req.user.id : undefined,
  };

  const result = await donationService.searchAvailable(filters, req.query);
  return ok(res, result);
}

/** GET /api/donations/mine (donor) */
async function myListings(req, res) {
  const filters = {
    status: req.query.status ? String(req.query.status).toUpperCase() : undefined,
    search: req.query.search,
    categoryId: req.query.categoryId ? Number(req.query.categoryId) : undefined,
    sort: req.query.sort,
  };
  const result = await donationService.getMyDonations(req.user.id, filters, req.query);
  return ok(res, result);
}

/** GET /api/donations/claims-received (donor) */
async function receivedClaims(req, res) {
  const filters = {
    status: req.query.status ? String(req.query.status).toUpperCase() : undefined,
    search: req.query.search,
  };
  const result = await donationService.getReceivedClaims(req.user.id, filters, req.query);
  return ok(res, result);
}

/** GET /api/donations/cities */
async function cities(req, res) {
  return ok(res, { cities: await donationService.getCities() });
}

module.exports = {
  create,
  update,
  remove,
  cancel,
  detail,
  history,
  browse,
  myListings,
  receivedClaims,
  cities,
};
