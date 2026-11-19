'use client';

import Link from '@/components/navigation/IntentLink';
import type { ReactNode } from 'react';
import { captureOwnerFunnelEvent } from '@/lib/analytics/trackClient';
import { buildOwnerCtaClicked, type CtaLocation } from '@/lib/analytics/funnel';

interface OwnerCtaLinkProps {
  readonly href: string;
  readonly ctaLocation: CtaLocation;
  readonly className?: string;
  readonly children: ReactNode;
}

export function OwnerCtaLink({ href, ctaLocation, className, children }: OwnerCtaLinkProps) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        const { event, properties } = buildOwnerCtaClicked(ctaLocation);
        captureOwnerFunnelEvent(event, properties);
      }}
    >
      {children}
    </Link>
  );
}
