/**
 * ReceivedClaims - every claim made on the donor's listings.
 *
 * A read-only table so a donor can see who is collecting what, when, and the
 * current state of each pickup.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { donationApi } from '../../api/endpoints';
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

export default function ReceivedClaims() {
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
      const data = await donationApi.claimsReceived({
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
      <PageHeader title="Received claims" subtitle="Who is collecting your surplus food." />

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
          placeholder="Search by listing or recipient…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full sm:w-72"
        />
      </div>

      {loading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : result.items.length === 0 ? (
        <EmptyState
          icon="🙋"
          title="No claims yet"
          message="When a recipient claims one of your listings it will appear here."
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Listing</th>
                  <th>Recipient</th>
                  <th>Quantity</th>
                  <th>Claimed</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((claim) => (
                  <tr key={claim.id} className="hover:bg-slate-50">
                    <td>
                      <Link to={`/donor/donations/${claim.donationId}`} className="font-semibold text-slate-800 hover:text-brand-700">
                        {claim.donation?.title || `Listing #${claim.donationId}`}
                      </Link>
                      {claim.donation?.pickup?.city && (
                        <p className="text-xs text-slate-500">📍 {claim.donation.pickup.city}</p>
                      )}
                    </td>
                    <td>
                      <p className="font-medium text-slate-700">{claim.recipient?.name || '—'}</p>
                      <p className="text-xs text-slate-500">{orgTypeLabel(claim.recipient?.orgType)}</p>
                      {claim.recipient?.phone && <p className="text-xs text-slate-500">{claim.recipient.phone}</p>}
                    </td>
                    <td className="text-sm text-slate-600">
                      {claim.donation?.quantity ? formatQuantity(claim.donation.quantity) : '—'}
                    </td>
                    <td className="text-xs text-slate-500">
                      {formatDateTime(claim.claimedAt)}
                      {claim.deliveredAt && (
                        <p className="text-slate-500">Delivered {formatDateTime(claim.deliveredAt)}</p>
                      )}
                    </td>
                    <td><StatusBadge status={claim.status} kind="claim" /></td>
                    <td className="text-right">
                      <Link to={`/donor/donations/${claim.donationId}`} className="link text-sm">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination pagination={result.pagination} onPageChange={setPage} disabled={loading} />
    </div>
  );
}
