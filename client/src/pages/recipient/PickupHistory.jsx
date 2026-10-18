/**
 * PickupHistory - the recipient's completed (delivered) rescues.
 *
 * A timeline-style list with an at-a-glance summary of the food collected so
 * far and a shortcut to rate any donation that has not been rated yet.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { claimApi } from '../../api/endpoints';
import PageHeader from '../../components/layout/PageHeader';
import { EmptyState, ErrorState, StatCard } from '../../components/common/States';
import { PageLoader } from '../../components/common/Spinner';
import Pagination from '../../components/common/Pagination';
import StarRating from '../../components/common/StarRating';
import { formatDate, formatNumber, formatQuantity, mealsFromQuantity } from '../../utils/formatters';

export default function PickupHistory() {
  const [result, setResult] = useState({ items: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await claimApi.mine({ status: 'DELIVERED', page, limit: 20 });
      setResult({ items: data.items || [], pagination: data.pagination || null });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  // Summary across the loaded page (the dashboard holds the lifetime totals).
  const meals = result.items.reduce((sum, claim) => sum + mealsFromQuantity(claim.donation?.quantity), 0);
  const rated = result.items.filter((claim) => claim.feedback).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Pickup history" subtitle="Every delivery you have completed." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Completed pickups" value={formatNumber(result.pagination?.total || 0)} icon="🗂️" />
        <StatCard label="Meals on this page" value={formatNumber(meals)} icon="🍽️" tone="brand" />
        <StatCard label="Rated" value={`${rated}/${result.items.length}`} icon="⭐" tone="amber" />
      </div>

      {loading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : result.items.length === 0 ? (
        <EmptyState
          icon="🗂️"
          title="No completed pickups yet"
          message="Once you confirm a pickup it will show up here."
          action={<Link to="/recipient/explore" className="btn-primary">Find food</Link>}
        />
      ) : (
        <div className="card card-body">
          <ol className="relative space-y-6 border-l border-slate-200 pl-6">
            {result.items.map((claim) => (
              <li key={claim.id} className="relative">
                <span
                  aria-hidden="true"
                  className="absolute -left-[1.95rem] flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-sm ring-1 ring-brand-200"
                >
                  🚚
                </span>

                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={`/recipient/claims/${claim.id}`} className="text-sm font-semibold text-slate-800 hover:text-brand-700">
                      {claim.donation?.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {claim.donor?.name}
                      {claim.donation?.pickup?.city ? ` · 📍 ${claim.donation.pickup.city}` : ''}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {claim.donation?.quantity ? formatQuantity(claim.donation.quantity) : ''} · delivered {formatDate(claim.deliveredAt)}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {claim.feedback ? (
                      <StarRating value={claim.feedback.rating} size="sm" />
                    ) : (
                      <Link to={`/recipient/claims/${claim.id}/feedback`} className="btn-secondary btn-sm">Rate donor</Link>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      <Pagination pagination={result.pagination} onPageChange={setPage} disabled={loading} />
    </div>
  );
}
