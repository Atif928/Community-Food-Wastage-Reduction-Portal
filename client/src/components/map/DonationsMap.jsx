/**
 * DonationsMap - plots available donations as map pins.
 *
 * Used by the recipient feed (all results) and the detail pages (a single pin).
 * Without a Google Maps API key it renders <MapFallback /> so the page keeps
 * working; the list view is always available alongside.
 *
 * Props
 *   donations[]   serialised donation summaries (need pickup.latitude/longitude)
 *   center        { lat, lng } - defaults to Bengaluru
 *   zoom, height  presentation
 *   selectedId    currently highlighted donation id
 *   onSelect      (id) => void, called when a pin is clicked
 *   userLocation  { latitude, longitude } - draws the "you are here" pin + radius
 *   radiusKm      radius circle around `userLocation`
 */
import { useCallback, useState } from 'react';
import { Circle, GoogleMap, InfoWindowF, MarkerF, useJsApiLoader } from '@react-google-maps/api';
import { DEFAULT_MAP_CENTER, GOOGLE_MAPS_API_KEY } from '../../utils/constants';
import { formatQuantity, formatRelativeExpiry } from '../../utils/formatters';
import StatusBadge from '../common/StatusBadge';
import MapFallback from './MapFallback';

const LOADER_OPTIONS = { id: 'food-portal-map', googleMapsApiKey: GOOGLE_MAPS_API_KEY };
const CONTAINER_STYLE = { width: '100%', height: '100%' };

/** Keep only donations that actually carry coordinates. */
function withCoordinates(donations = []) {
  return donations.filter((donation) => (
    donation?.pickup?.latitude !== null
    && donation?.pickup?.latitude !== undefined
    && Number.isFinite(Number(donation.pickup.latitude))
    && Number.isFinite(Number(donation.pickup.longitude))
  ));
}

export function DonationsMap(props) {
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <MapFallback
        height={props.height || 'h-96'}
        title="Map view is off"
        message="A Google Maps API key is not configured. Switch to the list view to see every listing and its city."
      />
    );
  }
  return <GoogleDonationsMap {...props} />;
}

function GoogleDonationsMap({
  donations = [],
  center = DEFAULT_MAP_CENTER,
  zoom = 12,
  height = 'h-96',
  selectedId = null,
  onSelect = null,
  userLocation = null,
  radiusKm = null,
}) {
  const { isLoaded, loadError } = useJsApiLoader(LOADER_OPTIONS);
  const [activeId, setActiveId] = useState(selectedId);

  const points = withCoordinates(donations);
  const highlighted = points.find((donation) => donation.id === (activeId ?? selectedId)) || null;

  const handleMarkerClick = useCallback((donation) => {
    setActiveId(donation.id);
    if (typeof onSelect === 'function') onSelect(donation.id);
  }, [onSelect]);

  const hasUser = userLocation && Number.isFinite(Number(userLocation.latitude));

  // Centre on the first result when the parent did not supply a centre.
  const mapCenter = hasUser
    ? { lat: Number(userLocation.latitude), lng: Number(userLocation.longitude) }
    : points.length
      ? { lat: Number(points[0].pickup.latitude), lng: Number(points[0].pickup.longitude) }
      : center;

  if (loadError) {
    return (
      <MapFallback
        height={height}
        title="Could not load Google Maps"
        message="Check that the API key is valid. The list view below still lists every donation."
      />
    );
  }

  return (
    <div className={`${height} w-full overflow-hidden rounded-xl border border-slate-200`}>
      {isLoaded ? (
        <GoogleMap
          mapContainerStyle={CONTAINER_STYLE}
          center={mapCenter}
          zoom={zoom}
          options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: true }}
        >
          {hasUser && (
            <>
              <MarkerF
                position={{ lat: Number(userLocation.latitude), lng: Number(userLocation.longitude) }}
                title="Your location"
                icon={{
                  path: 0, // google.maps.SymbolPath.CIRCLE
                  scale: 7,
                  fillColor: '#2563eb',
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight: 2,
                }}
              />
              {radiusKm ? (
                <Circle
                  center={{ lat: Number(userLocation.latitude), lng: Number(userLocation.longitude) }}
                  radius={Number(radiusKm) * 1000}
                  options={{ strokeColor: '#2563eb', strokeOpacity: 0.5, fillColor: '#3b82f6', fillOpacity: 0.08 }}
                />
              ) : null}
            </>
          )}

          {points.map((donation) => (
            <MarkerF
              key={donation.id}
              position={{ lat: Number(donation.pickup.latitude), lng: Number(donation.pickup.longitude) }}
              title={donation.title}
              onClick={() => handleMarkerClick(donation)}
            />
          ))}

          {highlighted && (
            <InfoWindowF
              position={{
                lat: Number(highlighted.pickup.latitude),
                lng: Number(highlighted.pickup.longitude),
              }}
              onCloseClick={() => setActiveId(null)}
            >
              <div className="max-w-[15rem] space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-sm">{highlighted.title}</strong>
                  <StatusBadge status={highlighted.status} />
                </div>
                <p className="text-xs text-slate-600">
                  {formatQuantity(highlighted.quantity)} · {formatRelativeExpiry(highlighted.bestBefore)}
                </p>
                <p className="text-xs text-slate-600">📍 {highlighted.pickup.city}</p>
              </div>
            </InfoWindowF>
          )}
        </GoogleMap>
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading map…</div>
      )}
    </div>
  );
}

export default DonationsMap;
