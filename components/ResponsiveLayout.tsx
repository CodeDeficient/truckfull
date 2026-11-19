'use client';

import { ReactNode } from 'react';
import { useIsMobile } from '@/hooks/UseMobile';

interface ResponsiveLayoutProps {
  readonly desktopChildren: ReactNode;
  readonly mobileChildren: ReactNode;
}

export function ResponsiveLayout({
  desktopChildren,
  mobileChildren,
}: Readonly<ResponsiveLayoutProps>) {
  const isMobile = useIsMobile();

  return <>{isMobile ? mobileChildren : desktopChildren}</>;
}
