'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface MobilePageHeaderProps {
  readonly title: string;
  readonly onBack: () => void;
  readonly rightElement?: React.ReactNode;
}

const MobilePageHeader: React.FC<MobilePageHeaderProps> = ({
  title,
  onBack,
  rightElement = <div className="w-16" />, // Spacer for centering when no right element is provided
}) => {
  return (
    <div className="flex items-center justify-between p-4 border-b border-white/10">
      <Button
        variant="ghost"
        size="mobile-icon"
        onClick={onBack}
        className="text-white hover:bg-white/10"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>
      <h1 className="text-xl font-bold text-white">{title}</h1>
      {rightElement}
    </div>
  );
};

export default MobilePageHeader;
