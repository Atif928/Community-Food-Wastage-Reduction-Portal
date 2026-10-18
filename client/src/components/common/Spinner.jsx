/**
 * Spinner - inline loading indicator.
 */
const SIZES = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[3px]',
};

export function Spinner({ size = 'md', className = '' }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-current border-r-transparent ${SIZES[size] || SIZES.md} ${className}`}
    />
  );
}

/** Full-section loading state used while a page fetches its data. */
export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-brand-700">
      <Spinner size="lg" />
      <p className="text-sm font-medium text-slate-500">{label}</p>
    </div>
  );
}

export default Spinner;
