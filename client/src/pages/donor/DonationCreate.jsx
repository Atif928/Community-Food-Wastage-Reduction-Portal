/**
 * DonationCreate - post a new surplus food listing.
 *
 * Loads the food categories, then hands the form off to DonationForm. On
 * success we jump straight to the detail page so the donor can copy the link.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { categoryApi, donationApi } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/layout/PageHeader';
import { ErrorState } from '../../components/common/States';
import { PageLoader } from '../../components/common/Spinner';
import DonationForm from '../../components/donations/DonationForm';

export default function DonationCreate() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error: showError } = useToast();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await categoryApi.list();
      setCategories(data.categories || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (payload, files) => {
    setSubmitting(true);
    try {
      const data = await donationApi.create(payload, files);
      success('Listing published! Nearby recipients have been notified.');
      navigate(`/donor/donations/${data.donation.id}`);
    } catch (err) {
      showError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoader label="Preparing the form…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Post surplus food"
        subtitle="Give great food a second chance - nearby NGOs and shelters are notified the moment you publish."
        breadcrumb={<Link to="/donor/donations" className="text-sm text-slate-500 hover:text-slate-700">← My listings</Link>}
      />

      <DonationForm
        mode="create"
        categories={categories}
        onSubmit={handleSubmit}
        submitting={submitting}
        onCancel={() => navigate('/donor/donations')}
      />

      {user?.city && (
        <p className="text-xs text-slate-500">
          Tip: your account city is <strong>{user.city}</strong>. Make sure the pickup city matches.
        </p>
      )}
    </div>
  );
}
