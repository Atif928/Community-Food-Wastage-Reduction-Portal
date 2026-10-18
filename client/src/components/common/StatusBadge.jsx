/**
 * StatusBadge / Badge - coloured pills for donation + claim statuses.
 */
import { claimStatusMeta, donationStatusMeta } from '../../utils/formatters';

export function StatusBadge({ status, kind = 'donation' }) {
  const meta = kind === 'claim' ? claimStatusMeta(status) : donationStatusMeta(status);
  return (
    <span className={`badge ${meta.className}`}>
      {meta.dot && <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />}
      {meta.label}
    </span>
  );
}

export function TypeBadge({ type }) {
  const isVeg = type === 'VEG';
  return (
    <span
      className={`badge ${isVeg ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}
      title={isVeg ? 'Vegetarian' : 'Non-vegetarian'}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isVeg ? 'bg-emerald-600' : 'bg-rose-600'}`} />
      {isVeg ? 'Veg' : 'Non-Veg'}
    </span>
  );
}

export function Badge({ children, tone = 'slate', className = '' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    brand: 'bg-brand-100 text-brand-800',
    amber: 'bg-amber-100 text-amber-800',
    blue: 'bg-blue-100 text-blue-800',
    red: 'bg-red-100 text-red-700',
  };
  return <span className={`badge ${tones[tone] || tones.slate} ${className}`}>{children}</span>;
}

export default StatusBadge;
