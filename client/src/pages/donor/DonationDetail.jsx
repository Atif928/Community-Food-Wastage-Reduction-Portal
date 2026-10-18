/**
 * DonationDetail (donor view) - the full listing with photos, map, claim info,
 * received feedback and the status audit trail.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { donationApi } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/layout/PageHeader';
import { Card, ErrorState } from '../../components/common/States';
import { PageLoader } from '../../components/common/Spinner';
import Button from '../../components/common/Button';
import StatusBadge, { TypeBadge } from '../../components/common/StatusBadge';
import StarRating from '../../components/common/StarRating';
import { ConfirmDialog } from '../../components/common/Modal';
import ImageGallery from '../../components/donations/ImageGallery';
import StatusTimeline from '../../components/donations/StatusTimeline';
import DonationsMap from '../../components/map/DonationsMap';
import {
  formatDateTime,
  formatQuantity,
  formatRelativeExpiry,
  orgTypeLabel,
} from '../../utils/formatters';

export default function DonationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error: showError } = useToast();

  const [donation, setDonation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialog, setDialog] = useState(null); // 'cancel' | 'delete'
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await donationApi.detail(id);
      setDonation(data.donation);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async () => {
    setWorking(true);
    try {
      await donationApi.cancel(id);
      success('Listing cancelled.');
      setDialog(null);
      load();
    } catch (err) {
      showError(err.message);
    } finally {
      setWorking(false);
    }
  };

  const handleDelete = async () => {
    setWorking(true);
    try {
      await donationApi.remove(id);
      success('Listing deleted.');
      navigate('/donor/donations');
    } catch (err) {
      showError(err.message);
      setDialog(null);
    } finally {
      setWorking(false);
    }
  };

  if (loading) return <PageLoader label="Loading the listing…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!donation) return null;

  const canEdit = donation.status === 'AVAILABLE';
  const claim = donation.claim;

  return (
    <div className="space-y-6">
      <PageHeader
        title={donation.title}
        breadcrumb={<Link to="/donor/donations" className="text-sm text-slate-500 hover:text-slate-700">← My listings</Link>}
        subtitle={donation.category?.name}
        actions={
          <>
            <StatusBadge status={donation.status} />
            <TypeBadge type={donation.category?.type} />
            {canEdit && (
              <>
                <Link to={`/donor/donations/${id}/edit`} className="btn-secondary">Edit</Link>
                <Button variant="secondary" onClick={() => setDialog('cancel')}>Cancel</Button>
              </>
            )}
            <Button variant="danger" onClick={() => setDialog('delete')}>Delete</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Photos">
            <ImageGallery images={donation.images} title={donation.title} />
          </Card>

          <Card title="Details">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quantity</dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-800">{formatQuantity(donation.quantity)}</dd>
                <dd className="text-xs text-slate-500">{donation.quantity?.estimatedMeals ?? 0} estimated meals</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Best before</dt>
                <dd className={`mt-0.5 text-sm font-semibold ${donation.isExpired ? 'text-red-600' : 'text-slate-800'}`}>
                  {formatDateTime(donation.bestBefore)}
                </dd>
                <dd className="text-xs text-slate-500">{formatRelativeExpiry(donation.bestBefore)}</dd>
              </div>
              {donation.description && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</dt>
                  <dd className="mt-0.5 whitespace-pre-line text-sm text-slate-700">{donation.description}</dd>
                </div>
              )}
            </dl>
          </Card>

          <Card title="Pickup location" subtitle={[donation.pickup?.address, donation.pickup?.city].filter(Boolean).join(', ')}>
            <DonationsMap donations={[donation]} height="h-64" zoom={15} />
          </Card>

          <Card title="Activity timeline">
            <StatusTimeline history={donation.statusHistory} />
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Claim">
            {claim ? (
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Status</span>
                  <StatusBadge status={claim.status} kind="claim" />
                </div>
                {claim.recipient && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Claimed by</p>
                    <p className="font-semibold text-slate-800">{claim.recipient.name}</p>
                    <p className="text-xs text-slate-500">
                      {orgTypeLabel(claim.recipient.orgType)}
                      {claim.recipient.phone ? ` · ${claim.recipient.phone}` : ''}
                    </p>
                    {claim.recipient.email && (
                      <a className="link text-xs" href={`mailto:${claim.recipient.email}`}>{claim.recipient.email}</a>
                    )}
                  </div>
                )}
                {claim.pickupNote && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pickup note</p>
                    <p className="text-slate-700">{claim.pickupNote}</p>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Claimed</span>
                  <span>{formatDateTime(claim.claimedAt)}</span>
                </div>
                {claim.deliveredAt && (
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Delivered</span>
                    <span>{formatDateTime(claim.deliveredAt)}</span>
                  </div>
                )}
                <Link to="/donor/claims" className="link text-sm">View all received claims →</Link>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No one has claimed this listing yet. Recipients within range were notified when you posted it.
              </p>
            )}
          </Card>

          {donation.feedback && (
            <Card title="Feedback received">
              <StarRating value={donation.feedback.rating} showValue />
              {donation.feedback.comment && (
                <p className="mt-2 text-sm text-slate-700">“{donation.feedback.comment}”</p>
              )}
              <p className="mt-2 text-xs text-slate-500">
                {donation.feedback.recipientName} · {formatDateTime(donation.feedback.createdAt)}
              </p>
            </Card>
          )}

          <Card title="Donor">
            <p className="font-semibold text-slate-800">{donation.donor?.name}</p>
            <p className="text-xs text-slate-500">{orgTypeLabel(donation.donor?.orgType)} · {donation.donor?.city}</p>
            {donation.donor?.id && (
              <Link to={`/donors/${donation.donor.id}`} className="link mt-2 inline-block text-sm">
                View donor profile →
              </Link>
            )}
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={dialog === 'cancel'}
        title="Cancel this listing?"
        message="Recipients will no longer be able to claim it. This cannot be undone."
        confirmLabel="Cancel listing"
        cancelLabel="Keep it"
        loading={working}
        onConfirm={handleCancel}
        onCancel={() => setDialog(null)}
      />

      <ConfirmDialog
        open={dialog === 'delete'}
        title="Delete this listing?"
        message="The listing and its photos will be permanently removed. Listings with an active claim cannot be deleted."
        confirmLabel="Delete"
        loading={working}
        onConfirm={handleDelete}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}
