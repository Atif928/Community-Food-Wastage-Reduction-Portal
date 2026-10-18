/**
 * AdminUserDetail - a single user's context and verification state.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminApi } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/layout/PageHeader';
import { Card, ErrorState } from '../../components/common/States';
import { PageLoader } from '../../components/common/Spinner';
import Button from '../../components/common/Button';
import Avatar from '../../components/common/Avatar';
import { formatDate, formatDateTime, orgTypeLabel } from '../../utils/formatters';

export default function AdminUserDetail() {
  const { id } = useParams();
  const { success, error: showError } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await adminApi.getUser(id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const setStatus = (status) => {
    (async () => {
      try {
        await adminApi.updateUserStatus(id, { accountStatus: status });
        success('Status updated.');
        load();
      } catch (err) { showError(err.message); }
    })();
  };

  if (loading) return <PageLoader label="Loading user…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return null;

  const { user, verification, recentDonations, recentClaims } = data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={user.fullName}
        subtitle={`${user.email} · ${orgTypeLabel(user.orgType)}`}
        breadcrumb={<Link to="/admin/users" className="text-sm text-slate-500 hover:text-slate-700">← Users</Link>}
        actions={
          <>
            {user.role !== 'ADMIN' && user.accountStatus !== 'ACTIVE' && <Button onClick={() => setStatus('ACTIVE')}>Activate</Button>}
            {user.role !== 'ADMIN' && user.accountStatus !== 'SUSPENDED' && <Button variant="secondary" onClick={() => setStatus('SUSPENDED')}>Suspend</Button>}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Profile">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Avatar name={user.fullName} size="md" />
              <div>
                <p className="font-semibold text-slate-800">{user.fullName}</p>
                <p className="text-xs text-slate-500">{user.city} · Joined {formatDate(user.createdAt)}</p>
              </div>
            </div>
            <dl className="text-sm space-y-1">
              <div className="flex justify-between"><dt className="text-slate-500">Role</dt><dd>{user.role}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd>{user.accountStatus}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Phone</dt><dd>{user.phone || '-'}</dd></div>
            </dl>
          </div>
        </Card>

        {verification && (
          <Card title="Verification" className="lg:col-span-2">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">{verification.status}</p>
                <p className="text-xs text-slate-500">Submitted {formatDateTime(verification.submittedAt)}</p>
                {verification.reviewNote && <p className="mt-1 text-sm text-slate-600">“{verification.reviewNote}”</p>}
              </div>
              {verification.documentUrl && <a href={verification.documentUrl} target="_blank" rel="noreferrer" className="link text-sm">View document</a>}
            </div>
          </Card>
        )}

        {recentDonations.length > 0 && (
          <Card title="Recent donations" className="lg:col-span-2">
            <ul className="space-y-2 text-sm">
              {recentDonations.map((don) => (
                <li key={don.id} className="flex justify-between">
                  <span className="text-slate-700">{don.title}</span>
                  <span className="text-xs text-slate-500">{don.status}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {recentClaims.length > 0 && (
          <Card title="Recent claims">
            <ul className="space-y-2 text-sm">
              {recentClaims.map((claim) => (
                <li key={claim.id} className="flex justify-between">
                  <span className="text-slate-700">{claim.donationTitle}</span>
                  <span className="text-xs text-slate-500">{claim.status}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
