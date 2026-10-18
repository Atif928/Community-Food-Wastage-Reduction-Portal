/**
 * AdminUsers - list and manage users.
 *
 * Filter by role, status, search. Quick actions: activate/suspend.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/layout/PageHeader';
import { EmptyState, ErrorState } from '../../components/common/States';
import { PageLoader } from '../../components/common/Spinner';
import { Input, Select } from '../../components/common/Input';
import Button from '../../components/common/Button';
import Pagination from '../../components/common/Pagination';
import { formatDate, orgTypeLabel } from '../../utils/formatters';

export default function AdminUsers() {
  const { success, error: showError } = useToast();
  const [filters, setFilters] = useState({ role: '', status: '', search: '' });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.listUsers({
        role: filters.role || undefined,
        status: filters.status || undefined,
        search: filters.search || undefined,
        page,
        limit: 15,
      });
      setResult({ items: data.items || [], pagination: data.pagination || null });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [filters]);

  const setStatus = (user, status) => {
    (async () => {
      try {
        await adminApi.updateUserStatus(user.id, { accountStatus: status });
        success('User status updated.');
        load();
      } catch (err) { showError(err.message); }
    })();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Users" subtitle="Manage donors and recipients." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Input name="search" placeholder="Search by name/email" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
        <Select name="role" placeholder="All roles" value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })}>
          <option value="DONOR">Donor</option>
          <option value="RECIPIENT">Recipient</option>
          <option value="ADMIN">Admin</option>
        </Select>
        <Select name="status" placeholder="All statuses" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="ACTIVE">Active</option>
          <option value="PENDING_VERIFICATION">Pending verification</option>
          <option value="SUSPENDED">Suspended</option>
        </Select>
      </div>

      {loading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={load} /> : result.items.length === 0 ? (
        <EmptyState icon="👥" title="No users" message="Nothing matches the filters." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Org</th><th>Status</th><th>Joined</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {result.items.map((user) => (
                  <tr key={user.id}>
                    <td className="font-medium text-slate-700">{user.fullName}</td>
                    <td className="text-xs text-slate-500">{user.email}</td>
                    <td className="text-xs text-slate-600">{user.role}</td>
                    <td className="text-xs text-slate-500">{orgTypeLabel(user.orgType)}</td>
                    <td className="text-xs">{user.accountStatus}</td>
                    <td className="text-xs text-slate-400">{formatDate(user.createdAt)}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link to={`/admin/users/${user.id}`} className="link text-xs">View</Link>
                        {user.role !== 'ADMIN' && user.accountStatus !== 'ACTIVE' && <Button size="sm" variant="secondary" onClick={() => setStatus(user, 'ACTIVE')}>Activate</Button>}
                        {user.role !== 'ADMIN' && user.accountStatus !== 'SUSPENDED' && <Button size="sm" variant="ghost" onClick={() => setStatus(user, 'SUSPENDED')}>Suspend</Button>}
                      </div>
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
