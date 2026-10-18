/**
 * RatingForm - the reusable "rate this donation" form.
 *
 * Used by the recipient FeedbackForm page and the ClaimDetail quick action.
 * Stateless w.r.t. submission: the parent owns the async call and passes
 * `onSubmit({ rating, comment })`.
 */
import { useState } from 'react';
import StarRating from '../common/StarRating';
import Button from '../common/Button';
import { Textarea } from '../common/Input';
import { validateFeedback, isValid } from '../../utils/validators';

const RATING_HINTS = {
  1: 'Poor - food was not usable',
  2: 'Below expectations',
  3: 'Okay',
  4: 'Good quality',
  5: 'Excellent - fresh and well packed',
};

export function RatingForm({ onSubmit, submitting = false, initialRating = 0, initialComment = '' }) {
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);
  const [errors, setErrors] = useState({});

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validateFeedback({ rating, comment });
    setErrors(nextErrors);
    if (!isValid(nextErrors)) return;
    onSubmit?.({ rating, comment: comment.trim() || undefined });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <span className="label">Your rating</span>
        <StarRating
          value={rating}
          onChange={(value) => { setRating(value); setErrors((prev) => ({ ...prev, rating: undefined })); }}
          size="lg"
          showValue
        />
        {rating > 0 && <p className="mt-1 text-xs text-slate-500">{RATING_HINTS[rating]}</p>}
        {errors.rating && <p className="error-text">{errors.rating}</p>}
      </div>

      <Textarea
        label="Comment (optional)"
        name="comment"
        rows={4}
        maxLength={1000}
        placeholder="Was the food fresh? Was the pickup smooth? Your feedback helps donors improve."
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        error={errors.comment}
        help={`${comment.length}/1000 characters`}
      />

      <div className="flex justify-end">
        <Button type="submit" loading={submitting} disabled={submitting || rating === 0}>
          Submit rating
        </Button>
      </div>
    </form>
  );
}

export default RatingForm;
