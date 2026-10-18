/**
 * claimService - the claiming + delivery workflow.
 *
 * RACE CONDITION HANDLING (the important part)
 * --------------------------------------------
 * Two recipients can press "Claim" on the same listing at the same millisecond.
 * We make that impossible with three layers:
 *
 *   1. `SELECT ... FOR UPDATE` on the donation row (claimModel.lockDonation)
 *      serialises the two transactions - the second one waits, then sees
 *      status = CLAIMED.
 *   2. A guarded UPDATE (`WHERE status = 'AVAILABLE'`) - if the row changed
 *      underneath us, affectedRows is 0 and we abort with a 409.
 *   3. UNIQUE(donation_id) on the claims table - the database's final word, so
 *      even a bug in the layers above cannot produce two claims.
 */
const claimModel = require('../models/claimModel');
const donationModel = require('../models/donationModel');
const statusHistoryModel = require('../models/statusHistoryModel');
const userModel = require('../models/userModel');
const storageService = require('./storageService');
const notificationService = require('./notificationService');
const { ApiError } = require('../middleware/errorHandler');
const { withTransaction } = require('../config/db');
const { parsePagination, paginated } = require('../utils/helpers');
const { claimView } = require('../utils/serializers');

/**
 * Claim a donation.
 * @param {number} recipientId the signed-in recipient
 * @param {number} donationId listing to claim
 * @param {object} options { pickupNote }
 */
async function claimDonation(recipientId, donationId, { pickupNote = null } = {}) {
  const recipient = await userModel.findById(recipientId);
  if (!recipient) throw ApiError.notFound('Recipient account not found.');

  let claimId;

  try {
    claimId = await withTransaction(async (conn) => {
      // 1) Row lock: everyone else trying to claim this donation now waits.
      const donation = await claimModel.lockDonation(donationId, conn);
      if (!donation) throw ApiError.notFound('Listing not found.');

      if (donation.donor_id === recipientId) {
        throw ApiError.badRequest('You cannot claim your own donation.');
      }
      if (donation.status === 'CLAIMED' || donation.status === 'DELIVERED') {
        throw ApiError.conflict('Sorry, this listing has already been claimed.');
      }
      if (donation.status === 'CANCELLED') {
        throw ApiError.conflict('This listing was cancelled by the donor.');
      }
      if (new Date(donation.best_before).getTime() <= Date.now()) {
        throw ApiError.conflict('This listing has expired and is no longer available.');
      }

      // 2) Insert the claim, then flip the listing status with a guarded update.
      const newClaimId = await claimModel.create({ donationId, recipientId, pickupNote }, conn);

      const affected = await donationModel.transitionStatus(donationId, 'AVAILABLE', 'CLAIMED', conn);
      if (affected === 0) {
        // Someone beat us between the lock and the update (should not happen,
        // but never trust a distributed system).
        throw ApiError.conflict('This listing was just claimed by someone else.');
      }

      await statusHistoryModel.add({
        donationId,
        status: 'CLAIMED',
        changedBy: recipientId,
        note: `Claimed by ${recipient.full_name}`,
      }, conn);

      return newClaimId;
    });
  } catch (err) {
    // 3) Unique index violation == someone else won the race.
    if (err && (err.code === 'ER_DUP_ENTRY' || err.code === '23505')) {
      throw ApiError.conflict('Sorry, this listing has already been claimed.');
    }
    throw err;
  }

  // Post-commit side effects (never inside the transaction).
  const claim = await claimModel.findById(claimId);
  notificationService.notifyClaimCreated(claim).catch(() => {});

  return claimView(claim);
}

/** The signed-in recipient's claim history. */
async function listMyClaims(recipientId, filters = {}, query = {}) {
  const { page, limit, offset } = parsePagination(query, { defaultLimit: 10 });
  const { rows, total } = await claimModel.listByRecipient(recipientId, {
    status: filters.status,
    search: filters.search,
  }, { limit, offset });

  return paginated(rows.map(claimView), total, page, limit);
}

/** A single claim, visible to its recipient, its donor and admins. */
async function getClaim(actor, claimId) {
  const claim = await claimModel.findById(claimId);
  if (!claim) throw ApiError.notFound('Claim not found.');

  const allowed =
    actor.role === 'ADMIN' || claim.recipient_id === actor.id || claim.donor_id === actor.id;

  if (!allowed) throw ApiError.forbidden('You do not have access to this claim.');
  return claimView(claim);
}

/**
 * Recipient confirms the pickup -> claim DELIVERED, donation DELIVERED.
 * The donor can then be rated by the recipient.
 */
async function markDelivered(recipientId, claimId, { proofFile = null, note = null } = {}) {
  const claim = await claimModel.findById(claimId);
  if (!claim) throw ApiError.notFound('Claim not found.');

  if (claim.recipient_id !== recipientId) {
    throw ApiError.forbidden('Only the recipient who made the claim can confirm delivery.');
  }
  if (claim.status === 'DELIVERED') {
    throw ApiError.conflict('This pickup has already been confirmed.');
  }
  if (claim.status !== 'ACTIVE') {
    throw ApiError.conflict('This claim is no longer active.');
  }

  // Store the optional proof photo outside the transaction.
  let proofUrl = null;
  if (proofFile) {
    const urls = await storageService.persistMany([proofFile], 'deliveries');
    proofUrl = urls[0] || null;
  }

  await withTransaction(async (conn) => {
    const affected = await claimModel.markDelivered(claimId, { proofUrl }, conn);
    if (affected === 0) throw ApiError.conflict('This claim is no longer active.');

    const donationChanged = await donationModel.transitionStatus(
      claim.donation_id,
      'CLAIMED',
      'DELIVERED',
      conn,
    );
    if (donationChanged === 0) {
      // Keep the two tables consistent even if the listing was already moved.
      await donationModel.update(claim.donation_id, { status: 'DELIVERED' }, conn);
    }

    await statusHistoryModel.add({
      donationId: claim.donation_id,
      status: 'DELIVERED',
      changedBy: recipientId,
      note: note || 'Delivery confirmed by recipient',
    }, conn);
  });

  const updated = await claimModel.findById(claimId);
  notificationService.notifyDelivered(updated).catch(() => {});

  return claimView(updated);
}

/** Recipient backs out of an active claim; the listing becomes available again. */
async function cancelClaim(recipientId, claimId, { reason = null } = {}) {
  const claim = await claimModel.findById(claimId);
  if (!claim) throw ApiError.notFound('Claim not found.');

  if (claim.recipient_id !== recipientId) {
    throw ApiError.forbidden('Only the recipient who made the claim can cancel it.');
  }
  if (claim.status !== 'ACTIVE') {
    throw ApiError.conflict('Only active claims can be cancelled.');
  }

  await withTransaction(async (conn) => {
    const affected = await claimModel.cancel(claimId, conn);
    if (affected === 0) throw ApiError.conflict('This claim is no longer active.');

    await donationModel.transitionStatus(claim.donation_id, 'CLAIMED', 'AVAILABLE', conn);

    await statusHistoryModel.add({
      donationId: claim.donation_id,
      status: 'AVAILABLE',
      changedBy: recipientId,
      note: reason ? `Claim cancelled: ${reason}` : 'Claim cancelled by recipient - listing re-opened',
    }, conn);
  });

  notificationService.notifyClaimCancelled(claim).catch(() => {});
  return { cancelled: true, claimId };
}

module.exports = {
  claimDonation,
  listMyClaims,
  getClaim,
  markDelivered,
  cancelClaim,
};
