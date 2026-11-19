'use client';

import React, { useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppBottomNavigation from '@/components/ui/organisms/AppBottomNavigation';

interface MobileLegalPageLayoutProps {
  readonly title: string;
  readonly lastUpdated?: string;
  readonly children: React.ReactNode;
}

const handleBack = (): void => {
  globalThis.history.back();
};

/**
 * Reusable layout for mobile legal pages (Terms, Privacy, Takedown, etc.)
 * Provides consistent header with back button, scrollable content, and bottom nav.
 */
export const MobileLegalPageLayout: React.FC<MobileLegalPageLayoutProps> = ({
  title,
  lastUpdated,
  children,
}) => {
  // Handle bottom navigation clicks - navigate to the main mobile page with the selected tab
  const handleNavClick = useCallback((id: string) => {
    // Navigate to root which will load the mobile experience with the correct tab
    globalThis.location.href = `/?tab=${id}`;
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header with back button */}
      <header className="flex-none flex items-center gap-3 px-4 py-3 bg-background/95 backdrop-blur-lg border-b border-border z-10">
        <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
          <ArrowLeft className="size-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">{title}</h1>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground">Last updated: {lastUpdated}</p>
          )}
        </div>
      </header>

      {/* Scrollable content */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="space-y-6 text-foreground/90">{children}</div>
        {/* Spacer for fixed bottom nav */}
        <div className="h-32" aria-hidden="true" />
      </main>

      {/* Bottom navigation bar - fixed position */}
      <AppBottomNavigation
        activeItem=""
        className="mobile-bottom-nav"
        onItemClick={handleNavClick}
      />
    </div>
  );
};

export default MobileLegalPageLayout;
