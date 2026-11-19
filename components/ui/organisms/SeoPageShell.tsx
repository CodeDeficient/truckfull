import Link from '@/components/navigation/IntentLink';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { SocialFooter, SocialFooterSpacer } from '@/components/SocialFooter';

interface SeoPageShellProps {
  readonly children: ReactNode;
  readonly hidePricing?: boolean;
  readonly transparentBg?: boolean;
}

export function SeoPageShell({ children, hidePricing, transparentBg }: SeoPageShellProps) {
  return (
    <div className={`fixed inset-0 flex flex-col ${transparentBg ? 'bg-transparent' : 'bg-background'}`}>
      <header
        className="bg-black shadow-md px-4 py-1.5 sm:py-2 relative z-10"
        role="banner"
      >
        <div className="flex items-center gap-2">
          <Link href="/" className="block">
            <Image
              src="/truckfull-icon-transparent.webp"
              alt="TruckFull Logo"
              width={92}
              height={64}
              className="h-10 sm:h-16 object-contain w-auto"
              sizes="92px"
              priority
            />
          </Link>
          <span className="font-lobster text-white text-xl sm:text-3xl font-bold neon-glow glow-red">
            <Link href="/">TruckFull</Link>
          </span>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto">
        {children}
        <SocialFooterSpacer />
      </main>
      <SocialFooter hidePricing={hidePricing} />
    </div>
  );
}