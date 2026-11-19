import { Metadata } from 'next';
import Link from '@/components/navigation/IntentLink';
import { SeoPageShell } from '@/components/ui/organisms/SeoPageShell';
import {
  liveLocationHowItWorks,
  customerNotificationsFeature,
  liveLocationStatusRingFeature,
  worksEverywhereFeature,
} from '@/lib/content/feature-descriptions';

const CANONICAL_URL = 'https://www.truckfull.food/food-truck-live-location';
const OG_IMAGE_URL = 'https://www.truckfull.food/api/og/default';

export const metadata: Metadata = {
  title: 'Live GPS Location for Food Trucks | TruckFull',
  description:
    "Broadcast your food truck's location in real time with one-tap go live and automatic status updates, so nearby customers across Georgia and South Carolina can find you on the map.",
  alternates: {
    canonical: CANONICAL_URL,
  },
  openGraph: {
    title: 'Live GPS Location for Food Trucks | TruckFull',
    description:
      'One tap to go live. Customers nearby see you on the map. Available across Georgia and South Carolina.',
    url: CANONICAL_URL,
    siteName: 'TruckFull',
    type: 'website',
    images: [{ url: OG_IMAGE_URL, width: 1200, height: 630, alt: 'TruckFull live food truck location tools' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Live GPS Location for Food Trucks | TruckFull',
    description:
      'One tap to go live. Customers nearby see you on the map.',
    images: [OG_IMAGE_URL],
  },
};

export default function FoodTruckLiveLocationPage() {
  return (
    <SeoPageShell>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Live Location for Food Trucks
          </h1>
          <p className="text-muted-foreground">
            No more &ldquo;where are you?&rdquo; DMs and missed walk-ups. Let customers
            find you in real time with one tap.
          </p>
        </div>

        <div className="space-y-8 text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground mb-3">{liveLocationHowItWorks.short}</p>
            <div className="grid gap-3">
              <div className="glass rounded-lg p-4">
                <p className="font-medium text-foreground mb-1">
                  Open TruckFull
                </p>
                <p className="text-sm text-muted-foreground">
                  Sign in to your owner dashboard on any device.
                </p>
              </div>
              <div className="glass rounded-lg p-4">
                <p className="font-medium text-foreground mb-1">
                  Tap Go Live
                </p>
                <p className="text-sm text-muted-foreground">
                  Your current GPS location is broadcast to the public map.
                </p>
              </div>
              <div className="glass rounded-lg p-4">
                <p className="font-medium text-foreground mb-1">
                  Customers See You
                </p>
                <p className="text-sm text-muted-foreground">
                  A green status ring appears around your truck on the map. Anyone
                  browsing TruckFull in your area sees you&apos;re open for business.
                </p>
              </div>
              <div className="glass rounded-lg p-4">
                <p className="font-medium text-foreground mb-1">
                  Close Shop
                </p>
                <p className="text-sm text-muted-foreground">
                  Tap close and your location reverts to your default spot. The status
                  ring goes gray. No manual updates needed.
                </p>
              </div>
            </div>
          </section>

          <section className="glass rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Customer Alerts (Coming Soon)
            </h2>
            <p className="text-muted-foreground">{customerNotificationsFeature.long}</p>
          </section>

          <section className="glass rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Status Ring
            </h2>
            <p className="text-muted-foreground">{liveLocationStatusRingFeature.long}</p>
          </section>

          <section className="glass rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Works Everywhere
            </h2>
            <p className="text-muted-foreground">{worksEverywhereFeature.long}</p>
          </section>

          <section className="glass rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-3">
              Set Up Live Location
            </h2>
            <p className="text-muted-foreground mb-4">
              Claim your truck listing and start broadcasting your live location to
              customers in your area.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/claim-your-truck"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
              >
                Claim Your Truck
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                See Pricing
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>
            </div>
          </section>
        </div>

        <div className="h-12" />
      </div>
    </SeoPageShell>
  );
}
