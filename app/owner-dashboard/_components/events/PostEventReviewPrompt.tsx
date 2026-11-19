'use client';

/**
 * Post-Event Review Prompt Component
 * WBS: 6.2.7
 *
 * Prompts truck owners to rate organizers after events conclude.
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Loader2, CheckCircle, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PendingReview {
  event_id: string;
  event_name: string;
  organizer_id: string;
  organizer_name: string;
  event_end_date: string;
}

interface PostEventReviewPromptProps {
  pendingReviews: PendingReview[];
  onReviewSubmitted: (eventId: string) => void;
  onDismiss?: (eventId: string) => void;
}

export function PostEventReviewPrompt({
  pendingReviews,
  onReviewSubmitted,
  onDismiss,
}: PostEventReviewPromptProps) {
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (review: PendingReview) => {
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch('/api/organizer-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizer_id: review.organizer_id,
          event_id: review.event_id,
          rating,
          comment: comment || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit review');
      }

      setSubmitted(true);
      setTimeout(() => {
        onReviewSubmitted(review.event_id);
        setActiveReviewId(null);
        setRating(0);
        setComment('');
        setSubmitted(false);
      }, 1500);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (pendingReviews.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {pendingReviews.map((review) => (
        <Card key={review.event_id} className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">Rate Your Experience</CardTitle>
                <CardDescription>
                  How was <strong>{review.organizer_name}</strong> at {review.event_name}?
                </CardDescription>
              </div>
              {onDismiss && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => onDismiss(review.event_id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {activeReviewId === review.event_id ? (
              <div className="space-y-4">
                {/* Star Rating */}
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className="p-1 transition-transform hover:scale-110"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= (hoverRating || rating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-muted-foreground">
                    {rating > 0 && ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][rating]}
                  </span>
                </div>

                {/* Comment */}
                <Textarea
                  placeholder="Share your experience (optional)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                />

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {submitted ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span>Review submitted! Thank you.</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleSubmit(review)}
                      disabled={submitting || rating === 0}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        'Submit Review'
                      )}
                    </Button>
                    <Button variant="ghost" onClick={() => setActiveReviewId(null)}>
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setActiveReviewId(review.event_id)}
                className="w-full"
              >
                <Star className="w-4 h-4 mr-2" />
                Leave a Review
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
