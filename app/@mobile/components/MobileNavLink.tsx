import Link from '@/components/navigation/IntentLink';
import type { ComponentProps } from 'react';

const MOBILE_SLOT_PREFIX = /^\/@mobile\//;

type MobileNavLinkProps = ComponentProps<typeof Link> & {
  /** Internal mobile routes - the @mobile prefix is handled by route group */
  href: string;
};

export function MobileNavLink({ href, children, className = '', ...props }: MobileNavLinkProps) {
  const normalizedHref = href.replace(MOBILE_SLOT_PREFIX, '/');

  return (
    <Link href={normalizedHref} className={className} {...props}>
      {children}
    </Link>
  );
}
