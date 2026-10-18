/**
 * MapFallback - shown whenever the Google Maps API key is missing or the map
 * cannot be rendered. The portal must stay fully usable without a key, so every
 * map surface degrades to this friendly notice (the list view always remains).
 */
export function MapFallback({
  title = 'Map view unavailable',
  message = 'Add VITE_GOOGLE_MAPS_API_KEY to client/.env to enable the interactive map. '
    + 'All locations are still available in the list view.',
  height = 'h-80',
  children = null,
}) {
  return (
    <div
      className={`flex ${height} w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center`}
    >
      <span className="text-4xl" aria-hidden="true">🗺️</span>
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      <p className="max-w-md text-sm text-slate-500">{message}</p>
      {children}
    </div>
  );
}

export default MapFallback;
