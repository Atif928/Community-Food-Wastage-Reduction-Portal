/**
 * ReviewList - the list of ratings a donor has received.
 *
 * Tolerates both shapes returned by the API:
 *   * feedbackView  -> { donationTitle, rating, comment, createdAt, recipient: { name, orgType } }
 *   * donor profile -> { donationTitle, rating, comment, createdAt, recipientName, recipientOrgType }
 */
import StarRating from '../common/StarRating';
import { EmptyState } from '../common/States';
import { formatDate, orgTypeLabel } from '../../utils/formatters';

export function ReviewList({ reviews = [], emptyLabel = 'No reviews yet.' }) {
  if (!reviews.length) {
    return <EmptyState icon="⭐" title={emptyLabel} message="Ratings appear here after recipients confirm a pickup." />;
  }

  return (
    <ul className="divide-y divide-slate-100">
      {reviews.map((review) => {
        const name = review.recipientName || review.recipient?.name || 'A recipient';
        const orgType = review.recipientOrgType || review.recipient?.orgType;
        return (
          <li key={review.id} className="py-4 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <StarRating value={review.rating} size="sm" />
                <span className="text-sm font-semibold text-slate-800">{name}</span>
                {orgType && <span className="text-xs text-slate-500">· {orgTypeLabel(orgType)}</span>}
              </div>
              <time className="text-xs text-slate-400">{formatDate(review.createdAt)}</time>
            </div>

            {review.donationTitle && (
              <p className="mt-1 text-xs font-medium text-brand-700">{review.donationTitle}</p>
            )}
            {review.comment && <p className="mt-1 text-sm text-slate-600">{review.comment}</p>}
          </li>
        );
      })}
    </ul>
  );
}

export default ReviewList;
