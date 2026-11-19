import { Star } from 'lucide-react';
import React from 'react';

interface StarRatingProps {
  readonly rating: number;
  readonly size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-6',
};

export default function StarRating({ rating, size = 'md' }: StarRatingProps) {
  const roundedRating = Math.round(rating);
  const stars = Array.from({ length: 5 }).map((_, i) => i + 1);

  return (
    <div className="flex">
      {stars.map((star) => (
        <Star
          key={star}
          className={`${sizeClasses[size]} ${
            star <= roundedRating ? 'text-yellow-400 fill-current' : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );
}
