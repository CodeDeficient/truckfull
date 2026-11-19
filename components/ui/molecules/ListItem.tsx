import React from 'react';
import Image from 'next/image';

interface ListItemProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly image?: string;
  readonly imageAlt?: string;
  readonly imageClassName?: string;
  readonly rightContent?: React.ReactNode;
}

export default function ListItem({
  title,
  subtitle,
  image,
  imageAlt,
  imageClassName = 'w-12 h-12',
  rightContent,
}: ListItemProps) {
  return (
    <div className="flex items-center space-x-4 p-4">
      {image && (
        <Image
          src={image}
          alt={imageAlt ?? title}
          width={48}
          height={48}
          className={`${imageClassName} rounded-lg object-cover`}
        />
      )}
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        {subtitle && <p className="text-gray-600 dark:text-gray-300 text-sm">{subtitle}</p>}
      </div>
      {rightContent && <div className="flex-shrink-0">{rightContent}</div>}
    </div>
  );
}
