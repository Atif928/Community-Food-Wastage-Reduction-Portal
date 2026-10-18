/**
 * DonationCard - the listing tile used on the feed, dashboards and tables.
 *
 * Shows photo, Veg/Non-Veg badge, quantity, best-before countdown, distance,
 * donor rating and status. `actions` is rendered in the footer so each page can
 * supply its own buttons (Claim, Edit, Cancel, ...).
 */
import { Link } from 'react-router-dom';
import StatusBadge, { TypeBadge } from '../common/StatusBadge';
import StarRating from '../common/StarRating';
import {
  fileUrl,
  formatDistance,
  formatQuantity,
  formatRelativeExpiry,
  mealsFromQuantity,
  orgTypeLabel,
  truncate,
} from '../../utils/formatters';

export function DonationCard({ donation, actions = null, to = null, compact = false }) {
  if (!donation) return null;

  const image = fileUrl(donation.primaryImage);
  const expired = donation.isExpired;
  // `to === undefined` -> donor detail default; `to === null` -> not a link.
  const detailLink = to === undefined ? `/donor/donations/${donation.id}` : to;
  const distance = formatDistance(donation.distanceKm);

  return (
    <article className="card flex flex-col overflow-hidden transition-shadow hover:shadow-lg">
      <div className="relative h-40 w-full overflow-hidden bg-slate-100">
        {image ? (
          <img
            src={image}
            alt={donation.title}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl" aria-hidden="true">
            🍽️
          </div>
        )}

        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          <TypeBadge type={donation.category?.type} />
          {expired && <span className="badge bg-red-100 text-red-700">Expired</span>}
        </div>

        <div className="absolute right-2 top-2">
          <StatusBadge status={donation.status} />
        </div>

        {distance && (
          <span className="absolute bottom-2 right-2 rounded-full bg-slate-900/75 px-2 py-0.5 text-xs font-semibold text-white">
            📍 {distance}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="line-clamp-1 text-base font-semibold text-slate-900">
            {detailLink
              ? <Link to={detailLink} className="hover:text-brand-700">{donation.title}</Link>
              : donation.title}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">{donation.category?.name}</p>
        </div>

        {!compact && donation.description && (
          <p className="text-sm text-slate-600">{truncate(donation.description, 110)}</p>
        )}

        <dl className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-slate-50 px-2.5 py-2">
            <dt className="font-semibold uppercase tracking-wide text-slate-500">Quantity</dt>
            <dd className="mt-0.5 font-semibold text-slate-800">{formatQuantity(donation.quantity)}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 px-2.5 py-2">
            <dt className="font-semibold uppercase tracking-wide text-slate-500">Best before</dt>
            <dd className={`mt-0.5 font-semibold ${expired ? 'text-red-600' : 'text-slate-800'}`}>
              {formatRelativeExpiry(donation.bestBefore)}
            </dd>
          </div>
        </dl>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-slate-700">
              {donation.donor?.name}
              {donation.donor?.orgType ? (
                <span className="ml-1 font-normal text-slate-500">· {orgTypeLabel(donation.donor.orgType)}</span>
              ) : null}
            </p>
            <p className="truncate text-xs text-slate-500">📍 {donation.pickup?.city}</p>
          </div>

          {donation.donor?.rating ? (
            <StarRating value={donation.donor.rating} size="sm" count={donation.donor.ratingCount ?? null} />
          ) : (
            <span className="text-xs text-slate-400">{mealsFromQuantity(donation.quantity)} meals</span>
          )}
        </div>

        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </article>
  );
}

/** Small horizontal variant used by dashboards and pick-up lists. */
export function DonationRow({ donation, actions = null, to = null }) {
  if (!donation) return null;
  const image = fileUrl(donation.primaryImage);
  const detailLink = to === undefined ? `/donor/donations/${donation.id}` : to;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-shadow hover:shadow-sm">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
        {image
          ? <img src={image} alt={donation.title} className="h-full w-full object-cover" loading="lazy" />
          : <div className="flex h-full items-center justify-center text-xl" aria-hidden="true">🍽️</div>}
      </div>

      <div className="min-w-0 flex-1">
        {detailLink ? (
          <Link to={detailLink} className="line-clamp-1 text-sm font-semibold text-slate-800 hover:text-brand-700">
            {donation.title}
          </Link>
        ) : (
          <p className="line-clamp-1 text-sm font-semibold text-slate-800">{donation.title}</p>
        )}
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
          <span>{formatQuantity(donation.quantity)}</span>
          <span aria-hidden="true">·</span>
          <span className={donation.isExpired ? 'text-red-600' : ''}>
            {formatRelativeExpiry(donation.bestBefore)}
          </span>
          {donation.distanceKm !== null && donation.distanceKm !== undefined && (
            <>
              <span aria-hidden="true">·</span>
              <span>{formatDistance(donation.distanceKm)}</span>
            </>
          )}
        </p>
      </div>

      <StatusBadge status={donation.status} />

      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
}

export default DonationCard;
