/**
 * MyDonations - the donor's own listing history.
 *
 * Status tabs + search across every listing the donor has ever created
 * (including expired and cancelled ones). Available listings can be edited or
 * cancelled inline.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { donationApi } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import PageHeader from '../../components/layout/PageHeader';
import { EmptyState, ErrorState } from '../../components/common/States';
import { PageLoader } from '../../components/common/Spinner';
import { Input } from '../../components/common/Input';
import Button from '../../components/common/Button';
import Pagination from '../../components/common/Pagination';
import { ConfirmDialog } from '../../components/common/Modal';
import { DonationCard } from '../../components/donations/DonationCard';
import { formatNumber } from '../../utils/formatters';

const TABS = [
  { value: 'ALL', label: 'All' },
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'CLAIMED', label: 'Claimed' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function MyDonations() {
  const { success, error: showError } = useToast();

  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [result, setResult] = useState({ items: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [pendingCancel, setPendingCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const debouncedSearch = useDebounce(search, 400);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await donationApi.mine({
        status: status === 'ALL' ? undefined : status,
        search: debouncedSearch || undefined,
        page,
        limit: 12,
      });
      setResult({ items: data.items || [], pagination: data.pagination || null });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [status, debouncedSearch, page]);

  useEffect(() => { load(); }, [load]);

  // Reset to page 1 whenever the filters change.
  useEffect(() => { setPage(1); }, [status, debouncedSearch]);

  const handleCancel = async () => {
    if (!pendingCancel) return;
    setCancelling(true);
    try {
      await donationApi.cancel(pendingCancel.id);
      success('Listing cancelled.');
      setPendingCancel(null);
      load();
    } catch (err) {
      showError(err.message);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My listings"
        subtitle="Every donation you have posted."
        actions={<Link to="/donor/donations/new" className="btn-primary">➕ New listing</Link>}
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
          placeholder="Search your listings…"
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
          icon="📦"
          title="No listings here"
          message={search ? 'No listings match your search.' : 'You have not posted any food yet.'}
          action={<Link to="/donor/donations/new" className="btn-primary">Post surplus food</Link>}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {result.items.map((donation) => (
              <DonationCard
                key={donation.id}
                donation={donation}
                to={`/donor/donations/${donation.id}`}
                actions={
                  <>
                    <Link to={`/donor/donations/${donation.id}`} className="btn-secondary btn-sm">Details</Link>
                    {donation.status === 'AVAILABLE' && (
                      <>
                        <Link to={`/donor/donations/${donation.id}/edit`} className="btn-ghost btn-sm">Edit</Link>
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setPendingCancel(donation)}>
                          Cancel
                        </Button>
                      </>
                    )}
                  </>
                }
              />
            ))}
          </div>

          <Pagination
            pagination={result.pagination}
            onPageChange={setPage}
            disabled={loading}
          />

          <p className="text-center text-xs text-slate-500">
            {formatNumber(result.pagination?.total || 0)} listing{(result.pagination?.total || 0) === 1 ? '' : 's'} total
          </p>
        </>
      )}

      <ConfirmDialog
        open={Boolean(pendingCancel)}
        title="Cancel this listing?"
        message={pendingCancel ? `"${pendingCancel.title}" will be removed from the feed. Recipients will no longer be able to claim it.` : ''}
        confirmLabel="Cancel listing"
        cancelLabel="Keep it"
        loading={cancelling}
        onConfirm={handleCancel}
        onCancel={() => setPendingCancel(null)}
      />
    </div>
  );
}
