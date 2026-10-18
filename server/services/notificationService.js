/**
 * notificationService - the notification engine.
 *
 * Responsibilities
 *   * write in-app notifications (dashboard bell + badge)
 *   * fan out to "nearby" recipients when a donation is posted
 *   * send the matching emails through emailService
 *
 * Delivery is deliberately best-effort: a failing SMTP server must never roll
 * back a donation or a claim, so the public functions swallow and log errors.
 */
const userModel = require('../models/userModel');
const notificationModel = require('../models/notificationModel');
const emailService = require('./emailService');

const DEFAULT_RADIUS_KM = Number(process.env.NOTIFY_RADIUS_KM || 10);

// eslint-disable-next-line no-console
const log = (...args) => console.log('[notify]', ...args);

/** Create one in-app notification. */
async function notifyUser({ userId, type, title, message, payload = null }, conn) {
  return notificationModel.create({ userId, type, title, message, payload }, conn);
}

/** Create the same notification for several users. */
async function notifyUsers(userIds, base, conn) {
  const items = userIds.map((userId) => ({ userId, ...base }));
  return notificationModel.createMany(items, conn);
}

/* -------------------------------- queries -------------------------------- */

async function listNotifications(userId, { unreadOnly = false, limit = 30, page = 1 } = {}) {
  const offset = (page - 1) * limit;
  const rows = await notificationModel.list(userId, { unreadOnly, limit, offset });
  const unread = await notificationModel.unreadCount(userId);
  const { notificationView } = require('../utils/serializers');
  return { items: rows.map(notificationView), unreadCount: unread };
}

async function getUnreadCount(userId) {
  return notificationModel.unreadCount(userId);
}

async function markRead(userId, notificationId) {
  const affected = await notificationModel.markRead(userId, notificationId);
  return affected;
}

async function markAllRead(userId) {
  return notificationModel.markAllRead(userId);
}

async function deleteNotification(userId, notificationId) {
  return notificationModel.remove(userId, notificationId);
}

/* ------------------------------ fan-out --------------------------------- */

/**
 * Notify every ACTIVE recipient within `radiusKm` of the pickup point.
 *
 * Called right after a donation is committed. We re-read the donation row so
 * the email template has the category/donor names joined in.
 *
 * @returns {Promise<number>} how many recipients were notified
 */
async function notifyNearbyRecipients(donation, { radiusKm = DEFAULT_RADIUS_KM } = {}) {
  try {
    const latitude = Number(donation.pickup_latitude ?? donation.pickupLatitude);
    const longitude = Number(donation.pickup_longitude ?? donation.pickupLongitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return 0;

    const recipients = await userModel.findRecipientsWithinRadius(latitude, longitude, radiusKm);
    if (!recipients.length) return 0;

    const distance = (row) => (row.distance_km === null || row.distance_km === undefined
      ? null
      : Math.round(Number(row.distance_km) * 10) / 10);

    const title = donation.title;
    const quantityLabel = donation.unit === 'kg' || donation.unit === (undefined)
      ? `${donation.quantity_kg ?? donation.quantityKg} kg`
      : `${donation.quantity_servings ?? donation.quantityServings} servings`;

    // 1. In-app notifications (single bulk INSERT).
    const items = recipients.map((recipient) => ({
      userId: recipient.id,
      type: 'DONATION_POSTED',
      title: 'New food available nearby',
      message: `${title} (${quantityLabel}) is available${distance(recipient) !== null ? ` ${distance(recipient)} km away` : ''} in ${donation.pickup_city}.`,
      payload: { donationId: donation.id },
    }));
    await notificationModel.createMany(items);

    // 2. Emails.
    const emailDonation = {
      ...donation,
      category_name: donation.category_name ?? donation.categoryName,
      category_type: donation.category_type ?? donation.categoryType,
      donor_name: donation.donor_name ?? donation.donorName,
    };
    await emailService.sendBulk(recipients, (recipient) => emailService.donationPostedEmail(emailDonation, recipient));

    log(`notified ${recipients.length} recipient(s) within ${radiusKm} km about donation #${donation.id}`);
    return recipients.length;
  } catch (err) {
    log(`nearby fan-out failed for donation #${donation.id}: ${err.message}`);
    return 0;
  }
}

/** Donor gets told their listing was claimed (in-app + email). */
async function notifyClaimCreated(claim) {
  const donor = {
    id: claim.donor_id,
    full_name: claim.donor_name,
    email: claim.donor_email,
  };
  await notifyUser({
    userId: claim.donor_id,
    type: 'CLAIM_CREATED',
    title: 'Your donation was claimed',
    message: `${claim.recipient_name} claimed "${claim.donation_title}". Keep it ready for pickup.`,
    payload: { donationId: claim.donation_id, claimId: claim.id },
  });
  await emailService.sendMail({ to: donor.email, ...emailService.claimCreatedEmail(claim, donor) });

  // Confirmation to the recipient as well.
  const recipient = {
    id: claim.recipient_id,
    full_name: claim.recipient_name,
    email: claim.recipient_email,
  };
  await notifyUser({
    userId: claim.recipient_id,
    type: 'CLAIM_CONFIRMED',
    title: 'Claim confirmed',
    message: `You claimed "${claim.donation_title}". Confirm delivery once you have collected it.`,
    payload: { donationId: claim.donation_id, claimId: claim.id },
  });
  await emailService.sendMail({ to: recipient.email, ...emailService.claimConfirmedEmail(claim, recipient) });
}

/** Donor gets told the pickup was completed. */
async function notifyDelivered(claim) {
  const donor = { id: claim.donor_id, full_name: claim.donor_name, email: claim.donor_email };
  await notifyUser({
    userId: claim.donor_id,
    type: 'DELIVERED',
    title: 'Delivery confirmed',
    message: `${claim.recipient_name} confirmed collecting "${claim.donation_title}".`,
    payload: { donationId: claim.donation_id, claimId: claim.id },
  });
  await emailService.sendMail({ to: donor.email, ...emailService.deliveredEmail(claim, donor) });
}

/** Claim cancelled by the recipient -> donor's listing is available again. */
async function notifyClaimCancelled(claim) {
  await notifyUser({
    userId: claim.donor_id,
    type: 'CLAIM_CANCELLED',
    title: 'A claim was cancelled',
    message: `${claim.recipient_name} cancelled the claim on "${claim.donation_title}". Your listing is available again.`,
    payload: { donationId: claim.donation_id },
  });
}

/** Admin approved or rejected an NGO. */
async function notifyVerificationDecision({ user, approved, note = null }) {
  await notifyUser({
    userId: user.id,
    type: approved ? 'VERIFICATION_APPROVED' : 'VERIFICATION_REJECTED',
    title: approved ? 'Your account is verified' : 'Verification needs attention',
    message: approved
      ? 'Your organisation has been verified. You can now claim surplus food.'
      : `Your verification was not approved. ${note || ''}`.trim(),
    payload: { approved },
  });

  const message = approved
    ? emailService.verificationApprovedEmail(user)
    : emailService.verificationRejectedEmail(user, note);
  await emailService.sendMail({ to: user.email, ...message });
}

/** Recipient left a rating -> donor is informed. */
async function notifyFeedbackReceived({ donorId, rating, comment, donationTitle, recipientName }) {
  await notifyUser({
    userId: donorId,
    type: 'FEEDBACK_RECEIVED',
    title: `You received a ${rating}-star rating`,
    message: `${recipientName} rated "${donationTitle}" ${rating}/5.${comment ? ` "${comment}"` : ''}`,
    payload: { rating },
  });
}

/** Admin broadcast (used by the admin panel "notify users" action). */
async function broadcast(userIds, { title, message, type = 'ADMIN_BROADCAST' }) {
  return notifyUsers(userIds, { type, title, message });
}

module.exports = {
  DEFAULT_RADIUS_KM,
  notifyUser,
  notifyUsers,
  notifyNearbyRecipients,
  notifyClaimCreated,
  notifyDelivered,
  notifyClaimCancelled,
  notifyVerificationDecision,
  notifyFeedbackReceived,
  broadcast,
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  deleteNotification,
};
