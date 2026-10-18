/**
 * donationService - business rules for food listings.
 *
 * Owns the full listing lifecycle: create (with photos + audit trail + nearby
 * notifications), update, cancel, delete, detail views, feed search and the
 * donor / recipient dashboards.
 */
const donationModel = require('../models/donationModel');
const claimModel = require('../models/claimModel');
const feedbackModel = require('../models/feedbackModel');
const statusHistoryModel = require('../models/statusHistoryModel');
const userModel = require('../models/userModel');
const storageService = require('./storageService');
const notificationService = require('./notificationService');
const { ApiError } = require('../middleware/errorHandler');
const { withTransaction } = require('../config/db');
const { toSqlTimestamp, parsePagination, paginated, estimateMeals } = require('../utils/helpers');
const { donationSummary, donationDetail, claimView, numericRow } = require('../utils/serializers');
const { isValidCoordinate } = require('../utils/geo');

const MAX_IMAGES = 5;

/** Map an API payload onto model column names, converting the date. */
function mapPayload(payload) {
  const unit = payload.unit === 'servings' ? 'servings' : 'kg';

  return {
    categoryId: Number(payload.categoryId),
    title: payload.title?.trim(),
    description: payload.description?.trim() || null,
    unit,
    // Only keep the quantity that matches the chosen unit.
    quantityKg: unit === 'kg' ? Number(payload.quantityKg ?? payload.quantity ?? 0) : null,
    quantityServings: unit === 'servings' ? Number(payload.quantityServings ?? payload.quantity ?? 0) : null,
    bestBefore: toSqlTimestamp(new Date(payload.bestBefore)),
    pickupAddress: payload.pickupAddress?.trim() || null,
    pickupCity: payload.pickupCity?.trim(),
    pickupLatitude: Number(payload.pickupLatitude ?? payload.latitude),
    pickupLongitude: Number(payload.pickupLongitude ?? payload.longitude),
  };
}

/** Basic sanity checks shared by create and update. */
function assertListingInput(data) {
  if (!data.title) throw ApiError.badRequest('A listing title is required.');
  if (!Number.isFinite(data.categoryId) || data.categoryId <= 0) {
    throw ApiError.badRequest('A valid food category is required.');
  }
  if (!data.pickupCity) throw ApiError.badRequest('Pickup city is required.');
  if (!isValidCoordinate(data.pickupLatitude, data.pickupLongitude)) {
    throw ApiError.badRequest('A valid pickup location (latitude & longitude) is required.');
  }
  if (new Date(data.bestBefore).getTime() <= Date.now()) {
    throw ApiError.badRequest('The "best before" time must be in the future.');
  }
  const quantity = data.unit === 'kg' ? data.quantityKg : data.quantityServings;
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw ApiError.badRequest('Quantity must be greater than zero.');
  }
}

/** Assemble the full detail object for a listing id. */
async function loadDetail(donationId, coordinates = {}) {
  const row = await donationModel.findByIdWithClaim(donationId, coordinates);
  if (!row) return null;

  const [images, history, claim, feedback] = await Promise.all([
    donationModel.listImages(donationId),
    statusHistoryModel.listByDonation(donationId),
    claimModel.findByDonationId(donationId),
    feedbackModel.findByDonation(donationId),
  ]);

  return donationDetail(row, {
    images,
    history,
    claim: claim ? claimView(claim) : null,
    feedback,
  });
}

/**
 * Create a listing.
 * Photos are persisted first (outside the transaction) so a slow storage
 * provider cannot hold a database lock.
 */
async function createDonation(donorId, payload, files = []) {
  const data = mapPayload(payload);
  assertListingInput(data);

  if (files.length > MAX_IMAGES) {
    throw ApiError.badRequest(`You can attach at most ${MAX_IMAGES} photos.`);
  }

  const imageUrls = await storageService.persistMany(files.slice(0, MAX_IMAGES), 'donations');

  const donationId = await withTransaction(async (conn) => {
    const id = await donationModel.create({ donorId, ...data }, conn);

    if (imageUrls.length) {
      await donationModel.addImages(id, imageUrls.map((url, index) => ({ url, isPrimary: index === 0 })), conn);
    }

    // Opening entry of the audit trail.
    await statusHistoryModel.add({
      donationId: id,
      status: 'AVAILABLE',
      changedBy: donorId,
      note: 'Listing created',
    }, conn);

    return id;
  });

  const detail = await loadDetail(donationId);

  // Notify recipients within the configured radius (post-commit, best effort).
  notificationService
    .notifyNearbyRecipients(detail, {})
    .catch(() => {});

  return detail;
}

/** Update an available listing owned by the actor (admin may override). */
async function updateDonation(actor, donationId, payload, files = []) {
  const existing = await donationModel.findById(donationId);
  if (!existing) throw ApiError.notFound('Listing not found.');

  const isOwner = existing.donor_id === actor.id;
  const isAdmin = actor.role === 'ADMIN';
  if (!isOwner && !isAdmin) throw ApiError.forbidden('You can only edit your own listings.');
  if (existing.status !== 'AVAILABLE' && !isAdmin) {
    throw ApiError.conflict('Only listings that are still available can be edited.');
  }

  const data = mapPayload(payload);
  // When an admin edits a listing in a terminal state we still validate, but
  // keep the existing status untouched (mapPayload never sets status).
  assertListingInput(data);

  if (files.length > MAX_IMAGES) {
    throw ApiError.badRequest(`You can attach at most ${MAX_IMAGES} photos.`);
  }

  // Persist the new photos BEFORE opening the transaction so a slow storage
  // provider never holds a row lock.
  const newImageUrls = files.length
    ? await storageService.persistMany(files.slice(0, MAX_IMAGES), 'donations')
    : [];

  let replacedImages = [];

  await withTransaction(async (conn) => {
    await donationModel.update(donationId, data, conn);

    // Photo replacement is all-or-nothing: when new files are supplied the old
    // gallery is dropped, otherwise the existing photos are kept as-is.
    if (newImageUrls.length) {
      replacedImages = await donationModel.listImages(donationId, conn);
      await donationModel.deleteImages(donationId, conn);
      await donationModel.addImages(
        donationId,
        newImageUrls.map((url, index) => ({ url, isPrimary: index === 0 })),
        conn,
      );
    }
  });

  // Only remove the old files once the database has committed.
  if (replacedImages.length) {
    await Promise.all(replacedImages.map((img) => storageService.remove(img.image_url)));
  }

  return loadDetail(donationId);
}

/** Cancel an available listing (donor backs out before anyone claims it). */
async function cancelDonation(actor, donationId) {
  const existing = await donationModel.findById(donationId);
  if (!existing) throw ApiError.notFound('Listing not found.');

  const isOwner = existing.donor_id === actor.id;
  if (!isOwner && actor.role !== 'ADMIN') {
    throw ApiError.forbidden('You can only cancel your own listings.');
  }
  if (existing.status !== 'AVAILABLE') {
    throw ApiError.conflict('Only available listings can be cancelled.');
  }

  const changed = await withTransaction(async (conn) => {
    const affected = await donationModel.transitionStatus(donationId, 'AVAILABLE', 'CANCELLED', conn);
    if (affected === 0) return 0;
    await statusHistoryModel.add({
      donationId,
      status: 'CANCELLED',
      changedBy: actor.id,
      note: 'Listing cancelled by donor',
    }, conn);
    return affected;
  });

  if (changed === 0) throw ApiError.conflict('This listing was just claimed and can no longer be cancelled.');
  return loadDetail(donationId);
}

/** Delete a listing; blocked while an active claim exists (except for admins). */
async function deleteDonation(actor, donationId) {
  const row = await donationModel.findByIdWithClaim(donationId);
  if (!row) throw ApiError.notFound('Listing not found.');

  const isOwner = row.donor_id === actor.id;
  const isAdmin = actor.role === 'ADMIN';
  if (!isOwner && !isAdmin) throw ApiError.forbidden('You can only delete your own listings.');

  if (row.claim_id && row.claim_status === 'ACTIVE' && !isAdmin) {
    throw ApiError.conflict('This listing has an active claim. Cancel the claim before deleting it.');
  }

  const images = await donationModel.listImages(donationId);

  await withTransaction(async (conn) => {
    await donationModel.remove(donationId, conn); // images/history/claims cascade
  });

  // Clean up the physical files after the database has committed.
  await Promise.all(images.map((img) => storageService.remove(img.image_url)));

  return { deleted: true, id: donationId };
}

/**
 * Listing detail with visibility rules:
 *   ADMIN / owner / the recipient who claimed it -> everything
 *   any authenticated user                        -> only while AVAILABLE
 */
async function getDonation(actor, donationId, coordinates = {}) {
  const row = await donationModel.findByIdWithClaim(donationId, coordinates);
  if (!row) throw ApiError.notFound('Listing not found.');

  const isAdmin = actor?.role === 'ADMIN';
  const isOwner = actor?.id === row.donor_id;
  const isClaimant = actor?.id === row.recipient_id;

  if (!isAdmin && !isOwner && !isClaimant && !['AVAILABLE', 'CANCELLED'].includes(row.status)) {
    throw ApiError.forbidden('This listing is no longer publicly visible.');
  }

  const [images, history, claim, feedback] = await Promise.all([
    donationModel.listImages(donationId),
    statusHistoryModel.listByDonation(donationId),
    claimModel.findByDonationId(donationId),
    feedbackModel.findByDonation(donationId),
  ]);

  return donationDetail(row, {
    images,
    history,
    claim: claim ? claimView(claim) : null,
    feedback,
  });
}

/** Donation timeline for the detail drawer (kept separate for clarity). */
async function getStatusHistory(donationId) {
  const history = await statusHistoryModel.listByDonation(donationId);
  return history.map((h) => ({
    id: h.id,
    status: h.status,
    note: h.note,
    changedBy: { id: h.changed_by, name: h.changed_by_name, role: h.changed_by_role },
    changedAt: h.changed_at,
  }));
}

/** Recipient feed: available + not expired + optional geo/city/category filters. */
async function searchAvailable(filters = {}, query = {}) {
  const { page, limit, offset } = parsePagination(query, { defaultLimit: 12 });

  const hasCoordinates = isValidCoordinate(filters.latitude, filters.longitude);
  const radiusKm = hasCoordinates ? Number(filters.radiusKm || 25) : null;

  const sort = ['distance', 'expiry', 'newest', 'quantity'].includes(filters.sort)
    ? filters.sort
    : 'expiry';

  const { rows, total } = await donationModel.search(
    {
      status: 'AVAILABLE',
      includeExpired: false,
      city: filters.city,
      categoryId: filters.categoryId,
      type: filters.type,
      search: filters.search,
      excludeDonorId: filters.excludeDonorId,
      hasCoordinates,
      latitude: filters.latitude,
      longitude: filters.longitude,
      radiusKm,
    },
    { limit, offset },
    sort,
  );

  const totals = await donationModel.availableTotals({
    city: filters.city,
    type: filters.type,
    categoryId: filters.categoryId,
    hasCoordinates,
    latitude: filters.latitude,
    longitude: filters.longitude,
    radiusKm,
  });

  return {
    ...paginated(rows.map(donationSummary), total, page, limit),
    totals: numericRow(totals, ['listing_count', 'total_kg', 'total_servings', 'meals_available']),
  };
}

/** Donor's own listings, including expired and cancelled ones. */
async function getMyDonations(donorId, filters = {}, query = {}) {
  const { page, limit, offset } = parsePagination(query, { defaultLimit: 10 });

  const statuses = filters.status && filters.status !== 'ALL' ? [filters.status] : undefined;

  const { rows, total } = await donationModel.search(
    {
      donorId,
      includeExpired: true,
      statuses,
      search: filters.search,
      categoryId: filters.categoryId,
    },
    { limit, offset },
    filters.sort === 'expiry' ? 'expiry' : 'newest',
  );

  return paginated(rows.map(donationSummary), total, page, limit);
}

/** Claims received on the donor's listings. */
async function getReceivedClaims(donorId, filters = {}, query = {}) {
  const { page, limit, offset } = parsePagination(query, { defaultLimit: 10 });
  const { rows, total } = await claimModel.listByDonor(donorId, {
    status: filters.status,
    search: filters.search,
  }, { limit, offset });

  return paginated(rows.map(claimView), total, page, limit);
}

/** Everything the donor dashboard renders. */
async function getDonorDashboard(donorId) {
  const [stats, monthly, rating, activeClaims, listings] = await Promise.all([
    donationModel.donorStats(donorId),
    donationModel.donorMonthlyTrend(donorId, 6),
    feedbackModel.donorRatingSummary(donorId),
    claimModel.countActiveForDonor(donorId),
    donationModel.search(
      { donorId, includeExpired: true, statuses: ['AVAILABLE', 'CLAIMED'] },
      { limit: 6, offset: 0 },
      'newest',
    ),
  ]);

  const normalized = numericRow(stats, [
    'total_listings', 'active_listings', 'claimed_listings', 'delivered_listings',
    'expired_listings', 'total_kg', 'total_servings', 'meals_saved', 'lifetime_kg',
  ]);

  return {
    metrics: {
      totalListings: normalized.total_listings,
      activeListings: normalized.active_listings,
      claimedListings: normalized.claimed_listings,
      deliveredListings: normalized.delivered_listings,
      expiredListings: normalized.expired_listings,
      totalKg: normalized.total_kg,
      totalServings: normalized.total_servings,
      mealsSaved: normalized.meals_saved,
      activeClaims,
    },
    rating: {
      average: rating.average_rating === null || rating.average_rating === undefined
        ? null
        : Number(rating.average_rating),
      count: Number(rating.rating_count || 0),
      distribution: {
        5: Number(rating.five_star || 0),
        4: Number(rating.four_star || 0),
        3: Number(rating.three_star || 0),
        2: Number(rating.two_star || 0),
        1: Number(rating.one_star || 0),
      },
    },
    monthlyTrend: monthly.map((row) => ({
      month: row.month,
      donations: Number(row.donations),
      mealsSaved: Number(row.meals_saved),
    })),
    activeListings: listings.rows.map(donationSummary),
  };
}

/** Everything the recipient dashboard renders (prioritised nearby list). */
async function getRecipientDashboard(recipientId) {
  const profile = await userModel.findById(recipientId);
  const hasCoordinates = isValidCoordinate(profile?.latitude, profile?.longitude);

  const [stats, nearby, activeClaims, recentPickups] = await Promise.all([
    claimModel.recipientStats(recipientId),
    donationModel.search(
      {
        status: 'AVAILABLE',
        includeExpired: false,
        hasCoordinates,
        latitude: profile?.latitude,
        longitude: profile?.longitude,
        radiusKm: 25,
      },
      { limit: 6, offset: 0 },
      hasCoordinates ? 'distance' : 'expiry',
    ),
    claimModel.listByRecipient(recipientId, { status: 'ACTIVE' }, { limit: 5, offset: 0 }),
    claimModel.listByRecipient(recipientId, { status: 'DELIVERED' }, { limit: 5, offset: 0 }),
  ]);

  const normalized = numericRow(stats, [
    'total_claims', 'active_claims', 'delivered_claims', 'meals_received', 'kg_received',
  ]);

  return {
    hasCoordinates,
    metrics: {
      totalClaims: normalized.total_claims,
      activeClaims: normalized.active_claims,
      deliveredClaims: normalized.delivered_claims,
      mealsReceived: normalized.meals_received,
      kgReceived: normalized.kg_received,
    },
    nearby: nearby.rows.map(donationSummary),
    activeClaims: activeClaims.rows.map(claimView),
    recentPickups: recentPickups.rows.map(claimView),
  };
}

/** Public profile of a donor with rating summary + track record. */
async function getDonorProfile(donorId) {
  const donor = await userModel.findById(donorId);
  if (!donor) throw ApiError.notFound('Donor not found.');
  if (donor.role !== 'DONOR') throw ApiError.badRequest('That user is not a donor.');

  const [stats, rating, reviews, listings, monthly] = await Promise.all([
    donationModel.donorStats(donorId),
    feedbackModel.donorRatingSummary(donorId),
    feedbackModel.listForDonor(donorId, { limit: 10, offset: 0 }),
    donationModel.search(
      { donorId, includeExpired: false, statuses: ['AVAILABLE'] },
      { limit: 6, offset: 0 },
      'newest',
    ),
    donationModel.donorMonthlyTrend(donorId, 6),
  ]);

  const normalized = numericRow(stats, [
    'total_listings', 'active_listings', 'delivered_listings', 'meals_saved', 'total_kg',
  ]);

  return {
    donor: {
      id: donor.id,
      name: donor.full_name,
      orgType: donor.org_type,
      city: donor.city,
      rating: rating.average_rating === null || rating.average_rating === undefined
        ? null
        : Number(rating.average_rating),
      ratingCount: Number(rating.rating_count || 0),
      memberSince: donor.created_at,
    },
    metrics: {
      totalListings: normalized.total_listings,
      activeListings: normalized.active_listings,
      deliveredListings: normalized.delivered_listings,
      mealsSaved: normalized.meals_saved,
      totalKg: normalized.total_kg,
      estimatedMealsPerListing: estimateMeals({ unit: 'kg', quantity_kg: normalized.total_kg }),
    },
    monthlyTrend: monthly.map((row) => ({
      month: row.month,
      donations: Number(row.donations),
      mealsSaved: Number(row.meals_saved),
    })),
    reviews: reviews.rows.map((row) => ({
      id: row.id,
      rating: Number(row.rating),
      comment: row.comment,
      createdAt: row.created_at,
      donationTitle: row.donation_title,
      recipientName: row.recipient_name,
      recipientOrgType: row.recipient_org_type,
    })),
    listings: listings.rows.map(donationSummary),
  };
}

/** Distinct cities for the filter dropdown. */
async function getCities() {
  return donationModel.listCities();
}

module.exports = {
  createDonation,
  updateDonation,
  cancelDonation,
  deleteDonation,
  getDonation,
  getStatusHistory,
  searchAvailable,
  getMyDonations,
  getReceivedClaims,
  getDonorDashboard,
  getRecipientDashboard,
  getDonorProfile,
  getCities,
  loadDetail,
  MAX_IMAGES,
};
