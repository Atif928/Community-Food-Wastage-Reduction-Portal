/**
 * EmptyState / ErrorState / Card / StatCard - presentational building blocks.
 */
import Button from './Button';

export function EmptyState({ title, message, icon = '🍽️', action = null }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center">
      <span className="text-4xl" aria-hidden="true">{icon}</span>
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      {message && <p className="max-w-md text-sm text-slate-500">{message}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center">
      <span className="text-3xl" aria-hidden="true">⚠️</span>
      <h3 className="text-base font-semibold text-red-800">{title}</h3>
      {message && <p className="max-w-md text-sm text-red-700">{message}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button>
      )}
    </div>
  );
}

export function Card({ title, subtitle, action, children, className = '', bodyClassName = 'card-body' }) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            {title && <h2 className="text-base font-semibold text-slate-900">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint, icon = null, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
    slate: 'bg-slate-100 text-slate-700',
  };

  return (
    <div className="card card-body flex items-center gap-4">
      {icon && (
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${tones[tone] || tones.brand}`}>
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="truncate text-2xl font-bold text-slate-900">{value}</p>
        {hint && <p className="truncate text-xs text-slate-500">{hint}</p>}
      </div>
    </div>
  );
}

export default Card;
