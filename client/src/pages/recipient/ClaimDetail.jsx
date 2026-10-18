/**
 * ClaimDetail (recipient) - one pickup in full.
 *
 * Active claims can be confirmed (with an optional proof photo + note) or
 * cancelled. Delivered claims show the proof and offer a rating link when the
 * donor has not been rated yet.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { claimApi } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/layout/PageHeader';
import { Card, ErrorState } from '../../components/common/States';
import { PageLoader } from '../../components/common/Spinner';
import Button from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import StatusBadge, { TypeBadge } from '../../components/common/StatusBadge';
import StarRating from '../../components/common/StarRating';
import { Textarea } from '../../components/common/Input';
import ImageGallery from '../../components/donations/ImageGallery';
import DonationsMap from '../../components/map/DonationsMap';
import { validateImageFile } from '../../utils/validators';
import {
  fileUrl, formatDateTime, formatQuantity, mealsFromQuantity, orgTypeLabel,
} from '../../utils/formatters';

export default function ClaimDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error: showError } = useToast();

  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [deliverOpen, setDeliverOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [proof, setProof] = useState(null);
  const [working, setWorking] = useState(false);

  const proofInputRef = useRef(null);

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

  const handleDeliver = async () => {
    if (proof) {
      const problem = validateImageFile(proof);
      if (problem) { showError(problem); return; }
    }
    setWorking(true);
    try {
      await claimApi.deliver(id, { note: note.trim(), proof });
      success('Pickup confirmed. Thanks for rescuing that food!');
      setDeliverOpen(false);
      setNote('');
      setProof(null);
      load();
    } catch (err) {
      showError(err.message);
    } finally {
      setWorking(false);
    }
  };

  const handleCancel = async () => {
    setWorking(true);
    try {
      await claimApi.cancel(id, reason.trim() || undefined);
      success('Claim cancelled. The listing is available again.');
      setCancelOpen(false);
      load();
    } catch (err) {
      showError(err.message);
    } finally {
      setWorking(false);
    }
  };

  if (loading) return <PageLoader label="Loading pickup…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!claim) return null;

  const donation = claim.donation;
  const isActive = claim.status === 'ACTIVE';

  return (
    <div className="space-y-6">
      <PageHeader
        title={donation?.title || 'Pickup'}
        subtitle={donation?.category?.name}
        breadcrumb={<Link to="/recipient/claims" className="text-sm text-slate-500 hover:text-slate-700">← My pickups</Link>}
        actions={
          <>
            <StatusBadge status={claim.status} kind="claim" />
            {donation?.category?.type && <TypeBadge type={donation.category.type} />}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {donation?.primaryImage && (
            <Card title="Food photo">
              <ImageGallery images={[{ id: 'main', url: donation.primaryImage }]} title={donation.title} height="h-56" />
            </Card>
          )}

          <Card title="Pickup details">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quantity</dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-800">
                  {donation?.quantity ? formatQuantity(donation.quantity) : '—'}
                </dd>
                <dd className="text-xs text-slate-500">
                  ≈ {donation?.quantity ? mealsFromQuantity(donation.quantity) : 0} meals
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Best before</dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-800">{formatDateTime(donation?.bestBefore)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pickup address</dt>
                <dd className="mt-0.5 text-sm text-slate-700">
                  {[donation?.pickup?.address, donation?.pickup?.city].filter(Boolean).join(', ') || 'See map'}
                </dd>
              </div>
            </dl>

            {donation && (
              <div className="mt-4">
                <DonationsMap donations={[donation]} height="h-60" zoom={15} />
              </div>
            )}
          </Card>

          {claim.deliveredAt && (
            <Card title="Delivery">
              <p className="text-sm text-slate-700">
                Confirmed on <strong>{formatDateTime(claim.deliveredAt)}</strong>.
              </p>
              {claim.deliveredProofUrl && (
                <img
                  src={fileUrl(claim.deliveredProofUrl)}
                  alt="Delivery proof"
                  className="mt-3 max-h-72 rounded-xl object-contain ring-1 ring-slate-200"
                />
              )}
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card title="Donor">
            <p className="font-semibold text-slate-800">{claim.donor?.name}</p>
            <p className="text-xs text-slate-500">{orgTypeLabel(claim.donor?.orgType)} · {claim.donor?.city}</p>
            {claim.donor?.phone && (
              <p className="mt-2 text-sm text-slate-700">📞 {claim.donor.phone}</p>
            )}
            {claim.donor?.email && (
              <a className="link text-sm" href={`mailto:${claim.donor.email}`}>{claim.donor.email}</a>
            )}
            {claim.donor?.rating && (
              <div className="mt-2">
                <StarRating value={claim.donor.rating} size="sm" showValue />
              </div>
            )}
          </Card>

          {claim.pickupNote && (
            <Card title="Your pickup note">
              <p className="text-sm text-slate-700">{claim.pickupNote}</p>
            </Card>
          )}

          <Card title="Actions">
            {isActive ? (
              <div className="space-y-2">
                <p className="text-sm text-slate-600">
                  Collected the food? Confirm the pickup so the donor knows and the listing is marked delivered.
                </p>
                <Button fullWidth onClick={() => setDeliverOpen(true)}>✅ Confirm pickup</Button>
                <Button fullWidth variant="secondary" onClick={() => setCancelOpen(true)}>Cancel claim</Button>
              </div>
            ) : claim.status === 'DELIVERED' ? (
              claim.feedback ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700">You rated this donation</p>
                  <StarRating value={claim.feedback.rating} showValue />
                  {claim.feedback.comment && <p className="text-sm text-slate-600">“{claim.feedback.comment}”</p>}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">How was the food? Your rating helps donors improve.</p>
                  <Button fullWidth onClick={() => navigate(`/recipient/claims/${id}/feedback`)}>⭐ Rate this donation</Button>
                </div>
              )
            ) : (
              <p className="text-sm text-slate-600">
                This claim was cancelled and the listing is available to others again.
              </p>
            )}
          </Card>
        </div>
      </div>

      {/* --------------------------- confirm pickup --------------------------- */}
      <Modal
        open={deliverOpen}
        title="Confirm pickup"
        description="Let the donor know you have collected the food."
        onClose={() => setDeliverOpen(false)}
        footer={(
          <>
            <Button variant="secondary" onClick={() => setDeliverOpen(false)} disabled={working}>Cancel</Button>
            <Button onClick={handleDeliver} loading={working}>Confirm pickup</Button>
          </>
        )}
      >
        <div className="space-y-4">
          <Textarea
            label="Note (optional)"
            name="note"
            rows={3}
            maxLength={300}
            placeholder="e.g. Collected all 20 kg — thank you!"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />

          <div>
            <span className="label">Proof photo (optional)</span>
            <input
              ref={proofInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => setProof(event.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
            />
            <p className="helper-text">A photo of the collected food builds trust with donors.</p>
          </div>
        </div>
      </Modal>

      {/* ---------------------------- cancel claim ---------------------------- */}
      <Modal
        open={cancelOpen}
        title="Cancel this claim?"
        description="The listing becomes available to other recipients again."
        onClose={() => setCancelOpen(false)}
        footer={(
          <>
            <Button variant="secondary" onClick={() => setCancelOpen(false)} disabled={working}>Keep claim</Button>
            <Button variant="danger" onClick={handleCancel} loading={working}>Cancel claim</Button>
          </>
        )}
      >
        <Textarea
          label="Reason (optional)"
          name="reason"
          rows={3}
          maxLength={300}
          placeholder="e.g. Could not arrange transport in time."
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </Modal>
    </div>
  );
}
