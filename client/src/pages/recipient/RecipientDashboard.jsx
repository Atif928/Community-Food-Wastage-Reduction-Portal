/**
 * RecipientDashboard - an NGO / shelter / volunteer's home.
 *
 * Prioritises nearby food (by distance when the profile has coordinates) plus
 * the recipient's active pickups and recently completed ones.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/layout/PageHeader';
import { Card, EmptyState, ErrorState, StatCard } from '../../components/common/States';
import { PageLoader } from '../../components/common/Spinner';
import StatusBadge from '../../components/common/StatusBadge';
import { DonationRow } from '../../components/donations/DonationCard';
import { formatDateTime, formatMass, formatNumber, formatQuantity } from '../../utils/formatters';

export default function RecipientDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await dashboardApi.recipient());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <PageLoader label="Finding food near you…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return null;

  const { hasCoordinates, metrics, nearby, activeClaims, recentPickups } = data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hello, ${user?.fullName?.split(' ')[0] || 'there'} 👋`}
        subtitle="Fresh surplus food from donors near you."
        actions={<Link to="/recipient/explore" className="btn-primary">🔎 Find food</Link>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Meals received" value={formatNumber(metrics.mealsReceived)} icon="🍽️" />
        <StatCard label="Food received" value={formatMass(metrics.kgReceived)} icon="📦" tone="blue" />
        <StatCard label="Active pickups" value={formatNumber(metrics.activeClaims)} icon="🚚" tone="amber" />
        <StatCard label="Completed" value={formatNumber(metrics.deliveredClaims)} icon="✅" tone="slate" />
      </div>

      {!hasCoordinates && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Add your home coordinates in your <Link to="/profile" className="font-semibold underline">profile</Link> to
          sort listings by distance and receive nearby alerts.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card
          title="Available near you"
          subtitle={hasCoordinates ? 'Sorted by distance and expiry' : 'Sorted by soonest expiry'}
          action={<Link to="/recipient/explore" className="link text-sm">See all</Link>}
        >
          {nearby.length ? (
            <div className="space-y-3">
              {nearby.map((donation) => (
                <DonationRow
                  key={donation.id}
                  donation={donation}
                  to={`/recipient/explore`}
                  actions={<Link to="/recipient/explore" className="btn-primary btn-sm">Claim</Link>}
                />
              ))}
            </div>
          ) : (
            <EmptyState icon="🍲" title="No food available right now" message="We will notify you the moment a donor posts nearby." />
          )}
        </Card>

        <Card
          title="Active pickups"
          subtitle="Claims you still need to collect"
          action={<Link to="/recipient/claims" className="link text-sm">Manage</Link>}
        >
          {activeClaims.length ? (
            <ul className="space-y-3">
              {activeClaims.map((claim) => (
                <li key={claim.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link to={`/recipient/claims/${claim.id}`} className="line-clamp-1 text-sm font-semibold text-slate-800 hover:text-brand-700">
                        {claim.donation?.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {claim.donation?.quantity ? formatQuantity(claim.donation.quantity) : ''}
                        {claim.donor?.name ? ` · ${claim.donor.name}` : ''}
                      </p>
                      <p className="text-xs text-slate-500">📍 {claim.donation?.pickup?.city}</p>
                    </div>
                    <StatusBadge status={claim.status} kind="claim" />
                  </div>
                  <Link to={`/recipient/claims/${claim.id}`} className="link mt-2 inline-block text-xs">
                    Confirm pickup →
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="🚚" title="No active pickups" message="Claim a listing to arrange a collection." />
          )}
        </Card>
      </div>

      <Card title="Recent pickups">
        {recentPickups.length ? (
          <ul className="divide-y divide-slate-100">
            {recentPickups.map((claim) => (
              <li key={claim.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="line-clamp-1 text-sm font-semibold text-slate-800">{claim.donation?.title}</p>
                  <p className="text-xs text-slate-500">
                    {claim.donor?.name} · delivered {formatDateTime(claim.deliveredAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!claim.feedback && (
                    <Link to={`/recipient/claims/${claim.id}/feedback`} className="btn-secondary btn-sm">Rate</Link>
                  )}
                  <Link to={`/recipient/claims/${claim.id}`} className="btn-ghost btn-sm">View</Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon="🗂️" title="No completed pickups yet" />
        )}
      </Card>
    </div>
  );
}
