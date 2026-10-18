/**
 * Pagination - page controls for all list endpoints.
 */
import Button from './Button';

export function Pagination({ pagination, onPageChange, disabled = false }) {
  if (!pagination || pagination.totalPages <= 1) return null;

  const { page, totalPages, total, limit } = pagination;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  // Compact page window (max 5 buttons).
  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  const end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);

  const pages = [];
  for (let index = start; index <= end; index += 1) pages.push(index);

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 pt-4" aria-label="Pagination">
      <p className="text-sm text-slate-500">
        Showing <span className="font-semibold text-slate-700">{from}</span>–
        <span className="font-semibold text-slate-700">{to}</span> of{' '}
        <span className="font-semibold text-slate-700">{total}</span>
      </p>

      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="secondary"
          disabled={disabled || !pagination.hasPrev}
          onClick={() => onPageChange(page - 1)}
        >
          Prev
        </Button>

        {pages.map((number) => (
          <button
            key={number}
            type="button"
            onClick={() => onPageChange(number)}
            disabled={disabled}
            aria-current={number === page ? 'page' : undefined}
            className={`h-8 w-8 rounded-lg text-sm font-semibold transition-colors ${
              number === page
                ? 'bg-brand-600 text-white'
                : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            {number}
          </button>
        ))}

        <Button
          size="sm"
          variant="secondary"
          disabled={disabled || !pagination.hasNext}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}

export default Pagination;
