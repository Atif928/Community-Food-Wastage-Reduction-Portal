/**
 * StarRating - read-only display or interactive 1-5 input.
 */
import { useState } from 'react';

export function StarRating({
  value = 0,
  onChange = null,
  size = 'md',
  showValue = false,
  count = null,
  className = '',
}) {
  const [hovered, setHovered] = useState(0);
  const interactive = typeof onChange === 'function';
  const active = hovered || Number(value) || 0;

  const sizes = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-7 w-7' };

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span className="inline-flex" role={interactive ? 'radiogroup' : 'img'} aria-label={`${value || 0} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= Math.round(active);
          return interactive ? (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={star === Number(value)}
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onFocus={() => setHovered(star)}
              onBlur={() => setHovered(0)}
              onClick={() => onChange(star)}
              className="p-0.5 transition-transform hover:scale-110"
            >
              <Star filled={filled} className={sizes[size]} />
            </button>
          ) : (
            <Star key={star} filled={filled} className={sizes[size]} />
          );
        })}
      </span>

      {showValue && (
        <span className="text-sm font-semibold text-slate-700">
          {value ? Number(value).toFixed(1) : '—'}
        </span>
      )}
      {count !== null && count !== undefined && (
        <span className="text-xs text-slate-500">({count})</span>
      )}
    </span>
  );
}

function Star({ filled, className }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`${className} ${filled ? 'text-amber-400' : 'text-slate-300'}`}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 15l-5.2 2.6 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
    </svg>
  );
}

export default StarRating;
