/**
 * serializers - convert raw PostgreSQL rows into the stable JSON shapes the
 * React client consumes. Every number-ish column (NUMERIC, SUM, COUNT) can
 * arrive as a string, so normalising here keeps the frontend simple and
 * consistent.
 */
const { round2, estimateMeals, toAbsoluteUrl } = require('./helpers');

/** Absolute image URL helper that tolerates nulls. */
const imageUrl = (path) => toAbsoluteUrl(path);

/** ISO string for TIMESTAMPTZ columns (pg returns JS Date objects). */
const iso = (value) => (value instanceof Date ? value.toISOString() : value || null);

/** Quantity block shared by summaries and details. */
function serializeQuantity(row) {
  const unit = row.unit || 'kg';
  const kg = row.quantity_kg === null || row.quantity_kg === undefined ? null : Number(row.quantity_kg);
  const servings = row.quantity_servings === null || row.quantity_servings === undefined
    ? null
    : Number(row.quantity_servings);

  return {
    unit,
    quantityKg: kg,
    quantityServings: servings,
    // Human readable "20 kg" / "30 servings".
    label: unit === 'kg' ? `${kg ?? 0} kg` : `${servings ?? 0} servings`,
    estimatedMeals: estimateMeals({ unit, quantity_kg: kg, quantity_servings: servings }),
  };
}

/** Compact donation object for cards, the map popup and list rows. */
function donationSummary(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    bestBefore: iso(row.best_before),
    isExpired: row.best_before ? new Date(row.best_before).getTime() <= Date.now() : false,
    quantity: serializeQuantity(row),
    category: {
      id: row.category_id,
      name: row.category_name,
      slug: row.category_slug,
      type: row.category_type,
    },
    donor: {
      id: row.donor_id,
      name: row.donor_name,
      orgType: row.donor_org_type,
      city: row.donor_city,
      phone: row.donor_phone,
      email: row.donor_email,
      rating: row.donor_rating === null || row.donor_rating === undefined ? null : Number(row.donor_rating),
      ratingCount: row.donor_rating_count === undefined ? undefined : Number(row.donor_rating_count),
    },
    pickup: {
      address: row.pickup_address,
      city: row.pickup_city,
      latitude: row.pickup_latitude === null || row.pickup_latitude === undefined
        ? null
        : Number(row.pickup_latitude),
      longitude: row.pickup_longitude === null || row.pickup_longitude === undefined
        ? null
        : Number(row.pickup_longitude),
    },
    distanceKm: row.distance_km === null || row.distance_km === undefined
      ? null
      : round2(row.distance_km),
    primaryImage: imageUrl(row.primary_image),
    imageCount: row.image_count === undefined ? undefined : Number(row.image_count),
    claimedBy: row.claimed_by === undefined || row.claimed_by === null
      ? null
      : Number(row.claimed_by),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

/** Full donation object: summary + images + timeline + claim + feedback. */
function donationDetail(row, { images = [], history = [], claim = null, feedback = null } = {}) {
  const base = donationSummary(row);
  if (!base) return null;

  return {
    ...base,
    images: images.map((img) => ({
      id: img.id,
      url: imageUrl(img.image_url),
      isPrimary: Boolean(img.is_primary),
    })),
    statusHistory: history.map((h) => ({
      id: h.id,
      status: h.status,
      note: h.note,
      changedBy: { id: h.changed_by, name: h.changed_by_name, role: h.changed_by_role },
      changedAt: iso(h.changed_at),
    })),
    claim: claim ? claimView(claim) : null,
    feedback: feedback
      ? {
        id: feedback.id,
        rating: Number(feedback.rating),
        comment: feedback.comment,
        createdAt: iso(feedback.created_at),
        recipientName: feedback.recipient_name,
      }
      : null,
  };
}

/** Claim object with donor + recipient + donation summary. */
function claimView(row) {
  if (!row) return null;

  const donation = row.donation_title
    ? {
      id: row.donation_id,
      title: row.donation_title,
      description: row.donation_description,
      status: row.donation_status,
      bestBefore: iso(row.best_before),
      quantity: serializeQuantity(row),
      category: { name: row.category_name, type: row.category_type },
      pickup: {
        address: row.pickup_address,
        city: row.pickup_city,
        latitude: row.pickup_latitude === null || row.pickup_latitude === undefined
          ? null
          : Number(row.pickup_latitude),
        longitude: row.pickup_longitude === null || row.pickup_longitude === undefined
          ? null
          : Number(row.pickup_longitude),
      },
      primaryImage: imageUrl(row.primary_image),
    }
    : null;

  return {
    id: row.id ?? row.claim_id,
    donationId: row.donation_id,
    status: row.status ?? row.claim_status,
    pickupNote: row.pickup_note,
    claimedAt: iso(row.claimed_at),
    deliveredAt: iso(row.delivered_at),
    deliveredProofUrl: imageUrl(row.delivered_proof_url),
    donor: row.donor_id
      ? {
        id: row.donor_id,
        name: row.donor_name,
        orgType: row.donor_org_type,
        city: row.donor_city,
        phone: row.donor_phone,
        email: row.donor_email,
        rating: row.donor_rating === null || row.donor_rating === undefined
          ? null
          : Number(row.donor_rating),
      }
      : undefined,
    recipient: row.recipient_id
      ? {
        id: row.recipient_id,
        name: row.recipient_name,
        orgType: row.recipient_org_type,
        phone: row.recipient_phone,
        email: row.recipient_email,
      }
      : undefined,
    donation,
    feedback: row.feedback_id
      ? { id: row.feedback_id, rating: Number(row.feedback_rating), comment: row.feedback_comment }
      : null,
  };
}

/** Public user object (never leaks the hash). */
function userPublic(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone,
    city: row.city,
    address: row.address,
    orgType: row.org_type,
    latitude: row.latitude === null || row.latitude === undefined ? null : Number(row.latitude),
    longitude: row.longitude === null || row.longitude === undefined ? null : Number(row.longitude),
    avatarUrl: imageUrl(row.avatar_url),
    role: row.role,
    accountStatus: row.account_status,
    averageRating: row.average_rating === null || row.average_rating === undefined
      ? null
      : Number(row.average_rating),
    ratingCount: row.rating_count === undefined || row.rating_count === null
      ? undefined
      : Number(row.rating_count),
    donationCount: row.donation_count === undefined || row.donation_count === null
      ? undefined
      : Number(row.donation_count),
    claimCount: row.claim_count === undefined || row.claim_count === null
      ? undefined
      : Number(row.claim_count),
    verificationStatus: row.verification_status,
    createdAt: iso(row.created_at),
  };
}

/** Verification record for the admin queue. */
function verificationView(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    documentType: row.document_type,
    documentUrl: imageUrl(row.document_url),
    status: row.status,
    reviewNote: row.review_note,
    reviewedBy: row.reviewed_by,
    submittedAt: iso(row.submitted_at),
    reviewedAt: iso(row.reviewed_at),
    applicant: {
      name: row.applicant_name,
      email: row.applicant_email,
      phone: row.applicant_phone,
      orgType: row.applicant_org_type,
      city: row.applicant_city,
      address: row.applicant_address,
      accountStatus: row.applicant_status,
    },
  };
}

/** Notification with a parsed JSON payload. */
function notificationView(row) {
  if (!row) return null;
  let payload = row.payload;
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch { payload = null; }
  }
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    payload,
    isRead: Boolean(row.read_at),
    readAt: iso(row.read_at),
    createdAt: iso(row.created_at),
  };
}

/** Feedback row. */
function feedbackView(row) {
  if (!row) return null;
  return {
    id: row.id,
    donationId: row.donation_id,
    donationTitle: row.donation_title,
    rating: Number(row.rating),
    comment: row.comment,
    createdAt: iso(row.created_at),
    recipient: row.recipient_name
      ? { name: row.recipient_name, orgType: row.recipient_org_type }
      : undefined,
  };
}

/** Category row (numbers normalised, donation_count optional). */
function categoryView(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    type: row.type,
    isActive: Boolean(row.is_active),
    donationCount: row.donation_count === undefined || row.donation_count === null
      ? undefined
      : Number(row.donation_count),
  };
}

/** Coerce the numeric aggregate columns a driver may return as strings. */
function numericRow(row, keys) {
  if (!row) return row;
  const out = { ...row };
  for (const key of keys) {
    if (out[key] !== null && out[key] !== undefined) out[key] = Number(out[key]);
  }
  return out;
}

module.exports = {
  donationSummary,
  donationDetail,
  claimView,
  userPublic,
  verificationView,
  notificationView,
  feedbackView,
  categoryView,
  serializeQuantity,
  numericRow,
};
