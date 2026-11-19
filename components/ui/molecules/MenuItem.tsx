import React from 'react';
import Image from 'next/image';

interface MenuItemProps {
  readonly altText: string;
  readonly category: string;
  readonly imageSrc: string;
  readonly isSoldOut: boolean;
  readonly name: string;
  readonly onToggle: () => void;
}

export default function MenuItem({
  altText,
  category,
  imageSrc,
  isSoldOut,
  name,
  onToggle,
}: Readonly<MenuItemProps>) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-800">
      <div className="relative">
        <Image
          src={imageSrc}
          alt={altText}
          width={64}
          height={64}
          className="w-16 h-16 rounded-lg object-cover"
        />
        {isSoldOut && (
          <div className="absolute inset-0 bg-black bg-opacity-70 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">SOLD OUT</span>
          </div>
        )}
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-white">{name}</h3>
        <p className="text-sm text-gray-400">{category}</p>
      </div>
      <button
        onClick={onToggle}
        className={`w-10 h-10 rounded-full flex items-center justify-center ${
          isSoldOut ? 'bg-gray-600' : 'bg-red-600 hover:bg-red-700'
        }`}
      >
        <span className="material-symbols-outlined text-white text-xl">
          {isSoldOut ? 'remove' : 'edit'}
        </span>
      </button>
    </div>
  );
}
