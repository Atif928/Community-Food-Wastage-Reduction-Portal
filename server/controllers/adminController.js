/**
 * adminController - the system administrator's toolkit.
 *
 * Covers: dashboard overview, charts/reports, user management, NGO/shelter
 * verification decisions, donation moderation and broadcasts.
 */
const userModel = require('../models/userModel');
const verificationModel = require('../models/verificationModel');
const donationModel = require('../models/donationModel');
const claimModel = require('../models/claimModel');
const statusHistoryModel = require('../models/statusHistoryModel');
const notificationModel = require('../models/notificationModel');
const reportService = require('../services/reportService');
const notificationService = require('../services/notificationService');
const storageService = require('../services/storageService');
const { userPublic, verificationView, donationSummary, numericRow } = require('../utils/serializers');
const { parsePagination, paginated } = require('../utils/helpers');
const { ok } = require('../utils/respond');
const { ApiError } = require('../middleware/errorHandler');
const { withTransaction } = require('../config/db');

/** GET /api/admin/overview - headline cards for the admin dashboard. */
async function overview(req, res) {
  const reports = await reportService.getAdminReports({ months: 6 });

  // A few recent notifications make the dashboard feel alive.
  const recentUsers = await userModel.list({}, { limit: 5, offset: 0 });

  return ok(res, {
    headline: reports.headline,
    monthlyTrend: reports.monthlyTrend,
    citySummary: reports.citySummary.slice(0, 6),
    topDonors: reports.topDonors,
    latestUsers: recentUsers.rows.map(userPublic),
  });
}

/** GET /api/admin/reports?months=6 - full chart payload. */
async function reports(req, res) {
  const data = await reportService.getAdminReports({ months: req.query.months });
  return ok(res, data);
}

/** GET /api/admin/users */
async function listUsers(req, res) {
  const { page, limit, offset } = parsePagination(req.query, { defaultLimit: 20 });

  const { rows, total } = await userModel.list({
    role: req.query.role ? String(req.query.role).toUpperCase() : undefined,
    status: req.query.status ? String(req.query.status).toUpperCase() : undefined,
    orgType: req.query.orgType ? String(req.query.orgType).toUpperCase() : undefined,
    search: req.query.search,
  }, { limit, offset });

  return ok(res, paginated(rows.map(userPublic), total, page, limit));
}

/** GET /api/admin/users/:id */
async function getUser(req, res) {
  const user = await userModel.findById(Number(req.params.id));
  if (!user) throw ApiError.notFound('User not found.');

  const verification = user.role === 'RECIPIENT'
    ? await verificationModel.findByUserId(user.id)
    : null;

  const { rows: donations } = await donationModel.search(
    { donorId: user.id, includeExpired: true },
    { limit: 5, offset: 0 },
    'newest',
  );

  const { rows: claims } = await claimModel.listByRecipient(
    user.id,
    {},
    { limit: 5, offset: 0 },
  );

  return ok(res, {
    user: userPublic(user),
    verification: verification ? verificationView(verification) : null,
    recentDonations: donations.map(donationSummary),
    recentClaims: claims.map((row) => ({
      id: row.id,
      status: row.status,
      donationId: row.donation_id,
      donationTitle: row.donation_title,
      donorName: row.donor_name,
      claimedAt: row.claimed_at,
      deliveredAt: row.delivered_at,
    })),
  });
}

/**
 * PATCH /api/admin/users/:id/status
 * Activate, suspend or send a user back to pending verification.
 */
async function updateUserStatus(req, res) {
  const userId = Number(req.params.id);
  const status = String(req.body.accountStatus).toUpperCase();

  const user = await userModel.findById(userId);
  if (!user) throw ApiError.notFound('User not found.');
  if (user.role === 'ADMIN' && status !== 'ACTIVE') {
    throw ApiError.badRequest('Admin accounts cannot be suspended from this endpoint.');
  }

  await userModel.setAccountStatus(userId, status);

  // Tell the user what happened (unless an admin is just re-activating silently).
  if (status === 'SUSPENDED') {
    await notificationService.notifyUser({
      userId,
      type: 'ACCOUNT_SUSPENDED',
      title: 'Your account was suspended',
      message: req.body.note || 'An administrator suspended your account. Contact support for details.',
    });
  } else if (status === 'ACTIVE') {
    await notificationService.notifyUser({
      userId,
      type: 'ACCOUNT_ACTIVATED',
      title: 'Your account is active',
      message: req.body.note || 'Your account is now active. You can continue using the portal.',
    });
  }

  return ok(res, { user: userPublic(await userModel.findById(userId)) });
}

/** GET /api/admin/verifications?status=PENDING */
async function listVerifications(req, res) {
  const { page, limit, offset } = parsePagination(req.query, { defaultLimit: 20 });

  const { rows, total } = await verificationModel.list({
    status: req.query.status ? String(req.query.status).toUpperCase() : 'PENDING',
    search: req.query.search,
  }, { limit, offset });

  return ok(res, paginated(rows.map(verificationView), total, page, limit));
}

/**
 * PATCH /api/admin/verifications/:id
 * Approve or reject an NGO/shelter and flip the user's account_status atomically.
 */
async function reviewVerification(req, res) {
  const verificationId = Number(req.params.id);
  const status = String(req.body.status).toUpperCase();
  const reviewNote = req.body.reviewNote || null;

  // Find the record first so we know which user it belongs to.
  const record = await verificationModel.findById(verificationId);
  if (!record) throw ApiError.notFound('Verification record not found.');
  if (record.status !== 'PENDING') {
    throw ApiError.conflict('This verification has already been reviewed.');
  }

  await withTransaction(async (conn) => {
    await verificationModel.review(verificationId, {
      status,
      reviewNote,
      reviewedBy: req.user.id,
    }, conn);

    await userModel.setAccountStatus(
      record.user_id,
      status === 'APPROVED' ? 'ACTIVE' : 'PENDING_VERIFICATION',
      conn,
    );
  });

  const applicant = await userModel.findById(record.user_id);
  await notificationService.notifyVerificationDecision({
    user: applicant,
    approved: status === 'APPROVED',
    note: reviewNote,
  });

  // Let the admin's own badge reflect that one fewer item is pending.
  return ok(res, {
    verification: verificationView(await verificationModel.findByUserId(record.user_id)),
    user: userPublic(applicant),
  });
}

/** GET /api/admin/donations - every listing, expired included. */
async function listDonations(req, res) {
  const { page, limit, offset } = parsePagination(req.query, { defaultLimit: 20 });

  const { rows, total } = await donationModel.adminList({
    status: req.query.status ? String(req.query.status).toUpperCase() : undefined,
    city: req.query.city,
    search: req.query.search,
    categoryId: req.query.categoryId ? Number(req.query.categoryId) : undefined,
  }, { limit, offset });

  return ok(res, paginated(rows.map((row) => ({
    ...donationSummary(row),
    claim: row.claim_id
      ? {
        id: row.claim_id,
        status: row.claim_status,
        claimedAt: row.claimed_at,
        deliveredAt: row.delivered_at,
        recipientId: row.recipient_id,
        recipientName: row.recipient_name,
      }
      : null,
  })), total, page, limit));
}

/** PATCH /api/admin/donations/:id - force a status change (moderation). */
async function updateDonationStatus(req, res) {
  const donationId = Number(req.params.id);
  const status = String(req.body.status).toUpperCase();
  const note = req.body.note || 'Status changed by administrator';

  const donation = await donationModel.findById(donationId);
  if (!donation) throw ApiError.notFound('Listing not found.');

  await withTransaction(async (conn) => {
    await donationModel.update(donationId, { status }, conn);
    await statusHistoryModel.add({
      donationId,
      status,
      changedBy: req.user.id,
      note,
    }, conn);
  });

  const updated = await donationModel.findById(donationId);
  return ok(res, { donation: donationSummary(updated) });
}

/** DELETE /api/admin/donations/:id */
async function deleteDonation(req, res) {
  const donationId = Number(req.params.id);
  const donation = await donationModel.findById(donationId);
  if (!donation) throw ApiError.notFound('Listing not found.');

  const images = await donationModel.listImages(donationId);
  await donationModel.remove(donationId);
  await Promise.all(images.map((img) => storageService.remove(img.image_url)));

  return ok(res, { deleted: true, id: donationId });
}

/** GET /api/admin/stats - compact counters (badges, sidebar). */
async function stats(req, res) {
  const [users, pendingVerifications, expired, claims] = await Promise.all([
    userModel.countsByRole(),
    verificationModel.countPending(),
    donationModel.countExpired(),
    claimModel.claimTotals(),
  ]);

  return ok(res, {
    users,
    pendingVerifications,
    expiredListings: expired,
    claims: numericRow(claims, ['total_claims', 'active_claims', 'delivered_claims', 'cancelled_claims']),
  });
}

/**
 * POST /api/admin/broadcast
 * Send an in-app notification to every (or every donor / recipient) active user.
 */
async function broadcast(req, res) {
  const audience = String(req.body.audience || 'ALL').toUpperCase();
  const role = audience === 'ALL' ? undefined : audience;

  const { rows } = await userModel.list({ role, status: 'ACTIVE' }, { limit: 500, offset: 0 });
  const items = rows
    .filter((user) => user.role !== 'ADMIN')
    .map((user) => ({
      userId: user.id,
      type: 'ADMIN_BROADCAST',
      title: req.body.title,
      message: req.body.message,
    }));

  const sent = await notificationModel.createMany(items);
  return ok(res, { sent });
}

module.exports = {
  overview,
  reports,
  listUsers,
  getUser,
  updateUserStatus,
  listVerifications,
  reviewVerification,
  listDonations,
  updateDonationStatus,
  deleteDonation,
  stats,
  broadcast,
};
