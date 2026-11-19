import React from 'react';
import { Award } from 'lucide-react';

interface FeaturedEventCardProps {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  participants: number;
  status?: 'upcoming' | 'active' | 'past';
  onDetailsClick?: () => void;
}

const FeaturedEventCard: React.FC<FeaturedEventCardProps> = ({
  id: _id,
  title,
  description,
  date,
  location,
  participants,
  status = 'upcoming',
  onDetailsClick,
}) => {
  const statusColors = {
    upcoming: 'bg-blue-500',
    active: 'bg-green-500',
    past: 'bg-gray-500',
  };

  const statusText = {
    upcoming: 'UPCOMING',
    active: 'ACTIVE',
    past: 'PAST',
  };

  return (
    <div className="bg-black/30 rounded-xl p-3">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="text-white font-semibold">{title}</h4>
          <p className="text-gray-400 text-sm">{description}</p>
        </div>
        <Award className="w-5 h-5 text-yellow-400" />
      </div>
      <div className="mt-2 text-sm text-gray-300">
        <p>{date}</p>
        <p>{location}</p>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-gray-500">{participants}+ trucks participating</span>
        <button
          className="text-[#ea2a2a] text-sm font-medium hover:underline"
          onClick={onDetailsClick}
        >
          Details
        </button>
      </div>
      <div className="mt-2 flex justify-end">
        <span
          className={`${statusColors[status]} text-white text-xs font-bold px-2 py-1 rounded-full`}
        >
          {statusText[status]}
        </span>
      </div>
    </div>
  );
};

export default FeaturedEventCard;
