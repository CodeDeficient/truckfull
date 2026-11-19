import React from 'react';

/**
 * Mobile-optimized skeleton loading component
 * Provides shimmer effect for better mobile UX during loading states
 */
export const MobileSkeleton: React.FC<{
  className?: string;
}> = ({ className = '' }) => {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="bg-white/10 rounded-lg h-full w-full"></div>
    </div>
  );
};

/**
 * Mobile card skeleton for truck listings
 */
export const MobileTruckCardSkeleton: React.FC = () => {
  return (
    <div className="truck-card p-4 rounded-2xl flex items-center gap-4">
      <MobileSkeleton className="w-20 h-20 rounded-xl flex-shrink-0" />
      <div className="flex-grow space-y-2">
        <MobileSkeleton className="h-5 w-3/4" />
        <MobileSkeleton className="h-3 w-1/2" />
        <div className="flex items-center gap-2">
          <MobileSkeleton className="w-2 h-2 rounded-full" />
          <MobileSkeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
};

/**
 * Mobile profile skeleton for user profile loading
 */
export const MobileProfileSkeleton: React.FC = () => {
  return (
    <div className="p-4 space-y-6">
      {/* Profile Header Skeleton */}
      <div className="text-center space-y-4">
        <MobileSkeleton className="w-24 h-24 rounded-full mx-auto" />
        <div className="space-y-2">
          <MobileSkeleton className="h-6 w-32 mx-auto" />
          <MobileSkeleton className="h-4 w-48 mx-auto" />
          <MobileSkeleton className="h-3 w-24 mx-auto" />
        </div>
      </div>

      {/* Profile Actions Skeleton */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-4">
            <MobileSkeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Mobile truck details skeleton
 */
export const MobileTruckDetailsSkeleton: React.FC = () => {
  return (
    <div className="p-4 space-y-6">
      {/* Header Skeleton */}
      <MobileSkeleton className="h-8 w-48" />

      {/* Quick Actions Skeleton */}
      <div className="flex gap-3">
        <MobileSkeleton className="h-10 flex-1" />
        <MobileSkeleton className="h-10 w-10" />
      </div>

      {/* Basic Info Skeleton */}
      <div className="space-y-2">
        <MobileSkeleton className="h-6 w-40" />
        <MobileSkeleton className="h-4 w-full" />
        <MobileSkeleton className="h-4 w-3/4" />
      </div>

      {/* Operating Hours & Rating Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <MobileSkeleton className="h-5 w-32 mb-2" />
          <MobileSkeleton className="h-4 w-24" />
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <MobileSkeleton className="h-5 w-20 mb-2" />
          <MobileSkeleton className="h-4 w-16" />
        </div>
      </div>

      {/* Menu Skeleton */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
        <MobileSkeleton className="h-5 w-24 mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <MobileSkeleton className="w-12 h-12 rounded-lg" />
              <div className="flex-grow">
                <MobileSkeleton className="h-4 w-24" />
                <MobileSkeleton className="h-3 w-16 mt-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
