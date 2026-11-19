import type { TruckRating } from '@/lib/types';

/**
 * Displays truck ratings and calculates average score.
 * @example
 * renderRatings({ ratings: [{ id: 1, title: 'Service', score: 4.5 }, { id: 2, title: 'Quality', score: 4.0 }] })
 * <div>A rendered ratings breakdown</div>
 * @param {{ ratings: Array<{ id: number, title: string, score: number }> }} ratings - An array of truck ratings, each containing an id, a title, and a score.
 * @returns {JSX.Element} A JSX element displaying the list of ratings with an average score.
 * @description
 *   - Returns a message that no ratings are available if the input array is empty or undefined.
 *   - Calculates the average rating score using all ratings in the array.
 *   - Renders individual ratings dynamically within the returned JSX.
 */
const RatingsBreakdownSection = ({ ratings }: { ratings?: TruckRating[] }) => {
  if (!Array.isArray(ratings) || ratings.length === 0) return <p>No ratings yet</p>;

  const avgScore = ratings.reduce((total, r) => total + (r.rating ?? 0), 0) / ratings.length;

  return (
    <div className="rating-container">
      <h3>Ratings Breakdown</h3>
      <div className="average-rating">Average: {avgScore.toFixed(1)}</div>
      {ratings.map((r) => (
        <div key={r.id} className="individual-rating">
          <p>
            Rating: {r.rating}
            {typeof r.review === 'string' && r.review.length > 0 ? ` — ${r.review}` : ''}
          </p>
        </div>
      ))}
    </div>
  );
};

export default RatingsBreakdownSection;
