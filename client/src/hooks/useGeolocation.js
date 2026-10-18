/**
 * useGeolocation - browser geolocation with loading / error states.
 *
 * Used by:
 *   * the recipient "near me" search
 *   * the donor listing form ("use my current location" button)
 *   * the profile page (saving the home coordinates that drive the
 *     nearby-NGO notification fan-out)
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 60000,
};

export function useGeolocation({ auto = false, options = {} } = {}) {
  const [coords, setCoords] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | success | denied | error | unsupported
  const [error, setError] = useState(null);

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const request = useCallback(() => new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      const message = 'Geolocation is not supported by this browser.';
      setStatus('unsupported');
      setError(message);
      reject(new Error(message));
      return;
    }

    setStatus('loading');
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!mountedRef.current) return;
        const next = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setCoords(next);
        setStatus('success');
        resolve(next);
      },
      (geoError) => {
        if (!mountedRef.current) return;
        const message = geoError.code === geoError.PERMISSION_DENIED
          ? 'Location permission denied. Allow it in your browser settings or pick the point on the map.'
          : geoError.code === geoError.TIMEOUT
            ? 'Getting your location took too long. Please try again.'
            : 'We could not determine your location.';

        setStatus(geoError.code === geoError.PERMISSION_DENIED ? 'denied' : 'error');
        setError(message);
        reject(new Error(message));
      },
      { ...DEFAULT_OPTIONS, ...options },
    );
  }), [options]);

  useEffect(() => {
    if (auto) request().catch(() => { /* surfaced through `error` */ });
  }, [auto, request]);

  return {
    coords,
    latitude: coords?.latitude ?? null,
    longitude: coords?.longitude ?? null,
    status,
    error,
    isLoading: status === 'loading',
    request,
  };
}

export default useGeolocation;
