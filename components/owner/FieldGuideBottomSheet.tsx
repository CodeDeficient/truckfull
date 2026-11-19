'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export const FIELD_GUIDE_PEEK_HEIGHT_PX = 160;

interface FieldGuideBottomSheetProps {
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}

export function FieldGuideBottomSheet({
  expanded,
  onToggle,
  children,
  className,
}: FieldGuideBottomSheetProps) {
  return (
    <div
      className={cn(
        'absolute bottom-0 left-0 right-0 z-10 bg-background border-t rounded-t-xl shadow-lg transition-[max-height] duration-300 ease-in-out',
        className,
      )}
      style={{
        height: 'auto',
        maxHeight: expanded ? '65vh' : `${FIELD_GUIDE_PEEK_HEIGHT_PX}px`,
      }}
    >
      {/* Drag Handle */}
      <button
        onClick={onToggle}
        className="w-full flex flex-col items-center justify-center py-0.5 cursor-pointer hover:bg-accent/50 transition-colors rounded-t-xl"
        aria-label={expanded ? 'Collapse field guide' : 'Expand field guide'}
      >
        <div className="hidden md:flex flex-col items-center">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground/70" />
          ) : (
            <ChevronUp className="w-4 h-4 text-muted-foreground/70" />
          )}
        </div>
        <div className="flex md:hidden">
          <div className="w-14 h-1.5 bg-muted-foreground/50 rounded-full" />
        </div>
      </button>

      {/* Content: grows to fit when expanded, clipped when peeked */}
      <div className={expanded ? 'overflow-y-auto max-h-[calc(65vh-28px)]' : 'h-[calc(160px-28px)] overflow-hidden'}>
        {children}
      </div>
    </div>
  );
}
