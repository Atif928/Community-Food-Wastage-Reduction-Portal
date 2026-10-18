/**
 * RatingSummary - average score, star display and the 5..1 star distribution.
 *
 * `distribution` is keyed by star value: { 5: n, 4: n, ... } exactly as the
 * API returns it.
 */
import StarRating from '../common/StarRating';
import { formatNumber } from '../../utils/formatters';

export function RatingSummary({ average = null, count = 0, distribution = {}, className = '' }) {
  const total = Object.values(distribution || {}).reduce((sum, value) => sum + Number(value || 0), 0);

  return (
    <div className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8 ${className}`}>
      <div className="text-center sm:w-40 sm:shrink-0">
        <p className="text-4xl font-bold text-slate-900">
          {average ? Number(average).toFixed(1) : '—'}
        </p>
        <StarRating value={average || 0} size="md" className="mt-1 justify-center" />
        <p className="mt-1 text-xs text-slate-500">
          {formatNumber(count)} {count === 1 ? 'rating' : 'ratings'}
        </p>
      </div>

      <div className="flex-1 space-y-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const value = Number(distribution?.[star] || 0);
          const percent = total ? Math.round((value / total) * 100) : 0;
          return (
            <div key={star} className="flex items-center gap-3 text-xs">
              <span className="w-10 shrink-0 text-slate-500">{star} star</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-amber-400" style={{ width: `${percent}%` }} />
              </div>
              <span className="w-8 shrink-0 text-right font-semibold text-slate-600">{value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RatingSummary;
