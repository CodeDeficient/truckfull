'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CommonPageHead from '@/components/ui/organisms/CommonPageHead';

// Define the shared props for the base display component
interface BaseDisplayProps<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  retry: () => Promise<void>;
  isAuthenticated: boolean;
  authLoading: boolean;
  onBack?: () => void;
  onDiscoverTrucks?: () => void;
  showHeader?: boolean;
  className?: string;
  title: string;
  emptyMessage: string;
  emptyIcon: React.ReactNode;
  authRequiredMessage: string;
  authRequiredIcon: React.ReactNode;
  onAuthRequiredClick?: () => void;
  renderItemContent: () => React.ReactNode;
  contentClassName?: string;
}

export const BaseDisplay = <T,>({
  data,
  loading,
  error,
  retry,
  isAuthenticated,
  authLoading,
  onBack,
  onDiscoverTrucks,
  showHeader = true,
  className = '',
  contentClassName = '',
  title,
  emptyMessage,
  emptyIcon,
  authRequiredMessage,
  authRequiredIcon,
  onAuthRequiredClick,
  renderItemContent,
}: BaseDisplayProps<T>) => {
  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <>
        {showHeader && <CommonPageHead title={title} />}
        <div className="flex items-center justify-center h-screen bg-[#181111]">
          <div className="text-white">Checking authentication...</div>
        </div>
      </>
    );
  }

  // Show authentication required for unauthenticated users
  if (!isAuthenticated) {
    return (
      <div
        className={`relative flex size-full min-h-screen flex-col bg-[#181111] dark group/design-root overflow-x-hidden ${className}`}
      >
        {showHeader && <CommonPageHead title={title} />}
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            {authRequiredIcon}
            <h3 className="text-white text-xl font-bold mb-2">Sign In Required</h3>
            <p className="text-gray-400 mb-6">{authRequiredMessage}</p>
            <Button
              className="bg-[#ea2a2a] hover:bg-[#ea2a2a]/90 text-white px-6 py-3 rounded-full font-medium"
              onClick={() => {
                if (onAuthRequiredClick) {
                  onAuthRequiredClick();
                } else {
                  globalThis.location.href = '/@mobile?showAuth=true';
                }
              }}
            >
              Sign In to View {title}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Render content based on state

  const renderContent = (): React.ReactNode => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ea2a2a] mb-4"></div>
          <p className="text-white">Loading your {title.toLowerCase()}...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-red-500 text-lg mb-4">Error: {error}</div>
          <Button
            onClick={() => {
              void retry();
            }}
            className="bg-[#ea2a2a] hover:bg-[#ea2a2a]/90 text-white px-6 py-3 rounded-full"
          >
            Retry
          </Button>
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          {emptyIcon}
          <h3 className="text-white text-xl font-bold mb-2">No {title} Yet</h3>
          <p className="text-gray-400 mb-6">{emptyMessage}</p>
          <Button
            className="bg-[#ea2a2a] hover:bg-[#ea2a2a]/90 text-white px-6 py-3 rounded-full font-medium flex items-center gap-2"
            onClick={() => {
              if (onDiscoverTrucks) {
                onDiscoverTrucks();
              } else {
                globalThis.location.href = '/@mobile';
              }
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-plus w-4 h-4"
            >
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
            Discover Food Trucks
          </Button>
        </div>
      );
    }

    return renderItemContent();
  };

  return (
    <div
      className={`relative flex size-full min-h-screen flex-col bg-[#181111] dark group/design-root overflow-x-hidden ${className}`}
    >
      {showHeader && <CommonPageHead title={title} />}

      <div className="flex-grow overflow-y-auto">
        {showHeader && (
          <header className="sticky top-0 z-10 bg-black/50 backdrop-blur-lg border-b border-white/10">
            <div className="flex items-center justify-between px-4 py-3">
              <Button
                variant="ghost"
                size="mobile-icon"
                onClick={onBack}
                className="text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <h2 className="text-white text-xl font-bold leading-tight tracking-[-0.015em]">
                {(() => {
                  switch (title) {
                    case 'Favorites': {
                      return 'My Favorites';
                    }
                    case 'Orders': {
                      return 'Order History';
                    }
                    default: {
                      return title;
                    }
                  }
                })()}
              </h2>
              <div className="w-10" /> {/* Spacer for centering */}
            </div>
          </header>
        )}

        <main className={`p-4 pb-20 ${contentClassName}`}>{renderContent()}</main>
      </div>
    </div>
  );
};
