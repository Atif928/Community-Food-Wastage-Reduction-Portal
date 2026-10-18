/**
 * AdminDashboard - overview for administrators.
 *
 * Pulls headline metrics, 6-month trend, city summary and the latest users.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/endpoints';
import PageHeader from '../../components/layout/PageHeader';
import { Card, ErrorState, StatCard } from '../../components/common/States';
import { PageLoader } from '../../components/common/Spinner';
import { formatMass, formatNumber, formatMonthLabel } from '../../utils/formatters';
import { ResponsiveContainer, Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await adminApi.overview());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <PageLoader label="Loading admin overview…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return null;

  const { headline, monthlyTrend, citySummary, latestUsers } = data;
  const trend = (monthlyTrend || []).map((point) => ({ ...point, label: formatMonthLabel(point.month) }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin overview"
        subtitle="Platform impact, verifications and activity."
        actions={
          <>
            <Link to="/admin/verifications" className="btn-secondary">Verifications</Link>
            <Link to="/admin/reports" className="btn-primary">Full reports</Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total donations" value={formatNumber(headline.totalDonations)} icon="📦" />
        <StatCard label="Meals saved" value={formatNumber(headline.mealsSaved)} icon="🍽️" tone="brand" />
        <StatCard label="Food diverted" value={formatMass(headline.totalKg)} icon="🌱" tone="blue" />
        <StatCard label="Pending verifications" value={formatNumber(headline.pendingVerifications)} icon="🛡️" tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="6-month trend" subtitle="Donations & meals saved">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="donations" name="Donations" stroke="#2563eb" fillOpacity={0.25} fill="#2563eb" strokeWidth={2} />
                <Area type="monotone" dataKey="meals_saved" name="Meals saved" stroke="#16a34a" fillOpacity={0.25} fill="#16a34a" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Top cities" subtitle="Donations per city">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={citySummary} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="city" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="donations" name="Donations" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Latest users" subtitle="Recent signups">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th></tr>
            </thead>
            <tbody>
              {latestUsers.map((user) => (
                <tr key={user.id}>
                  <td className="font-medium text-slate-700">{user.fullName}</td>
                  <td className="text-xs text-slate-500">{user.email}</td>
                  <td className="text-xs text-slate-600">{user.role}</td>
                  <td className="text-xs">{user.accountStatus}</td>
                  <td className="text-xs text-slate-400">{formatDate(user.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
