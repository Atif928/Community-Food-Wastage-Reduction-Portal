/**
 * DonorDashboard - impact at a glance for a restaurant / hotel / individual.
 *
 * Shows lifetime metrics (listings, meals saved, kg diverted), the rating
 * summary, a 6-month trend chart and the listings that are still active.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { dashboardApi } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/layout/PageHeader';
import { Card, EmptyState, ErrorState, StatCard } from '../../components/common/States';
import { PageLoader } from '../../components/common/Spinner';
import { DonationCard } from '../../components/donations/DonationCard';
import RatingSummary from '../../components/feedback/RatingSummary';
import { formatMass, formatMonthLabel, formatNumber } from '../../utils/formatters';

export default function DonorDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await dashboardApi.donor());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <PageLoader label="Loading your impact…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return null;

  const { metrics, rating, monthlyTrend, activeListings } = data;
  const chartData = (monthlyTrend || []).map((point) => ({
    ...point,
    label: formatMonthLabel(point.month),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.fullName?.split(' ')[0] || 'there'} 👋`}
        subtitle="Here is how much food you have kept out of landfill."
        actions={
          <>
            <Link to="/donor/donations/new" className="btn-primary">➕ New listing</Link>
            <Link to="/donor/donations" className="btn-secondary">My listings</Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total listings" value={formatNumber(metrics.totalListings)} icon="📦" />
        <StatCard label="Meals saved" value={formatNumber(metrics.mealsSaved)} icon="🍽️" tone="brand" hint="1 kg ≈ 2 meals" />
        <StatCard label="Food diverted" value={formatMass(metrics.totalKg)} icon="🌱" tone="blue" />
        <StatCard label="Active pickups" value={formatNumber(metrics.activeClaims)} icon="🙋" tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="6-month trend" subtitle="Donations and meals saved" className="lg:col-span-2">
          {chartData.length ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="meals" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="donations" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" allowDecimals={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="mealsSaved" name="Meals saved" stroke="#16a34a" fill="url(#meals)" strokeWidth={2} />
                  <Area type="monotone" dataKey="donations" name="Donations" stroke="#2563eb" fill="url(#donations)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState icon="📈" title="No trend yet" message="Post a few listings to see your monthly impact." />
          )}
        </Card>

        <Card title="Your rating">
          <RatingSummary average={rating.average} count={rating.count} distribution={rating.distribution} />
        </Card>
      </div>

      <Card
        title="Active listings"
        subtitle="Still available or awaiting pickup"
        action={<Link to="/donor/donations" className="link text-sm">View all</Link>}
      >
        {activeListings.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {activeListings.map((donation) => (
              <DonationCard
                key={donation.id}
                donation={donation}
                to={`/donor/donations/${donation.id}`}
                actions={
                  <>
                    <Link to={`/donor/donations/${donation.id}`} className="btn-secondary btn-sm">Details</Link>
                    <Link to={`/donor/donations/${donation.id}/edit`} className="btn-ghost btn-sm">Edit</Link>
                  </>
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="📦"
            title="Nothing available right now"
            message="Create a listing and nearby recipients will be notified instantly."
            action={<Link to="/donor/donations/new" className="btn-primary">Post surplus food</Link>}
          />
        )}
      </Card>
    </div>
  );
}
