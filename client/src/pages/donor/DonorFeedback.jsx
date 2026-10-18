/**
 * DonorFeedback - the ratings this donor has received from recipients.
 *
 * Combines the aggregate summary (average + distribution) with the paginated
 * review list.
 */
import { useCallback, useEffect, useState } from 'react';
import { userApi } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/layout/PageHeader';
import { Card, ErrorState } from '../../components/common/States';
import { PageLoader } from '../../components/common/Spinner';
import Pagination from '../../components/common/Pagination';
import RatingSummary from '../../components/feedback/RatingSummary';
import ReviewList from '../../components/feedback/ReviewList';

export default function DonorFeedback() {
  const { user } = useAuth();

  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ average: null, count: 0, distribution: {} });
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await userApi.getDonorReviews(user.id, { page, limit: 10 });
      setReviews(data.items || []);
      setSummary(data.summary || { average: null, count: 0, distribution: {} });
      setPagination(data.pagination || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id, page]);

  useEffect(() => { load(); }, [load]);

  if (loading && !reviews.length) return <PageLoader label="Loading your reviews…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <PageHeader title="Reviews" subtitle="What recipients said about the food you donated." />

      <Card title="Rating summary">
        <RatingSummary average={summary.average} count={summary.count} distribution={summary.distribution} />
      </Card>

      <Card title="Recent reviews" subtitle={`${summary.count || 0} total`}>
        <ReviewList reviews={reviews} emptyLabel="No reviews yet" />
      </Card>

      <Pagination pagination={pagination} onPageChange={setPage} disabled={loading} />
    </div>
  );
}
