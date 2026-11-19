import React from 'react';

/**
 * Mobile-optimized loading spinner component
 * Designed for mobile-first responsive design with touch-friendly sizing
 */
export const MobileLoadingSpinner: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}> = ({ size = 'md', message = 'Loading...', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div
        className={`${sizeClasses[size]} border-2 border-white/20 border-t-[var(--primary-color)] rounded-full animate-spin`}
        aria-hidden="true"
      />
      {message && <p className="text-white text-sm font-medium animate-pulse">{message}</p>}
    </div>
  );
};

/**
 * Full-screen mobile loading component
 * Used for page-level loading states in mobile routes
 */
export const MobilePageLoader: React.FC<{
  message?: string;
}> = ({ message = 'Loading...' }) => {
  return (
    <div className="relative flex size-full min-h-screen flex-col bg-black dark justify-between group/design-root overflow-x-hidden">
      <div className="flex-grow flex items-center justify-center">
        <MobileLoadingSpinner size="lg" message={message} />
      </div>
    </div>
  );
};
