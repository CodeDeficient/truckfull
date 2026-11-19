import React from 'react';
import Image from 'next/image';

interface EventCardProps {
  readonly title: string;
  readonly image: string;
  readonly location: string;
  readonly estimatedProfit: string;
}

export default function EventCard({ title, image, location, estimatedProfit }: EventCardProps) {
  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
      <div className="relative">
        <Image
          src={image}
          alt={title}
          width={400}
          height={200}
          className="w-full h-48 object-cover"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <h3 className="text-white text-lg font-bold">{title}</h3>
          <p className="text-gray-300 text-sm">{location}</p>
        </div>
      </div>
      <div className="p-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Estimated Profit</span>
          <span className="text-white text-lg font-bold">${estimatedProfit}</span>
        </div>
      </div>
    </div>
  );
}
