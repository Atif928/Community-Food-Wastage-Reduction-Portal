/**
 * StatusTimeline - the donation audit trail.
 *
 * Renders `statusHistory` from the API as a vertical timeline so donors,
 * recipients and admins can see exactly how a listing progressed
 * (Created -> Claimed -> Delivered / Cancelled).
 */
import StatusBadge from '../common/StatusBadge';
import { formatDateTime, orgTypeLabel } from '../../utils/formatters';

const STATUS_ICONS = {
  AVAILABLE: '🟢',
  CLAIMED: '🙋',
  DELIVERED: '✅',
  CANCELLED: '⚪',
};

export function StatusTimeline({ history = [], emptyLabel = 'No activity recorded yet.' }) {
  if (!history.length) {
    return <p className="text-sm text-slate-500">{emptyLabel}</p>;
  }

  return (
    <ol className="relative space-y-4 border-l border-slate-200 pl-6">
      {history.map((entry) => (
        <li key={entry.id} className="relative">
          <span
            aria-hidden="true"
            className="absolute -left-[1.9rem] flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs ring-1 ring-slate-200"
          >
            {STATUS_ICONS[entry.status] || '•'}
          </span>

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={entry.status} />
            <time className="text-xs text-slate-500" dateTime={entry.changedAt}>
              {formatDateTime(entry.changedAt)}
            </time>
          </div>

          {entry.note && <p className="mt-1 text-sm text-slate-700">{entry.note}</p>}

          {entry.changedBy?.name && (
            <p className="mt-0.5 text-xs text-slate-500">
              by {entry.changedBy.name}
              {entry.changedBy.role ? ` · ${orgTypeLabel(entry.changedBy.role)}` : ''}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}

export default StatusTimeline;
