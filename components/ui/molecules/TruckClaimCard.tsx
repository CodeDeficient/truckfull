import React from 'react';
import Image, { StaticImageData } from 'next/image';

interface TruckClaimCardProps {
  readonly truckName?: string; // Made optional to support name-only usage
  readonly name?: string; // Added for compatibility - same as truckName
  readonly truckImage?: string | StaticImageData;
  readonly imageSrc?: string | StaticImageData; // Added to support imageSrc property
  readonly description?: string;
  readonly address?: string; // Added to support this property
  readonly onClaim?: () => void;
}

export default function TruckClaimCard({
  truckName,
  name,
  truckImage,
  imageSrc,
  description,
  onClaim,
}: TruckClaimCardProps) {
  // Use the name property if provided, otherwise use truckName for backward compatibility, with fallback
  const displayName = name ?? truckName ?? 'Unknown Truck';

  // Only render Image if we have a valid source
  const imageToRender = truckImage ?? imageSrc;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <div className="flex items-center space-x-4">
        {imageToRender && (
          <div className="w-16 h-16">
            <Image
              src={imageToRender}
              alt={displayName}
              width={64}
              height={64}
              className="rounded-lg object-cover w-full h-full"
            />
          </div>
        )}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{displayName}</h3>
          {description && <p className="text-gray-600 dark:text-gray-300 text-sm">{description}</p>}
        </div>
        <button
          onClick={onClaim}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          Claim
        </button>
      </div>
    </div>
  );
}
