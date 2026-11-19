import type { Metadata } from 'next';
import { Outfit, Fraunces, Lobster } from 'next/font/google';
import './globals.css';
// mapbox-gl CSS moved to MapboxMapComponent.tsx for lazy loading
import SerwistRegistration from '@/components/SerwistRegistration';
import ClientLayoutWrapper from './ClientLayoutWrapper';
import { getSiteJsonLdMarkup } from '@/lib/seo/layoutJsonLd';
import { shouldRenderMobileSlot } from '@/lib/utils/mobileSlotRouting';
import { HONEYPOT_LINK_PATH } from '@/lib/security/honeypot';
// PWAInstaller moved to AvatarMenu for better UX
// import PWAInstaller from '@/components/PWAInstaller';
import Image from 'next/image';
import { getMetadataSafeTruckCount } from '@/lib/seo/getTruckCount';
import {
  buildTruckCountTitle,
  buildTruckCountDescription,
  buildTruckCountOgDescription,
  buildTruckCountTwitterDescription,
} from '@/lib/seo/truckCount.logic';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});
const lobster = Lobster({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-lobster',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  let rounded: number | null = null;
  try {
    const result = await getMetadataSafeTruckCount();
    rounded = result.rounded;
  } catch {
    rounded = null;
  }

  return {
    metadataBase: new URL('https://www.truckfull.food'),
    title: buildTruckCountTitle(rounded),
    description: buildTruckCountDescription(rounded),
    openGraph: {
      title: buildTruckCountTitle(rounded),
      description: buildTruckCountOgDescription(rounded),
      url: 'https://www.truckfull.food',
      siteName: 'TruckFull',
      type: 'website',
      images: [
        {
          url: '/api/og/default',
          width: 1200,
          height: 630,
          alt: 'TruckFull \u2014 Find Food Trucks',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: buildTruckCountTitle(rounded),
      description: buildTruckCountTwitterDescription(rounded),
      images: ['/api/og/default'],
    },
    manifest: '/manifest.json',
    icons: {
      icon: [{ url: '/pwa-icon-512.webp', type: 'image/webp' }, { url: '/pwa-icon-512.png', type: 'image/png' }],
      apple: '/pwa-icon-512.png',
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black',
      title: 'TruckFull',
    },
    other: {
      'mobile-web-app-capable': 'yes',
    },
  };
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  themeColor: '#000000',
};

export default function RootLayout({
  children,
  mobile,
}: Readonly<{
  children: React.ReactNode;
  mobile?: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.mapbox.com" crossOrigin="anonymous" />
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''} />
        <noscript>
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          />
        </noscript>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: getSiteJsonLdMarkup('https://www.truckfull.food'),
          }}
        />
      </head>
      <body className={`${outfit.variable} ${fraunces.variable} ${lobster.variable} font-sans`}>
        <noscript>
          <style>{
            '#instant-skeleton,.mobile-client-experience{display:none}'
          }</style>
        </noscript>
        {/* Instant skeleton - shows before React hydrates, hidden by React on mount */}
        <div id="instant-skeleton" className="instant-skeleton">
          <div className="skeleton-content">
            <Image
              src="/truckfull-icon-transparent.webp"
              alt="TruckFull Logo"
              className="skeleton-logo"
              width={92}
              height={64}
              priority
            />
            <div className="skeleton-text">TruckFull</div>
            <div className="skeleton-spinner" />
          </div>
        </div>
        {/* PWA install option moved to user menu */}
        {/* Serwist service worker registration - only on secure contexts */}
        <SerwistRegistration>
        <ClientLayoutWrapper
          hasMobileSlot={shouldRenderMobileSlot(null, true, mobile)}
          mobile={mobile}
        >
          {children}
        </ClientLayoutWrapper>
        </SerwistRegistration>
        <a
          href={HONEYPOT_LINK_PATH}
          rel="nofollow"
          aria-hidden="true"
          tabIndex={-1}
          className="sr-only"
        >
          Vendor data export
        </a>
      </body>
    </html>
  );
}
