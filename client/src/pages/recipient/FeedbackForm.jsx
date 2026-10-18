/**
 * FeedbackForm (page) - rate a delivered donation.
 *
 * Guards against rating something that is not delivered or already rated, then
 * renders the shared RatingForm and posts to POST /feedback.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { claimApi, feedbackApi } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/layout/PageHeader';
import { Card, ErrorState } from '../../components/common/States';
import { PageLoader } from '../../components/common/Spinner';
import StarRating from '../../components/common/StarRating';
import RatingForm from '../../components/feedback/RatingForm';
import { formatDateTime, formatQuantity } from '../../utils/formatters';

export default function FeedbackForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error: showError } = useToast();

  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await claimApi.detail(id);
      setClaim(data.claim);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async ({ rating, comment }) => {
    setSubmitting(true);
    try {
      await feedbackApi.create({ claimId: Number(id), rating, comment });
      success('Thanks for your feedback!');
      navigate(`/recipient/claims/${id}`);
    } catch (err) {
      showError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoader label="Loading…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!claim) return null;

  // Guard rails: only delivered + not-yet-rated donations can be rated.
  if (claim.status !== 'DELIVERED') {
    return (
      <div className="space-y-6">
        <PageHeader title="Rate this donation" />
        <ErrorState
          title="You can rate once the pickup is confirmed"
          message="Confirm the pickup first, then come back to share how the food was."
        />
        <div className="flex justify-center">
          <Link to={`/recipient/claims/${id}`} className="btn-secondary">Back to pickup</Link>
        </div>
      </div>
    );
  }

  if (claim.feedback) {
    return (
      <div className="space-y-6">
        <PageHeader title="Already rated" />
        <Card title="Your rating">
          <StarRating value={claim.feedback.rating} showValue />
          {claim.feedback.comment && <p className="mt-2 text-sm text-slate-600">“{claim.feedback.comment}”</p>}
          <p className="mt-3 text-sm text-slate-500">Thanks again for helping donors improve.</p>
        </Card>
        <div className="flex justify-center">
          <Link to={`/recipient/claims/${id}`} className="btn-secondary">Back to pickup</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rate this donation"
        subtitle={claim.donation?.title}
        breadcrumb={<Link to={`/recipient/claims/${id}`} className="text-sm text-slate-500 hover:text-slate-700">← Back to pickup</Link>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Donation" className="lg:col-span-1">
          <p className="font-semibold text-slate-800">{claim.donation?.title}</p>
          <p className="text-xs text-slate-500">{claim.donor?.name}</p>
          <p className="mt-2 text-sm text-slate-600">
            {claim.donation?.quantity ? formatQuantity(claim.donation.quantity) : ''}
          </p>
          <p className="text-xs text-slate-500">Delivered {formatDateTime(claim.deliveredAt)}</p>
        </Card>

        <Card title="Your feedback" className="lg:col-span-2">
          <RatingForm onSubmit={handleSubmit} submitting={submitting} />
        </Card>
      </div>
    </div>
  );
}
