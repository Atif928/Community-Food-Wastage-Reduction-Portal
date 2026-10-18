/**
 * emailService - Nodemailer wrapper + HTML templates.
 *
 * When EMAIL_DISABLED=true (the default for local dev, and required when no
 * SMTP credentials exist) every "send" is logged to the console instead of
 * being transmitted, so the notification flow can be tested end to end without
 * an SMTP account.
 */
require('dotenv').config();
const nodemailer = require('nodemailer');

// eslint-disable-next-line no-console
const log = (...args) => console.log('[email]', ...args);

const EMAIL_DISABLED = String(process.env.EMAIL_DISABLED || 'true') === 'true';
const FROM = process.env.SMTP_FROM || 'Community Food Portal <no-reply@foodportal.local>';

let transporter = null;

/** Create (once) and return the SMTP transport, or null when disabled. */
function getTransporter() {
  if (EMAIL_DISABLED) return null;
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });

  return transporter;
}

/**
 * Send one email. Never throws: notification delivery must not break a user
 * request, so failures are logged and swallowed.
 */
async function sendMail({ to, subject, html, text }) {
  const tx = getTransporter();

  if (!tx) {
    log(`(disabled) would send "${subject}" to ${to}`);
    return { disabled: true };
  }

  try {
    const info = await tx.sendMail({ from: FROM, to, subject, html, text: text || stripHtml(html) });
    log(`sent "${subject}" to ${to} (${info.messageId})`);
    return info;
  } catch (err) {
    log(`FAILED to send "${subject}" to ${to}: ${err.message}`);
    return { error: err.message };
  }
}

/** Send the same email to many recipients, sequentially and defensively. */
async function sendBulk(recipients, buildMessage) {
  let sent = 0;
  for (const recipient of recipients) {
    // eslint-disable-next-line no-await-in-loop
    const result = await sendMail({ to: recipient.email, ...buildMessage(recipient) });
    if (!result.error) sent += 1;
  }
  return sent;
}

/** Very small HTML -> text fallback for clients that prefer plain text. */
function stripHtml(html = '') {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Shared responsive email shell. */
function layout({ title, intro, rows = [], cta = null, footer = null }) {
  const rowHtml = rows
    .map(
      (row) => `<tr>
        <td style="padding:6px 0;color:#64748b;font-size:14px;">${row.label}</td>
        <td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;">${row.value}</td>
      </tr>`,
    )
    .join('');

  const ctaHtml = cta
    ? `<p style="margin:24px 0 0;">
         <a href="${cta.url}" style="background:#16a34a;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;display:inline-block;">${cta.label}</a>
       </p>`
    : '';

  return `<!doctype html>
<html><body style="margin:0;background:#f1f5f9;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="background:#ffffff;border-radius:12px;padding:28px;border:1px solid #e2e8f0;">
      <p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#16a34a;font-weight:700;">Community Food Portal</p>
      <h1 style="margin:0 0 12px;font-size:20px;color:#0f172a;">${title}</h1>
      <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.6;">${intro}</p>
      ${rowHtml ? `<table style="width:100%;border-collapse:collapse;">${rowHtml}</table>` : ''}
      ${ctaHtml}
      <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;">${footer || 'You receive this email because you registered on the Community Food Wastage Reduction Portal.'}</p>
    </div>
  </div>
</body></html>`;
}

/* ------------------------------- templates -------------------------------- */

/** New donation posted -> nearby NGOs / shelters. */
function donationPostedEmail(donation, recipient) {
  const quantity = donation.unit === 'kg'
    ? `${donation.quantity_kg} kg`
    : `${donation.quantity_servings} servings`;

  return {
    subject: `New food available nearby: ${donation.title}`,
    html: layout({
      title: 'Surplus food is available near you',
      intro: `Hi ${recipient.full_name || 'there'}, a new donation was just listed within your pickup radius.`,
      rows: [
        { label: 'Item', value: donation.title },
        { label: 'Category', value: `${donation.category_name} (${donation.category_type})` },
        { label: 'Quantity', value: quantity },
        { label: 'Pickup city', value: donation.pickup_city },
        { label: 'Best before', value: new Date(donation.best_before).toLocaleString() },
        { label: 'Donor', value: donation.donor_name },
      ],
      cta: { label: 'View on the map', url: `${process.env.API_BASE_URL || 'http://localhost:5000'}/` },
    }),
  };
}

/** Claim created -> the donor. */
function claimCreatedEmail(claim, donor) {
  return {
    subject: `Your donation "${claim.donation_title}" has been claimed`,
    html: layout({
      title: 'Good news - your food is going to be collected',
      intro: `Hi ${donor.full_name || 'there'}, a recipient has claimed your listing. Please keep it ready for pickup.`,
      rows: [
        { label: 'Item', value: claim.donation_title },
        { label: 'Claimed by', value: `${claim.recipient_name} (${claim.recipient_org_type || 'Recipient'})` },
        { label: 'Contact', value: claim.recipient_phone || claim.recipient_email },
        { label: 'Pickup note', value: claim.pickup_note || '-' },
        { label: 'Claimed at', value: new Date(claim.claimed_at).toLocaleString() },
      ],
    }),
  };
}

/** Claim confirmed -> the recipient. */
function claimConfirmedEmail(claim, recipient) {
  return {
    subject: `You claimed "${claim.donation_title}"`,
    html: layout({
      title: 'Claim confirmed',
      intro: `Thanks ${recipient.full_name || 'there'} - you are set to collect this donation.`,
      rows: [
        { label: 'Item', value: claim.donation_title },
        { label: 'Quantity', value: claim.unit === 'kg' ? `${claim.quantity_kg} kg` : `${claim.quantity_servings} servings` },
        { label: 'Pickup address', value: claim.pickup_address || claim.pickup_city },
        { label: 'Donor', value: claim.donor_name },
        { label: 'Donor contact', value: claim.donor_phone || claim.donor_email },
        { label: 'Best before', value: new Date(claim.best_before).toLocaleString() },
      ],
    }),
  };
}

/** Delivered -> the donor. */
function deliveredEmail(claim, donor) {
  return {
    subject: `Delivery confirmed for "${claim.donation_title}"`,
    html: layout({
      title: 'Your donation was delivered',
      intro: `Hi ${donor.full_name || 'there'}, ${claim.recipient_name} confirmed the pickup. Thank you for reducing food waste!`,
      rows: [
        { label: 'Item', value: claim.donation_title },
        { label: 'Delivered at', value: new Date(claim.delivered_at).toLocaleString() },
        { label: 'Collected by', value: claim.recipient_name },
      ],
    }),
  };
}

/** Admin approved the NGO / shelter. */
function verificationApprovedEmail(user) {
  return {
    subject: 'Your account has been verified',
    html: layout({
      title: 'You are verified',
      intro: `Hi ${user.full_name || 'there'}, an administrator approved your organisation. You can now claim surplus food.`,
      cta: { label: 'Browse available food', url: process.env.CLIENT_ORIGIN || 'http://localhost:5173' },
    }),
  };
}

/** Admin rejected / needs more documents. */
function verificationRejectedEmail(user, note) {
  return {
    subject: 'Action needed on your verification',
    html: layout({
      title: 'Verification not approved',
      intro: `Hi ${user.full_name || 'there'}, we could not verify your documents yet.`,
      rows: [{ label: 'Reason', value: note || 'Documents were unclear or incomplete.' }],
    }),
  };
}

/** Plain welcome for donors / volunteers. */
function welcomeEmail(user) {
  return {
    subject: 'Welcome to the Community Food Portal',
    html: layout({
      title: `Welcome, ${user.full_name || 'friend'}!`,
      intro: user.role === 'DONOR'
        ? 'List your surplus food in under a minute and we will alert nearby NGOs for you.'
        : 'Search available food near you, claim it and confirm the delivery once collected.',
      cta: { label: 'Open your dashboard', url: process.env.CLIENT_ORIGIN || 'http://localhost:5173' },
    }),
  };
}

/** Notification that documents were received. */
function verificationReceivedEmail(user) {
  return {
    subject: 'We received your verification documents',
    html: layout({
      title: 'Documents under review',
      intro: `Thanks ${user.full_name || 'there'}. Our team is reviewing your documents; you will get an email as soon as you are approved.`,
    }),
  };
}

module.exports = {
  sendMail,
  sendBulk,
  layout,
  donationPostedEmail,
  claimCreatedEmail,
  claimConfirmedEmail,
  deliveredEmail,
  verificationApprovedEmail,
  verificationRejectedEmail,
  welcomeEmail,
  verificationReceivedEmail,
  sendWelcome: (user) => sendMail({ to: user.email, ...welcomeEmail(user) }),
  sendVerificationReceived: (user) => sendMail({ to: user.email, ...verificationReceivedEmail(user) }),
};
