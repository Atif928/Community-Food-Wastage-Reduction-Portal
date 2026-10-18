/**
 * Application constants shared by navigation, forms and badges.
 */

export const ROLES = {
  DONOR: 'DONOR',
  RECIPIENT: 'RECIPIENT',
  ADMIN: 'ADMIN',
};

export const ROLE_LABELS = {
  DONOR: 'Donor',
  RECIPIENT: 'Recipient',
  ADMIN: 'Administrator',
};

/** Organisation / donor kinds offered at signup. */
export const DONOR_ORG_TYPES = [
  { value: 'RESTAURANT', label: 'Restaurant / Cafe' },
  { value: 'HOTEL', label: 'Hotel / Banquet' },
  { value: 'INDIVIDUAL', label: 'Individual' },
];

export const RECIPIENT_ORG_TYPES = [
  { value: 'NGO', label: 'NGO (needs verification)' },
  { value: 'SHELTER', label: 'Shelter / Orphanage (needs verification)' },
  { value: 'VOLUNTEER', label: 'Volunteer / Individual' },
];

export const ORG_TYPE_LABELS = {
  NGO: 'NGO',
  SHELTER: 'Shelter',
  VOLUNTEER: 'Volunteer',
  RESTAURANT: 'Restaurant',
  HOTEL: 'Hotel',
  INDIVIDUAL: 'Individual',
  ADMIN: 'Administrator',
};

/** Donation + claim status metadata (label, badge classes, icon). */
export const DONATION_STATUS = {
  AVAILABLE: { label: 'Available', className: 'bg-brand-100 text-brand-800', dot: 'bg-brand-500' },
  CLAIMED: { label: 'Claimed', className: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' },
  DELIVERED: { label: 'Delivered', className: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500' },
  CANCELLED: { label: 'Cancelled', className: 'bg-slate-200 text-slate-700', dot: 'bg-slate-400' },
};

export const CLAIM_STATUS = {
  ACTIVE: { label: 'Active pickup', className: 'bg-amber-100 text-amber-800' },
  DELIVERED: { label: 'Delivered', className: 'bg-blue-100 text-blue-800' },
  CANCELLED: { label: 'Cancelled', className: 'bg-slate-200 text-slate-700' },
};

export const FOOD_TYPES = [
  { value: 'VEG', label: 'Veg' },
  { value: 'NON_VEG', label: 'Non-Veg' },
];

export const UNITS = [
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'servings', label: 'Servings / meals' },
];

/** Radius options for the "near me" search, in kilometres. */
export const RADIUS_OPTIONS = [5, 10, 25, 50, 100];

export const SORT_OPTIONS = [
  { value: 'distance', label: 'Nearest first' },
  { value: 'expiry', label: 'Expiring soonest' },
  { value: 'newest', label: 'Newest first' },
  { value: 'quantity', label: 'Largest quantity' },
];

export const NOTIFICATION_TYPE_ICONS = {
  DONATION_POSTED: '🍲',
  CLAIM_CREATED: '🙋',
  CLAIM_CONFIRMED: '✅',
  CLAIM_CANCELLED: '↩️',
  DELIVERED: '🚚',
  VERIFICATION_SUBMITTED: '📄',
  VERIFICATION_APPROVED: '🎉',
  VERIFICATION_REJECTED: '⚠️',
  FEEDBACK_RECEIVED: '⭐',
  ACCOUNT_SUSPENDED: '⛔',
  ACCOUNT_ACTIVATED: '✔️',
  ADMIN_BROADCAST: '📣',
};

/** Google Maps key (fallback keeps the map component from crashing). */
export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

/** Default map centre (Bengaluru) used before geolocation resolves. */
export const DEFAULT_MAP_CENTER = { lat: 12.9716, lng: 77.5946 };

export const DASHBOARD_ROUTE_BY_ROLE = {
  DONOR: '/donor/dashboard',
  RECIPIENT: '/recipient/dashboard',
  ADMIN: '/admin/dashboard',
};
