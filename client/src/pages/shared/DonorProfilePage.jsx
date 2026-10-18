/**
 * DonorProfilePage - public donor profile seen by recipients.
 *
 * Shows impact metrics, a 6-month trend, recent listings and paginated reviews
 * left by recipients.
 */
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { userApi } from '../../api/endpoints';
import PageHeader from '../../components/layout/PageHeader';
import { Card, EmptyState, ErrorState, StatCard } from '../../components/common/States';
import { PageLoader } from '../../components/common/Spinner';
import Pagination from '../../components/common/Pagination';
import Avatar from '../../components/common/Avatar';
import StarRating from '../../components/common/StarRating';
import RatingSummary from '../../components/feedback/RatingSummary';
import ReviewList from '../../components/feedback/ReviewList';
import { DonationCard } from '../../components/donations/DonationCard';
import { formatDate, formatMass, formatNumber } from '../../utils/formatters';

export default function DonorProfilePage() {
  const { id } = useParams();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ average: null, count: 0, distribution: {} });
  const [pagination, setPagination] = useState(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [page, setPage] = useState(1);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProfile(await userApi.getDonorProfile(id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadReviews = useCallback(async () => {
    setReviewsLoading(true);
    try {
      const data = await userApi.getDonorReviews(id, { page, limit: 10 });
      setReviews(data.items || []);
      setSummary(data.summary || { average: null, count: 0, distribution: {} });
      setPagination(data.pagination || null);
    } catch { /* keep existing */ }
    finally {
      setReviewsLoading(false);
    }
  }, [id, page]);

  useEffect(() => { loadProfile(); setPage(1); }, [loadProfile]);
  useEffect(() => { loadReviews(); }, [loadReviews]);

  if (loading) return <PageLoader label="Loading donor profile…" />;
  if (error) return <ErrorState message={error} onRetry={loadProfile} />;
  if (!profile) return null;

  const { donor, metrics, listings } = profile;

  return (
    <div className="space-y-6">
      <PageHeader
        title={donor.name}
        subtitle={`${donor.orgType?.toLowerCase().replace('_', ' ')} · ${donor.city}`}
        actions={donor.rating ? <StarRating value={donor.rating} showValue count={donor.ratingCount} /> : null}
      />

      <Card title="About">
        <div className="flex flex-wrap items-center gap-6">
          <Avatar name={donor.name} size="lg" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Member since</p>
              <p className="font-semibold text-slate-800">{formatDate(donor.memberSince)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">City</p>
              <p className="font-semibold text-slate-800">{donor.city}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Donations</p>
              <p className="font-semibold text-slate-800">{formatNumber(metrics.totalListings)}</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total donations" value={formatNumber(metrics.totalListings)} icon="📦" />
        <StatCard label="Active" value={formatNumber(metrics.activeListings)} icon="🍲" tone="brand" />
        <StatCard label="Meals saved" value={formatNumber(metrics.mealsSaved)} icon="🍽️" tone="amber" />
        <StatCard label="Food diverted" value={formatMass(metrics.totalKg)} icon="🌱" tone="blue" />
      </div>

      <Card title="Rating summary">
        <RatingSummary average={summary.average || donor.rating} count={summary.count || donor.ratingCount} distribution={summary.distribution} />
      </Card>

      {listings.length > 0 && (
        <Card title="Active listings" subtitle="Currently available">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {listings.map((donation) => (
              <DonationCard key={donation.id} donation={donation} to={null} />
            ))}
          </div>
        </Card>
      )}

      <Card title="Reviews" subtitle={`${summary.count || 0} total`}>
        {reviewsLoading && !reviews.length ? <PageLoader /> : <ReviewList reviews={reviews} />}
      </Card>

      <Pagination pagination={pagination} onPageChange={setPage} disabled={reviewsLoading} />
    </div>
  );
}
