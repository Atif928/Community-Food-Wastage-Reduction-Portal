/**
 * AdminDonations - all listings, with moderation controls.
 */
import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/layout/PageHeader';
import { EmptyState, ErrorState } from '../../components/common/States';
import { PageLoader } from '../../components/common/Spinner';
import { Input } from '../../components/common/Input';
import Button from '../../components/common/Button';
import Pagination from '../../components/common/Pagination';
import StatusBadge from '../../components/common/StatusBadge';
import { formatDateTime } from '../../utils/formatters';

export default function AdminDonations() {
  const { success, error: showError } = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.listDonations({ search: search || undefined, page, limit: 15 });
      setResult({ items: data.items || [], pagination: data.pagination || null });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  const del = (id) => {
    (async () => {
      try {
        await adminApi.deleteDonation(id);
        success('Listing deleted.');
        load();
      } catch (err) { showError(err.message); }
    })();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Listings" subtitle="Moderate all donations." />

      <Input name="search" placeholder="Search title/city" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />

      {loading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={load} /> : result.items.length === 0 ? (
        <EmptyState icon="📦" title="No listings" />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Title</th><th>Donor</th><th>City</th><th>Status</th><th>Best before</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {result.items.map((don) => (
                  <tr key={don.id}>
                    <td className="font-medium text-slate-700">{don.title}</td>
                    <td className="text-xs text-slate-500">{don.donor?.name}</td>
                    <td className="text-xs text-slate-500">{don.pickup?.city}</td>
                    <td><StatusBadge status={don.status} /></td>
                    <td className="text-xs text-slate-400">{formatDateTime(don.bestBefore)}</td>
                    <td className="text-right"><Button size="sm" variant="ghost" onClick={() => del(don.id)}>Delete</Button></td>
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
