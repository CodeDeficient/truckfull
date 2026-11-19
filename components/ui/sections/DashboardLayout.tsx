'use client';

import React from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';

export interface DashboardLayoutProps {
  readonly icon: React.ReactNode;
  readonly title: string;
  readonly welcomeName: string;
  readonly onSignOut: () => void;
  readonly children: React.ReactNode;
}

/**
 * DashboardLayout
 * - Renders a consistent dashboard screen with header and standard main container
 * - Prevents duplicate structure across owner/user dashboards
 */
export function DashboardLayout(props: DashboardLayoutProps) {
  const { icon, title, welcomeName, onSignOut, children } = props;
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader icon={icon} title={title} welcomeName={welcomeName} onSignOut={onSignOut} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}
