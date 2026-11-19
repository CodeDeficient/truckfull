import { Metadata } from 'next';
import { connection } from 'next/server';
import { SeoPageShell } from '@/components/ui/organisms/SeoPageShell';
import { getTruckMetrics, getEventSourceMetrics } from '@/lib/content/metrics';

const CANONICAL_URL = 'https://www.truckfull.food/partnerships';
const CONTACT_EMAIL = 'newman@truckfull.food';
const CONTACT_HREF = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('TruckFull inquiry')}`;

interface Highlight {
  readonly value: string;
  readonly label: string;
}

interface Audience {
  readonly title: string;
  readonly body: string;
}

const AUDIENCES: readonly Audience[] = [
  {
    title: 'Acquisition',
    body: 'Companies interested in acquiring TruckFull, its truck and event data, or its owner tools.',
  },
  {
    title: 'Investment',
    body: 'Investors who want to help TruckFull grow beyond Georgia and South Carolina.',
  },
  {
    title: 'Partnerships',
    body: 'Event platforms, festivals, cities, tourism boards, and food or payment companies that work with food trucks.',
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const displayTotal = await getTruckMetrics().then(
    (metrics) => metrics.displayTotal,
    () => '3000+',
  );
  const description = `Partner with, invest in, or acquire TruckFull, the food truck platform listing ${displayTotal} trucks across Georgia and South Carolina. Contact ${CONTACT_EMAIL}.`;

  return {
    title: 'Partnerships, Investment and Acquisition | TruckFull',
    description,
    alternates: { canonical: CANONICAL_URL },
    openGraph: {
      title: 'Partnerships, Investment and Acquisition | TruckFull',
      description,
      url: CANONICAL_URL,
      siteName: 'TruckFull',
      type: 'website',
    },
  };
}

async function loadHighlights(): Promise<readonly Highlight[]> {
  const [truckMetrics, sourceMetrics] = await Promise.allSettled([
    getTruckMetrics(),
    getEventSourceMetrics(),
  ]);
  const displayTotal =
    truckMetrics.status === 'fulfilled' ? truckMetrics.value.displayTotal : '3000+';
  const displaySourceCount =
    sourceMetrics.status === 'fulfilled' ? sourceMetrics.value.displaySourceCount : '30+';
  return [
    { value: displayTotal, label: 'food trucks listed' },
    { value: displaySourceCount, label: 'event sources tracked' },
    { value: 'GA and SC', label: 'current coverage' },
  ];
}

function HighlightGrid({ highlights }: { readonly highlights: readonly Highlight[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {highlights.map((highlight) => (
        <div key={highlight.label} className="glass rounded-lg p-4">
          <p className="text-2xl font-bold text-foreground">{highlight.value}</p>
          <p className="text-sm text-muted-foreground">{highlight.label}</p>
        </div>
      ))}
    </div>
  );
}

function AudienceList() {
  return (
    <div className="grid gap-3">
      {AUDIENCES.map((audience) => (
        <div key={audience.title} className="glass rounded-lg p-4">
          <h3 className="font-medium text-foreground mb-1">{audience.title}</h3>
          <p className="text-sm text-muted-foreground">{audience.body}</p>
        </div>
      ))}
    </div>
  );
}

function ContactCard() {
  return (
    <section className="glass rounded-lg p-6">
      <h2 className="text-xl font-semibold text-foreground mb-4">Get in touch</h2>
      <p className="text-muted-foreground mb-4">
        Send a short note about who you are and what you have in mind. Every inquiry is read and
        answered personally.
      </p>
      <a
        href={CONTACT_HREF}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
      >
        Email {CONTACT_EMAIL}
      </a>
    </section>
  );
}

export default async function PartnershipsPage() {
  if (process.env.NEXT_OUTPUT_STANDALONE === 'true') await connection();
  const highlights = await loadHighlights();

  return (
    <SeoPageShell>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Partnerships, Investment and Acquisition
          </h1>
          <p className="text-muted-foreground">
            TruckFull helps people find food trucks across Georgia and South Carolina, and gives
            truck owners tools for events, live location, traffic data, and menus. We are open to
            conversations about partnering with us, investing, or acquiring the platform.
          </p>
        </div>

        <div className="space-y-8 text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">TruckFull at a glance</h2>
            <HighlightGrid highlights={highlights} />
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Who should reach out</h2>
            <AudienceList />
          </section>

          <ContactCard />
        </div>

        <div className="h-12" />
      </div>
    </SeoPageShell>
  );
}
