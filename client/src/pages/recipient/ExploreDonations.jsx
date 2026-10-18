/**
 * ExploreDonations - the recipient feed.
 *
 * Filters (city, category, type, radius, search, sort) drive GET /donations.
 * Results can be viewed as a list or on the map; clicking a card opens a detail
 * modal (with photos, map pin and a Claim action).
 *
 * "Near me" uses the browser geolocation hook to add latitude/longitude so the
 * API can sort by distance and filter by radius.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { categoryApi, claimApi, donationApi } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useDebounce } from '../../hooks/useDebounce';
import PageHeader from '../../components/layout/PageHeader';
import { EmptyState, ErrorState } from '../../components/common/States';
import { PageLoader } from '../../components/common/Spinner';
import Button from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import { Textarea } from '../../components/common/Input';
import StatusBadge, { TypeBadge } from '../../components/common/StatusBadge';
import { DonationCard } from '../../components/donations/DonationCard';
import DonationFilters from '../../components/donations/DonationFilters';
import ImageGallery from '../../components/donations/ImageGallery';
import StatusTimeline from '../../components/donations/StatusTimeline';
import DonationsMap from '../../components/map/DonationsMap';
import { formatDateTime, formatQuantity, mealsFromQuantity, orgTypeLabel } from '../../utils/formatters';

const DEFAULT_FILTERS = { search: '', city: '', categoryId: '', type: '', sort: 'expiry', radiusKm: 25 };

export default function ExploreDonations() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const geo = useGeolocation();

  const [categories, setCategories] = useState([]);
  const [cities, setCities] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState('');
  const [nearMe, setNearMe] = useState(false);
  const [view, setView] = useState('list');
  const [page, setPage] = useState(1);

  const [result, setResult] = useState({ items: [], pagination: null, totals: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selected, setSelected] = useState(null); // donation id for the modal
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pickupNote, setPickupNote] = useState('');
  const [claiming, setClaiming] = useState(false);

  const debouncedSearch = useDebounce(searchInput, 400);

  /* ------------------------------ reference data ------------------------------ */
  useEffect(() => {
    (async () => {
      try {
        const data = await categoryApi.list();
        setCategories(data.categories || []);
        setCities(data.cities || []);
      } catch { /* filters simply stay empty */ }
    })();
  }, []);

  // Keep the filter object in sync with the debounced search box.
  useEffect(() => { setFilters((current) => ({ ...current, search: debouncedSearch })); setPage(1); }, [debouncedSearch]);

  const updateFilter = (field, value) => {
    if (field === 'search') { setSearchInput(value); return; }
    setFilters((current) => ({ ...current, [field]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchInput('');
    setNearMe(false);
    setPage(1);
  };

  const toggleNearMe = async () => {
    if (nearMe) { setNearMe(false); return; }
    setNearMe(true);
    try { await geo.request(); } catch { /* banner explains */ }
  };

  /* --------------------------------- listings --------------------------------- */
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        search: filters.search || undefined,
        city: filters.city || undefined,
        categoryId: filters.categoryId || undefined,
        type: filters.type || undefined,
        sort: filters.sort || undefined,
        page,
        limit: 12,
      };
      if (nearMe && geo.latitude !== null) {
        params.latitude = geo.latitude;
        params.longitude = geo.longitude;
        params.radiusKm = filters.radiusKm;
      }
      const data = await donationApi.browse(params);
      setResult({ items: data.items || [], pagination: data.pagination || null, totals: data.totals || null });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, nearMe, geo.latitude, geo.longitude, page]);

  useEffect(() => { load(); }, [load]);

  /* ------------------------------ detail modal -------------------------------- */
  const openDetail = async (donationId) => {
    setSelected(donationId);
    setDetail(null);
    setPickupNote('');
    setDetailLoading(true);
    try {
      const params = nearMe && geo.latitude !== null
        ? { latitude: geo.latitude, longitude: geo.longitude }
        : {};
      const data = await donationApi.detail(donationId, params);
      setDetail(data.donation);
    } catch (err) {
      showError(err.message);
      setSelected(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => { setSelected(null); setDetail(null); };

  const handleClaim = async () => {
    if (!detail) return;
    setClaiming(true);
    try {
      const data = await claimApi.claim(detail.id, pickupNote.trim() || undefined);
      success('Claim confirmed! Coordinate the pickup with the donor.');
      closeDetail();
      navigate(`/recipient/claims/${data.claim.id}`);
    } catch (err) {
      showError(err.message);
    } finally {
      setClaiming(false);
    }
  };

  const isOwnDonation = detail && user?.id && detail.donor?.id === user.id;
  const totals = result.totals;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Find food"
        subtitle="Surplus food from restaurants, hotels and individuals near you."
        actions={
          <div className="flex rounded-lg border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setView('list')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${view === 'list' ? 'bg-brand-600 text-white' : 'text-slate-600'}`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setView('map')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${view === 'map' ? 'bg-brand-600 text-white' : 'text-slate-600'}`}
            >
              Map
            </button>
          </div>
        }
      />

      <DonationFilters
        filters={{ ...filters, search: searchInput }}
        onChange={updateFilter}
        categories={categories}
        cities={cities}
        nearMe={nearMe}
        onToggleNearMe={toggleNearMe}
        geoStatus={geo.status}
        onUseLocation={() => geo.request().catch(() => {})}
        onReset={resetFilters}
        disabled={loading}
      />

      {totals && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-900">
          <span><strong>{totals.listing_count ?? 0}</strong> listings</span>
          <span><strong>{totals.meals_available ?? 0}</strong> meals available</span>
          <span><strong>{totals.total_kg ?? 0}</strong> kg</span>
          <span><strong>{totals.total_servings ?? 0}</strong> servings</span>
        </div>
      )}

      {loading ? (
        <PageLoader label="Searching for food…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : view === 'map' ? (
        <DonationsMap
          donations={result.items}
          height="h-[32rem]"
          selectedId={selected}
          onSelect={openDetail}
          userLocation={nearMe && geo.coords ? geo.coords : null}
          radiusKm={nearMe ? filters.radiusKm : null}
        />
      ) : result.items.length === 0 ? (
        <EmptyState
          icon="🔎"
          title="No matching food"
          message="Try widening the radius, clearing the filters, or check back soon."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {result.items.map((donation) => (
            <DonationCard
              key={donation.id}
              donation={donation}
              to={null}
              actions={
                <>
                  <Button size="sm" variant="secondary" onClick={() => openDetail(donation.id)}>View</Button>
                  <Button size="sm" onClick={() => openDetail(donation.id)}>Claim</Button>
                </>
              }
            />
          ))}
        </div>
      )}

      <Pagination pagination={result.pagination} onPageChange={setPage} disabled={loading} />

      {/* ---------------------------- detail modal ---------------------------- */}
      <Modal
        open={Boolean(selected)}
        title={detail?.title || 'Loading…'}
        onClose={closeDetail}
        size="xl"
        footer={detail ? (
          <>
            <Button variant="secondary" onClick={closeDetail} disabled={claiming}>Close</Button>
            <Button
              onClick={handleClaim}
              loading={claiming}
              disabled={claiming || detail.status !== 'AVAILABLE' || detail.isExpired || isOwnDonation}
            >
              {isOwnDonation ? 'Your own listing' : 'Claim this food'}
            </Button>
          </>
        ) : null}
      >
        {detailLoading || !detail ? (
          <PageLoader label="Loading listing…" />
        ) : (
          <div className="space-y-5">
            <ImageGallery images={detail.images} title={detail.title} height="h-60" />

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={detail.status} />
              <TypeBadge type={detail.category?.type} />
              <span className="badge bg-slate-100 text-slate-700">{detail.category?.name}</span>
              {detail.distanceKm !== null && detail.distanceKm !== undefined && (
                <span className="badge bg-slate-100 text-slate-700">📍 {detail.distanceKm} km away</span>
              )}
            </div>

            {detail.description && <p className="text-sm text-slate-700">{detail.description}</p>}

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quantity</dt>
                <dd className="font-semibold text-slate-800">{formatQuantity(detail.quantity)}</dd>
                <dd className="text-xs text-slate-500">≈ {mealsFromQuantity(detail.quantity)} meals</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Best before</dt>
                <dd className="font-semibold text-slate-800">{formatDateTime(detail.bestBefore)}</dd>
              </div>
            </dl>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Pickup point</p>
              <DonationsMap donations={[detail]} height="h-56" zoom={15} />
              <p className="mt-1 text-xs text-slate-500">
                {[detail.pickup?.address, detail.pickup?.city].filter(Boolean).join(', ')}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Donor</p>
              <p className="font-semibold text-slate-800">{detail.donor?.name}</p>
              <p className="text-xs text-slate-500">
                {orgTypeLabel(detail.donor?.orgType)} · {detail.donor?.city}
              </p>
            </div>

            {detail.statusHistory?.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">History</p>
                <StatusTimeline history={detail.statusHistory} />
              </div>
            )}

            {detail.status === 'AVAILABLE' && !isOwnDonation && (
              <Textarea
                label="Pickup note (optional)"
                name="pickupNote"
                rows={2}
                maxLength={300}
                placeholder="e.g. We can collect between 6–8 pm today."
                value={pickupNote}
                onChange={(event) => setPickupNote(event.target.value)}
                help="Shared with the donor so they can prepare."
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
