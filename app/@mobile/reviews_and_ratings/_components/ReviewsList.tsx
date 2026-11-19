import React from 'react';
import { Card } from '@/components/ui/card';

const reviews = [
  {
    id: 1,
    name: 'Alex Johnson',
    rating: 5,
    date: '2023-06-15',
    comment: 'The tacos were absolutely amazing! Fresh ingredients and great flavor.',
    foodTruck: 'Taco Loco',
  },
  {
    id: 2,
    name: 'Sarah Williams',
    rating: 4,
    date: '2023-06-10',
    comment: 'Really good burgers, but the wait time was a bit long.',
    foodTruck: 'Burger Barn',
  },
  {
    id: 3,
    name: 'Mike Chen',
    rating: 5,
    date: '2023-06-05',
    comment: "Best pizza I've had in months. The crust was perfect!",
    foodTruck: 'Pizza Palace',
  },
  {
    id: 4,
    name: 'Emma Davis',
    rating: 4,
    date: '2023-05-28',
    comment: 'Great falafel and friendly service. Will definitely come back.',
    foodTruck: 'Mediterranean Delights',
  },
  {
    id: 5,
    name: 'James Wilson',
    rating: 5,
    date: '2023-05-20',
    comment: 'The ramen was incredible. Authentic taste and generous portions.',
    foodTruck: 'Tokyo Ramen',
  },
];

const renderStars = (rating: number) => {
  return (
    <div className="flex">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`material-symbols-outlined text-lg ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}
        >
          star
        </span>
      ))}
    </div>
  );
};

export default function ReviewsList() {
  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <Card key={review.id} className="p-4 bg-white/5 backdrop-blur-sm">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-white">{review.name}</h3>
              <p className="text-sm text-white/60">{review.foodTruck}</p>
            </div>
            <span className="text-sm text-white/60">{review.date}</span>
          </div>
          <div className="mt-2">{renderStars(review.rating)}</div>
          <p className="mt-2 text-white/80">{review.comment}</p>
        </Card>
      ))}
    </div>
  );
}
