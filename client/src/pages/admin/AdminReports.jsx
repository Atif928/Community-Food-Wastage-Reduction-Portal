/**
 * AdminReports - full analytics dashboard.
 *
 * Pulls GET /admin/reports and renders charts: monthly trend (LineChart via
 * Recharts), city trends, city summary, category breakdown and rating dist.
 */
import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../../api/endpoints';
import PageHeader from '../../components/layout/PageHeader';
import { Card, ErrorState, StatCard } from '../../components/common/States';
import { PageLoader } from '../../components/common/Spinner';
import { formatMass, formatMonthLabel } from '../../utils/formatters';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

export default function AdminReports() {
  const [months, setMonths] = useState(6);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await adminApi.reports(months));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [months]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <PageLoader label="Loading reports…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return null;

  const trend = (data.monthlyTrend || []).map((p) => ({ ...p, label: formatMonthLabel(p.month) }));
  const category = (data.categoryBreakdown || []).map((c) => ({ ...c, name: c.category }));
  const COLORS = ['#2563eb','#16a34a','#f59e0b','#ef4444','#8b5cf6','#64748b'];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Full platform analytics."
        actions={
          <div className="flex gap-2">
            {[6,12].map((m) => (
              <button key={m} type="button" onClick={() => setMonths(m)} className={`px-3 py-1.5 text-sm rounded-lg ${months===m?'bg-brand-600 text-white':'bg-white border border-slate-300 text-slate-600'}`}>{m} months</button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Donations" value={data.headline.totalDonations} icon="📦" />
        <StatCard label="Delivered" value={data.headline.deliveredDonations} icon="✅" tone="blue" />
        <StatCard label="Meals saved" value={data.headline.mealsSaved} icon="🍽️" tone="brand" />
        <StatCard label="Food diverted" value={formatMass(data.headline.totalKg)} icon="🌱" tone="amber" />
      </div>

      <Card title="Monthly trend">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top:8,right:8,left:-16,bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize:12 }} />
              <YAxis tick={{ fontSize:12 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="donations" name="Donations" stroke="#2563eb" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="delivered" name="Delivered" stroke="#16a34a" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="meals_saved" name="Meals saved" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="By city (summary)">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.citySummary} margin={{ top:8,right:8,left:-8,bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="city" tick={{ fontSize:12 }} />
                <YAxis tick={{ fontSize:12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="donations" name="Donations" fill="#2563eb" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="By category">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={category} dataKey="donations" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {category.map((_, idx) => <Cell key={idx} fill={COLORS[idx%COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
