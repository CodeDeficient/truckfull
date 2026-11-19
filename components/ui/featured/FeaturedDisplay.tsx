import React from 'react';
import CommonPageHead from '@/components/ui/organisms/CommonPageHead';
import { useFeaturedContent } from '@/hooks/useFeaturedContent';
import { LoadingContent, ErrorContent, FeaturedContentSections } from './FeaturedDisplayComponents';

interface FeaturedDisplayProps {
  onTruckClick?: (id: string) => void;
  onOfferRedeem?: (id: string) => void;
  onEventDetails?: (id: string) => void;
  showHeader?: boolean;
  className?: string;
  contentClassName?: string;
}

export const FeaturedDisplay: React.FC<FeaturedDisplayProps> = ({
  onTruckClick,
  onOfferRedeem,
  onEventDetails,
  showHeader = true,
  className = '',
  contentClassName = '',
}) => {
  const { featuredContent, isLoading, error } = useFeaturedContent();

  if (isLoading) {
    return (
      <>
        {showHeader && <CommonPageHead title="Featured" />}
        <LoadingContent />
      </>
    );
  }

  if (error || !featuredContent) {
    return (
      <>
        {showHeader && <CommonPageHead title="Featured" />}
        <ErrorContent error={error} />
      </>
    );
  }

  return (
    <div
      className={`relative flex size-full min-h-screen flex-col bg-[#181111] dark group/design-root overflow-x-hidden ${className}`}
    >
      {showHeader && <CommonPageHead title="Featured" />}

      <div className={`flex-grow overflow-y-auto ${contentClassName}`}>
        {/* Header removed as per user request */}

        <FeaturedContentSections
          featuredContent={featuredContent}
          onTruckClick={onTruckClick}
          onOfferRedeem={onOfferRedeem}
          onEventDetails={onEventDetails}
        />
      </div>
    </div>
  );
};
