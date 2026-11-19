import React from 'react';
import { MobileShell } from '@/components/layout/MobileShell';

/**
 * Mobile-specific layout for all mobile routes
 * Provides mobile-optimized viewport, styling, and navigation
 */
interface MobileLayoutProps {
  readonly children: React.ReactNode;
}

/**
 * Mobile-optimized layout wrapper
 * Provides consistent mobile styling and viewport handling
 */
function MobileLayout({ children }: MobileLayoutProps) {
  return <MobileShell>{children}</MobileShell>;
}
MobileLayout.displayName = 'MobileLayout';
export default MobileLayout;
