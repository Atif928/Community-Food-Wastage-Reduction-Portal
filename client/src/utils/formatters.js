/**
 * Formatting helpers - keep presentation logic out of components.
 */
import { DONATION_STATUS, CLAIM_STATUS, ORG_TYPE_LABELS } from './constants';

/** Absolute URL for an uploaded file (relative paths come from the API). */
export function fileUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path;
  return path.startsWith('/') ? path : `/${path}`;
}

/** "17 Oct 2026, 6:00 PM" */
export function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** "17 Oct 2026" */
export function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

/** "2 hours left" / "Expired 3 hours ago" for best-before timestamps. */
export function formatRelativeExpiry(value) {
  if (!value) return '-';
  const target = new Date(value).getTime();
  if (Number.isNaN(target)) return '-';

  const diffMs = target - Date.now();
  const past = diffMs < 0;
  const minutes = Math.floor(Math.abs(diffMs) / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  let amount;
  if (days >= 1) amount = `${days} day${days > 1 ? 's' : ''}`;
  else if (hours >= 1) amount = `${hours} hour${hours > 1 ? 's' : ''}`;
  else amount = `${Math.max(minutes, 1)} min`;

  return past ? `Expired ${amount} ago` : `${amount} left`;
}

/** "1.2 km" / "850 m" */
export function formatDistance(km) {
  if (km === null || km === undefined) return null;
  const value = Number(km);
  if (Number.isNaN(value)) return null;
  return value < 1 ? `${Math.round(value * 1000)} m` : `${value.toFixed(1)} km`;
}

/** Quantity label from the serialised data object. */
export function formatQuantity(quantity) {
  if (!quantity) return '-';
  if (quantity.label) return quantity.label;
  return quantity.unit === 'kg'
    ? `${quantity.quantityKg ?? 0} kg`
    : `${quantity.quantityServings ?? 0} servings`;
}

/** "20 kg" -> 40 meals (mirrors the backend rule: 1 kg = 2 meals). */
export function mealsFromQuantity(quantity) {
  if (!quantity) return 0;
  if (quantity.estimatedMeals !== undefined) return quantity.estimatedMeals;
  return quantity.unit === 'kg'
    ? Math.round((quantity.quantityKg || 0) * 2)
    : Number(quantity.quantityServings || 0);
}

/** Thousands separators with optional decimals. */
export function formatNumber(value, decimals = 0) {
  const number = Number(value || 0);
  if (Number.isNaN(number)) return '0';
  return number.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Mass in kg -> "1.2 t" once it gets big. */
export function formatMass(kg) {
  const value = Number(kg || 0);
  if (value >= 1000) return `${(value / 1000).toFixed(1)} t`;
  return `${formatNumber(value, value % 1 === 0 ? 0 : 1)} kg`;
}

/** Status badge metadata with a graceful fallback. */
export function donationStatusMeta(status) {
  return DONATION_STATUS[status] || { label: status || 'Unknown', className: 'bg-slate-200 text-slate-700' };
}

export function claimStatusMeta(status) {
  return CLAIM_STATUS[status] || { label: status || 'Unknown', className: 'bg-slate-200 text-slate-700' };
}

/** "NGO" / "Restaurant" friendly label. */
export function orgTypeLabel(orgType) {
  if (!orgType) return 'Member';
  return ORG_TYPE_LABELS[orgType] || orgType;
}

/** Initials for avatar placeholders. */
export function initials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

/** 'YYYY-MM' -> 'Oct 2026' for chart axes. */
export function formatMonthLabel(month) {
  if (!month) return '';
  const [year, monthNumber] = String(month).split('-');
  const date = new Date(Number(year), Number(monthNumber) - 1, 1);
  if (Number.isNaN(date.getTime())) return month;
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

/** Truncate long text for cards. */
export function truncate(text, max = 120) {
  if (!text) return '';
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}
