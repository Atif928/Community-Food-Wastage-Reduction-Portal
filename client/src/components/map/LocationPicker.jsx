/**
 * LocationPicker - choose a pickup point on a Google Map.
 *
 * Behaviour
 *   * click the map or drag the pin to set the coordinates
 *   * "Use my current location" fills them from the browser
 *   * without an API key it falls back to manual latitude/longitude inputs so
 *     a donor can always finish posting food
 *
 * Value shape: { latitude: number, longitude: number } | null
 */
import { useCallback } from 'react';
import { GoogleMap, MarkerF, useJsApiLoader } from '@react-google-maps/api';
import { DEFAULT_MAP_CENTER, GOOGLE_MAPS_API_KEY } from '../../utils/constants';
import { useGeolocation } from '../../hooks/useGeolocation';
import { Input } from '../common/Input';
import Button from '../common/Button';
import MapFallback from './MapFallback';

const LOADER_OPTIONS = { id: 'food-portal-map', googleMapsApiKey: GOOGLE_MAPS_API_KEY };
const CONTAINER_STYLE = { width: '100%', height: '100%' };

export function LocationPicker({ value, onChange, height = 'h-72' }) {
  const { request, isLoading } = useGeolocation();

  const handleUseMyLocation = async () => {
    try {
      const coords = await request();
      onChange({ latitude: coords.latitude, longitude: coords.longitude });
    } catch {
      /* the hook exposes the reason through the filter banners elsewhere */
    }
  };

  if (!GOOGLE_MAPS_API_KEY) {
    // No key -> manual coordinate entry keeps the form usable.
    return (
      <MapFallback
        title="Pick your location on the map"
        message="A Google Maps API key is not configured, so enter the pickup coordinates manually."
        height={height}
      >
        <div className="grid w-full max-w-md grid-cols-2 gap-3 text-left">
          <Input
            label="Latitude"
            name="pickupLatitudeManual"
            type="number"
            step="0.000001"
            value={value?.latitude ?? ''}
            onChange={(event) => onChange({ ...(value || {}), latitude: Number(event.target.value) })}
          />
          <Input
            label="Longitude"
            name="pickupLongitudeManual"
            type="number"
            step="0.000001"
            value={value?.longitude ?? ''}
            onChange={(event) => onChange({ ...(value || {}), longitude: Number(event.target.value) })}
          />
        </div>
      </MapFallback>
    );
  }

  return <GoogleLocationPicker
    value={value}
    onChange={onChange}
    height={height}
    onUseMyLocation={handleUseMyLocation}
    locating={isLoading}
  />;
}

/** Inner component so useJsApiLoader is only called when a key exists. */
function GoogleLocationPicker({ value, onChange, height, onUseMyLocation, locating }) {
  const { isLoaded, loadError } = useJsApiLoader(LOADER_OPTIONS);

  const center = value && Number.isFinite(value.latitude)
    ? { lat: value.latitude, lng: value.longitude }
    : DEFAULT_MAP_CENTER;

  const handleClick = useCallback((event) => {
    onChange({ latitude: event.latLng.lat(), longitude: event.latLng.lng() });
  }, [onChange]);

  const handleDragEnd = useCallback((event) => {
    onChange({ latitude: event.latLng.lat(), longitude: event.latLng.lng() });
  }, [onChange]);

  if (loadError) {
    return (
      <MapFallback
        title="Could not load Google Maps"
        message="Check that the API key is valid and the Maps JavaScript API is enabled. Enter the coordinates manually meanwhile."
        height={height}
      />
    );
  }

  return (
    <div className="space-y-2">
      <div className={`${height} w-full overflow-hidden rounded-xl border border-slate-200`}>
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={CONTAINER_STYLE}
            center={center}
            zoom={value ? 15 : 12}
            onClick={handleClick}
            options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
          >
            {value && Number.isFinite(value.latitude) && (
              <MarkerF position={{ lat: value.latitude, lng: value.longitude }} draggable onDragEnd={handleDragEnd} />
            )}
          </GoogleMap>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading map…</div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          {value && Number.isFinite(value.latitude)
            ? `Selected: ${Number(value.latitude).toFixed(5)}, ${Number(value.longitude).toFixed(5)}`
            : 'Click the map to drop the pickup pin.'}
        </p>
        <Button type="button" variant="secondary" size="sm" loading={locating} onClick={onUseMyLocation}>
          Use my current location
        </Button>
      </div>
    </div>
  );
}

export default LocationPicker;
