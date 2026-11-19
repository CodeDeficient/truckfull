import { Metadata } from 'next';
import { connection } from 'next/server';
import { SeoPageShell } from '@/components/ui/organisms/SeoPageShell';
import { getTruckMetrics } from '@/lib/content/metrics';
import {
  organizerPostEventFeature,
  organizerReviewApplicationsFeature,
  organizerManageRosterFeature,
  organizerCuratedNetworkFeature,
  organizerVerifiedProfilesFeature,
} from '@/lib/content/feature-descriptions';

const CANONICAL_URL = 'https://www.truckfull.food/for-organizers';
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
    title: 'Find Food Trucks for Your Event — Organizer Tools | TruckFull',
    description: `Connect with ${displayTotal} food trucks in Georgia and South Carolina for your next event. Post events, review applications, and manage your vendor roster.`,
    alternates: {
      canonical: CANONICAL_URL,
    },
    openGraph: {
      title: 'Find Food Trucks for Your Event — Organizer Tools | TruckFull',
      description: `Post your event, review truck applications, and manage your vendor roster. Connect with ${displayTotal} food trucks across GA & SC.`,
      url: CANONICAL_URL,
      siteName: 'TruckFull',
      type: 'website',
      images: [{ url: OG_IMAGE_URL, width: 1200, height: 630, alt: 'TruckFull organizer tools' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Find Food Trucks for Your Event | TruckFull',
      description: `Post your event, review truck applications, and manage your vendor roster. Connect with ${displayTotal} food trucks across GA & SC.`,
      images: [OG_IMAGE_URL],
    },
  };
}

export default async function ForOrganizersPage(): Promise<React.JSX.Element> {
  if (process.env.NEXT_OUTPUT_STANDALONE === 'true') await connection();
  return (
    <SeoPageShell>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Find Food Trucks for Your Event
          </h1>
          <p className="text-muted-foreground">
            TruckFull is building tools to connect event organizers with food truck operators across
            Georgia and South Carolina. Launching Q3 2026 — join the waitlist to get early access.
          </p>
        </div>

        <div className="space-y-8 text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">What&apos;s Coming</h2>
            <div className="grid gap-3">
              <div className="glass rounded-lg p-4">
                <p className="font-medium text-foreground mb-1">Post Your Event</p>
                <p className="text-sm text-muted-foreground">{organizerPostEventFeature.long}</p>
              </div>
              <div className="glass rounded-lg p-4">
                <p className="font-medium text-foreground mb-1">Review Applications</p>
                <p className="text-sm text-muted-foreground">
                  {organizerReviewApplicationsFeature.long}
                </p>
              </div>
              <div className="glass rounded-lg p-4">
                <p className="font-medium text-foreground mb-1">Manage Your Roster</p>
                <p className="text-sm text-muted-foreground">{organizerManageRosterFeature.long}</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Why TruckFull</h2>
            <div className="grid gap-3">
              <div className="glass rounded-lg p-4">
                <p className="font-medium text-foreground mb-1">Curated Network</p>
                <p className="text-sm text-muted-foreground">
                  {organizerCuratedNetworkFeature.long}
                </p>
              </div>
              <div className="glass rounded-lg p-4">
                <p className="font-medium text-foreground mb-1">Verified Profiles</p>
                <p className="text-sm text-muted-foreground">
                  {organizerVerifiedProfilesFeature.long}
                </p>
              </div>
            </div>
          </section>

          <section className="glass rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Join the Waitlist</h2>
            <p className="text-muted-foreground mb-4">
              Organizer tools are currently in development. Join the waitlist and we&apos;ll notify
              you as soon as they&apos;re available — targeting Q3 2026.
            </p>
            <a
              href="mailto:support@truckfull.food?subject=Organizer%20Waitlist%20Request"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
            >
              Join the Organizer Waitlist
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
          </section>
        </div>

        <div className="h-12" />
      </div>
    </SeoPageShell>
  );
}
