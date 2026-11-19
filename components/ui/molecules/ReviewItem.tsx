import React from 'react';
import { Card } from '@/components/ui/card';

interface ReviewItemProps {
  readonly name: string;
  readonly rating: number;
  readonly date: string;
  readonly comment?: string; // Made optional to support cases where only review is provided
  readonly review?: string; // Added to support this property (maps to comment)
  readonly likes?: number; // Added to support this property
  readonly dislikes?: number; // Added to support this property
  readonly avatarUrl?: string; // Added to support this property
  readonly foodTruck?: string;
}

export default function ReviewItem({
  name,
  rating,
  date,
  comment,
  review,
  foodTruck,
}: Readonly<ReviewItemProps>) {
  // Use review if provided, otherwise fallback to comment for backward compatibility
  const reviewText = review ?? comment;

  return (
    <Card className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{name}</h3>
          {foodTruck && <p className="text-sm text-gray-500 dark:text-gray-400">{foodTruck}</p>}
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">{date}</span>
      </div>

      <div className="flex my-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <svg
            key={index}
            className={`w-5 h-5 ${index < rating ? 'text-yellow-400' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>

      {reviewText && <p className="text-gray-700 dark:text-gray-300">{reviewText}</p>}
    </Card>
  );
}
