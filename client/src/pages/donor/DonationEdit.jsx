/**
 * DonationEdit - update an available listing.
 *
 * Only listings that are still AVAILABLE can be edited server-side, so we show
 * a clear notice (with a link back) when the listing has moved on.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { categoryApi, donationApi } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/layout/PageHeader';
import { ErrorState } from '../../components/common/States';
import { PageLoader } from '../../components/common/Spinner';
import DonationForm from '../../components/donations/DonationForm';

export default function DonationEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error: showError } = useToast();

  const [categories, setCategories] = useState([]);
  const [donation, setDonation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [categoryData, donationData] = await Promise.all([
        categoryApi.list(),
        donationApi.detail(id),
      ]);
      setCategories(categoryData.categories || []);
      setDonation(donationData.donation);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (payload, files) => {
    setSubmitting(true);
    try {
      await donationApi.update(id, payload, files);
      success('Listing updated.');
      navigate(`/donor/donations/${id}`);
    } catch (err) {
      showError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoader label="Loading the listing…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!donation) return null;

  if (donation.status !== 'AVAILABLE') {
    return (
      <div className="space-y-6">
        <PageHeader title="Edit listing" />
        <ErrorState
          title="This listing can no longer be edited"
          message={`"${donation.title}" is ${donation.status.toLowerCase()}. Only available listings can be changed.`}
        />
        <div className="flex justify-center">
          <Link to={`/donor/donations/${id}`} className="btn-secondary">Back to listing</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit listing"
        subtitle={donation.title}
        breadcrumb={<Link to={`/donor/donations/${id}`} className="text-sm text-slate-500 hover:text-slate-700">← Back to listing</Link>}
      />

      <DonationForm
        mode="edit"
        categories={categories}
        donation={donation}
        onSubmit={handleSubmit}
        submitting={submitting}
        onCancel={() => navigate(`/donor/donations/${id}`)}
      />
    </div>
  );
}
