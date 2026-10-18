/**
 * MyClaims - the recipient's pickups.
 *
 * Active claims offer a shortcut to confirm the pickup or cancel it; delivered
 * claims offer a rating link when feedback is still missing.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { claimApi } from '../../api/endpoints';
import PageHeader from '../../components/layout/PageHeader';
import { EmptyState, ErrorState } from '../../components/common/States';
import { PageLoader } from '../../components/common/Spinner';
import { Input } from '../../components/common/Input';
import StatusBadge from '../../components/common/StatusBadge';
import Pagination from '../../components/common/Pagination';
import { useDebounce } from '../../hooks/useDebounce';
import { formatDateTime, formatQuantity, orgTypeLabel } from '../../utils/formatters';

const TABS = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function MyClaims() {
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [result, setResult] = useState({ items: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const debouncedSearch = useDebounce(search, 400);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await claimApi.mine({
        status: status === 'ALL' ? undefined : status,
        search: debouncedSearch || undefined,
        page,
        limit: 10,
      });
      setResult({ items: data.items || [], pagination: data.pagination || null });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [status, debouncedSearch, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [status, debouncedSearch]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My pickups"
        subtitle="Track the food you have claimed."
        actions={<Link to="/recipient/explore" className="btn-secondary">🔎 Find more food</Link>}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatus(tab.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                status === tab.value ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Input
          name="search"
          placeholder="Search your pickups…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full sm:w-64"
        />
      </div>

      {loading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : result.items.length === 0 ? (
        <EmptyState
          icon="🚚"
          title="No pickups here"
          message="Claim a listing from the Find food page to get started."
          action={<Link to="/recipient/explore" className="btn-primary">Find food</Link>}
        />
      ) : (
        <div className="space-y-3">
          {result.items.map((claim) => (
            <article key={claim.id} className="card card-body">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-900">{claim.donation?.title}</h3>
                    <StatusBadge status={claim.status} kind="claim" />
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {claim.donation?.quantity ? formatQuantity(claim.donation.quantity) : ''}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    From {claim.donor?.name} ({orgTypeLabel(claim.donor?.orgType)})
                    {claim.donation?.pickup?.city ? ` · 📍 ${claim.donation.pickup.city}` : ''}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Claimed {formatDateTime(claim.claimedAt)}
                    {claim.deliveredAt ? ` · Delivered ${formatDateTime(claim.deliveredAt)}` : ''}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link to={`/recipient/claims/${claim.id}`} className="btn-secondary btn-sm">View</Link>
                  {claim.status === 'ACTIVE' && (
                    <Link to={`/recipient/claims/${claim.id}`} className="btn-primary btn-sm">Confirm pickup</Link>
                  )}
                  {claim.status === 'DELIVERED' && !claim.feedback && (
                    <Link to={`/recipient/claims/${claim.id}/feedback`} className="btn-primary btn-sm">Rate donor</Link>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Pagination pagination={result.pagination} onPageChange={setPage} disabled={loading} />
    </div>
  );
}
