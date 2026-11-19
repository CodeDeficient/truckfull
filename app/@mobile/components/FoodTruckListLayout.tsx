import React, { memo } from 'react';
import { Button } from '@/components/ui/button';

interface FoodTruckListLayoutProps {
  readonly children: React.ReactNode;
  readonly loading: boolean;
  readonly error: string | null;
  readonly onRetry?: () => void;
  readonly loadingMessage?: string;
  readonly className?: string;
}

export const FoodTruckListLayout: React.FC<FoodTruckListLayoutProps> = ({
  children,
  loading,
  error,
  onRetry,
  loadingMessage = 'Loading food trucks...',
  className = '',
}) => {
  // Memoized loading state component
  if (loading) {
    return (
      <div
        className={`relative flex size-full min-h-screen flex-col bg-black dark justify-between group/design-root overflow-hidden ${className}`}
       
        aria-label="Loading food trucks"
        role="status"
      >
        <div className="flex-grow flex items-center justify-center">
          <div className="text-white text-lg" aria-live="polite">
            {loadingMessage}
          </div>
        </div>
      </div>
    );
  }

  // Memoized error state component
  if (error != null && error !== '') {
    return (
      <div
        className={`relative flex size-full min-h-screen flex-col bg-black dark justify-between group/design-root overflow-hidden ${className}`}
       
        role="alert"
      >
        <div className="flex-grow flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="text-red-500 text-lg mb-4" aria-live="polite">
              Error: {error}
            </div>
            {onRetry && (
              <Button
                onClick={onRetry}
                size="mobile"
                className="bg-[var(--primary-color)] text-white hover:bg-[var(--primary-color)]/90"
                aria-label="Retry loading food trucks"
              >
                Retry
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Memoized success state component
  return (
    <div
      className={`relative flex size-full h-full flex-col bg-black dark justify-start group/design-root overflow-hidden ${className}`}
     
      aria-label="Food truck list"
    >
      {children}
    </div>
  );
};

export default memo(FoodTruckListLayout);
