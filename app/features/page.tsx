import { Metadata } from 'next';
import { connection } from 'next/server';
import Link from '@/components/navigation/IntentLink';
import {
  MapPin,
  Menu,
  Heart,
  Search,
  ShieldCheck,
  Radio,
  BarChart3,
  ClipboardList,
  PlusSquare,
  FileCheck,
} from 'lucide-react';
import { SeoPageShell } from '@/components/ui/organisms/SeoPageShell';
import { getTruckMetrics } from '@/lib/content/metrics';
import {
  liveMapFeature,
  browseMenusFeature,
  saveFavoritesFeature,
  eventDiscoveryFeature,
  eventVettingFeature,
  liveGpsFeature,
  trafficIntelligenceFeature,
  menuManagementFeature,
  organizerPostEventFeature,
  organizerReviewApplicationsFeature,
} from '@/lib/content/feature-descriptions';

const CANONICAL_URL = 'https://www.truckfull.food/features';
const OG_IMAGE_URL = 'https://www.truckfull.food/api/og/default';

export async function generateMetadata(): Promise<Metadata> {
  let displayTotal = '255+';
  try {
    const metrics = await getTruckMetrics();
    displayTotal = metrics.displayTotal;
  } catch {
    // fallback
  }

  return {
    title: 'TruckFull Features — Food Truck Discovery & Owner Tools',
    description: `Live map with ${displayTotal} food trucks in GA and SC. AI-powered event discovery, live GPS broadcasting, traffic intelligence, and menu management for food truck owners.`,
    alternates: {
      canonical: CANONICAL_URL,
    },
    openGraph: {
      title: 'TruckFull Features — Food Truck Discovery & Owner Tools',
      description: `Live map, AI event discovery, live GPS, traffic intelligence, and menu management. Tools for eaters, owners, and organizers across GA & SC.`,
      url: CANONICAL_URL,
      siteName: 'TruckFull',
      type: 'website',
      images: [{ url: OG_IMAGE_URL, width: 1200, height: 630, alt: 'TruckFull features' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'TruckFull Features — Food Truck Discovery & Owner Tools',
      description: `Live map, AI event discovery, live GPS, traffic intelligence, and menu management. Tools for eaters, owners, and organizers across GA & SC.`,
      images: [OG_IMAGE_URL],
    },
  };
}

export default async function FeaturesPage(): Promise<React.JSX.Element> {
  if (process.env.NEXT_OUTPUT_STANDALONE === 'true') await connection();
  return (
    <SeoPageShell>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">TruckFull Features</h1>
          <p className="text-muted-foreground">
            Tools for food truck discovery, owner management, and event research across Georgia and
            South Carolina.
          </p>
        </div>

        <div className="space-y-8 text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">For Customers</h2>
            <p className="text-muted-foreground mb-4">Find Food Trucks Near You</p>
            <div className="grid gap-3">
              <div className="glass rounded-lg p-4">
                <p className="font-medium text-foreground mb-1 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  Live Map
                </p>
                <p className="text-sm text-muted-foreground">{liveMapFeature.short}</p>
              </div>
              <div className="glass rounded-lg p-4">
                <p className="font-medium text-foreground mb-1 flex items-center gap-2">
                  <Menu className="h-4 w-4 text-primary shrink-0" />
                  Browse Menus
                </p>
                <p className="text-sm text-muted-foreground">{browseMenusFeature.short}</p>
              </div>
              <div className="glass rounded-lg p-4">
                <p className="font-medium text-foreground mb-1 flex items-center gap-2">
                  <Heart className="h-4 w-4 text-primary shrink-0" />
                  Save Favorites
                </p>
                <p className="text-sm text-muted-foreground">{saveFavoritesFeature.short}</p>
              </div>
            </div>
            <div className="mt-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
              >
                Explore the map
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

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">For Food Truck Owners</h2>
            <p className="text-muted-foreground mb-4">Run Your Truck Smarter</p>
            <div className="grid gap-3">
              <div className="glass rounded-lg p-4">
                <p className="font-medium text-foreground mb-1 flex items-center gap-2">
                  <Search className="h-4 w-4 text-primary shrink-0" />
                  Event Discovery
                </p>
                <p className="text-sm text-muted-foreground">
                  {eventDiscoveryFeature.short}{' '}
                  <Link href="/food-truck-event-research" className="text-primary hover:underline">
                    Learn more
                  </Link>
                </p>
              </div>
              <div className="glass rounded-lg p-4">
                <p className="font-medium text-foreground mb-1 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                  Event Vetting
                </p>
                <p className="text-sm text-muted-foreground">
                  {eventVettingFeature.short}{' '}
                  <Link href="/food-truck-event-research" className="text-primary hover:underline">
                    Learn more
                  </Link>
                </p>
              </div>
              <div className="glass rounded-lg p-4">
                <p className="font-medium text-foreground mb-1 flex items-center gap-2">
                  <Radio className="h-4 w-4 text-primary shrink-0" />
                  Live GPS
                </p>
                <p className="text-sm text-muted-foreground">
                  {liveGpsFeature.short}{' '}
                  <Link href="/food-truck-live-location" className="text-primary hover:underline">
                    Learn more
                  </Link>
                </p>
              </div>
              <div className="glass rounded-lg p-4">
                <p className="font-medium text-foreground mb-1 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary shrink-0" />
                  Traffic Intelligence
                </p>
                <p className="text-sm text-muted-foreground">
                  {trafficIntelligenceFeature.short}{' '}
                  <Link href="/food-truck-traffic-data" className="text-primary hover:underline">
                    Learn more
                  </Link>
                </p>
              </div>
              <div className="glass rounded-lg p-4">
                <p className="font-medium text-foreground mb-1 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-primary shrink-0" />
                  Menu &amp; Schedule Management
                </p>
                <p className="text-sm text-muted-foreground">{menuManagementFeature.short}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
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
                href="/for-owners"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                Learn more about owner tools
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

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">For Event Organizers</h2>
            <p className="text-muted-foreground mb-4">Find Food Trucks for Your Event</p>
            <p className="text-sm text-muted-foreground mb-3">Launching Q3 2026.</p>
            <div className="grid gap-3">
              <div className="glass rounded-lg p-4">
                <p className="font-medium text-foreground mb-1 flex items-center gap-2">
                  <PlusSquare className="h-4 w-4 text-primary shrink-0" />
                  Post Events
                </p>
                <p className="text-sm text-muted-foreground">{organizerPostEventFeature.short}</p>
              </div>
              <div className="glass rounded-lg p-4">
                <p className="font-medium text-foreground mb-1 flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-primary shrink-0" />
                  Manage Applications
                </p>
                <p className="text-sm text-muted-foreground">
                  {organizerReviewApplicationsFeature.short}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <a
                href="mailto:support@truckfull.food?subject=Organizer%20Waitlist"
                className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
              >
                Join the organizer waitlist
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
              </a>
            </div>
          </section>
        </div>

        <div className="h-12" />
      </div>
    </SeoPageShell>
  );
}
