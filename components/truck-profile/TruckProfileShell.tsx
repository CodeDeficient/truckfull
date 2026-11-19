'use client';

import { useEffect, useState } from 'react';
import Link from '@/components/navigation/IntentLink';
import Image from 'next/image';

import { TRUCK_FALLBACK_IMAGE } from '@/lib/utils/photoTransform';
import { slugifyCuisine } from '@/lib/utils/slugify';
import { SocialFooter, SocialFooterSpacer } from '@/components/SocialFooter';
import { Button } from '@/components/ui/button';
import type { TruckProfileView } from '@/lib/truck-profile/profileView';
import type { CuisineTheme } from '@/lib/truck-profile/theme';
import type { RelatedTrucksResult } from '@/lib/truck-profile/relatedTrucks';
import type { TruckBreadcrumb } from '@/lib/truck-profile/breadcrumbs';
import { buildTruckFaq } from '@/lib/truck-profile/faq';
import { isNextStopOver } from '@/lib/truck-profile/nextStop';
import TruckMarquee from './TruckMarquee';
import TruckHeroAtmosphere from './TruckHeroAtmosphere';
import TruckFaq from './TruckFaq';

const NON_DIGITS = /\D/g;

function formatPhone(phone: string): string {
  const digits = phone.replaceAll(NON_DIGITS, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

function Menu({
  truck,
  theme,
}: {
  readonly truck: TruckProfileView;
  readonly theme: CuisineTheme;
}) {
  if (truck.menu.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 p-6">
        <h3 className="text-base font-semibold" style={{ color: theme.cream }}>
          The menu isn’t published yet.
        </h3>
        <p className="mt-1 text-sm text-white/50">Dishes and prices appear here once available.</p>
      </div>
    );
  }
  return (
    <div className="grid gap-x-28 gap-y-14 md:grid-cols-2">
      {truck.menu.map((category) => (
        <section key={category.name} className="min-w-0 px-1">
          <h3
            className="mb-5 border-b pb-2 text-xs font-semibold uppercase tracking-[0.25em]"
            style={{ color: theme.glow, borderColor: `${theme.glow}44` }}
          >
            {category.name}
          </h3>
          <ul className="space-y-5">
            {category.items.map((item, idx) => (
              <li key={`${category.name}-${item.name}-${idx}`} className="min-w-0">
                <div className="flex min-w-0 items-baseline gap-4">
                  <span
                    className="min-w-0 text-[15px] font-medium leading-snug"
                    style={{ color: theme.cream }}
                  >
                    {item.name}
                  </span>
                  <span className="min-w-8 flex-1 translate-y-[-3px] border-b border-dotted border-white/20" />
                  {item.price && (
                    <span className="shrink-0 pl-3 text-sm tabular-nums text-white/60">
                      {item.price}
                    </span>
                  )}
                </div>
                {item.description && (
                  <p className="mt-1 text-xs leading-relaxed text-white/45">{item.description}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Hours({ truck }: { readonly truck: TruckProfileView }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.25em] text-white/45">Hours</div>
      {truck.hasPublishedHours ? (
        <ul className="mt-3 space-y-1.5 text-sm">
          {truck.hours.map((day) => (
            <li key={day.day} className="flex justify-between gap-6 text-white/70">
              <span>{day.label}</span>
              <span className="tabular-nums">
                {day.status === 'closed'
                  ? 'Closed'
                  : day.status === 'all-day'
                    ? 'All day'
                    : day.status === 'open'
                      ? day.hours
                      : '—'}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-white/70">Contact vendor</p>
      )}
    </div>
  );
}

function ProfileHeader() {
  return (
    <header className="relative z-20 bg-card shadow-md">
      <div className="flex items-center justify-between px-4 py-1.5">
        <div className="flex items-center gap-2">
          <Link href="/" className="block">
            <Image
              src="/truckfull-icon-transparent.webp"
              alt="TruckFull logo"
              width={92}
              height={64}
              className="h-12 w-auto object-contain"
              sizes="92px"
              priority
            />
          </Link>
          <Link
            href="/"
            className="font-lobster text-3xl font-bold text-white neon-glow glow-red"
            aria-label="TruckFull page header"
          >
            TruckFull
          </Link>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <Link
            href="/events"
            className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Events
          </Link>
          <Button
            asChild
            variant="ghost"
            className="h-8 text-sm px-3 bg-primary/10 text-primary font-semibold hover:bg-primary/15 no-hover-effects"
          >
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function HeroAtmosphere({ theme }: { readonly theme: CuisineTheme }) {
  return <TruckHeroAtmosphere theme={theme} />;
}

function OwnershipSection({
  truck,
  theme,
}: {
  readonly truck: TruckProfileView;
  readonly theme: CuisineTheme;
}) {
  if (truck.isClaimed) {
    return (
      <section className="mx-auto max-w-5xl px-8 pb-10 md:px-14">
        <p className="text-sm text-white/50">This listing is managed by the owner.</p>
      </section>
    );
  }
  return (
    <section className="mx-auto max-w-5xl px-8 pb-10 md:px-14">
      <div
        className="flex flex-col gap-4 rounded-2xl border p-6 md:flex-row md:items-center md:justify-between"
        style={{ borderColor: `${theme.glow}33` }}
      >
        <div>
          <h2 className="text-lg font-semibold" style={{ color: theme.cream }}>
            Own {truck.name}?
          </h2>
          <p className="mt-1 max-w-xl text-sm text-white/70">
            This listing hasn&apos;t been claimed by its owner yet. Claim it for free to update your
            menu, hours, and location, and to go live on the map when you&apos;re open.
          </p>
        </div>
        <Link
          href="/claim-your-truck"
          className="shrink-0 rounded-lg px-6 py-3 text-center text-sm font-semibold text-white"
          style={{ backgroundColor: theme.accent }}
        >
          Claim this listing
        </Link>
      </div>
    </section>
  );
}

interface TruckProfileShellProps {
  readonly truck: TruckProfileView;
  readonly slug: string;
  readonly theme: CuisineTheme;
  readonly related: RelatedTrucksResult;
  readonly breadcrumbs: readonly TruckBreadcrumb[];
}

function ProfileBreadcrumbs({
  crumbs,
  theme,
}: {
  readonly crumbs: readonly TruckBreadcrumb[];
  readonly theme: CuisineTheme;
}) {
  if (crumbs.length < 2) return null;
  const last = crumbs.length - 1;
  return (
    <nav aria-label="Breadcrumb">
      <ol
        className="flex flex-wrap items-center gap-1.5 text-xs"
        style={{ color: `${theme.cream}bf`, textShadow: `0 1px 12px ${theme.base}cc` }}
      >
        {crumbs.map((crumb, index) => (
          <li key={crumb.path} className="flex items-center gap-1.5">
            {index === last ? (
              <span aria-current="page" style={{ color: theme.cream }}>
                {crumb.name}
              </span>
            ) : (
              <>
                <Link href={crumb.path} className="hover:underline">
                  {crumb.name}
                </Link>
                <span aria-hidden="true">/</span>
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function LiveTruckFaq({
  truck,
  theme,
}: {
  readonly truck: TruckProfileView;
  readonly theme: CuisineTheme;
}) {
  const [stopOver, setStopOver] = useState(false);
  useEffect(() => {
    setStopOver(
      truck.nextStop !== null && isNextStopOver(truck.nextStop, truck.timezone, new Date()),
    );
  }, [truck.nextStop, truck.timezone]);
  const faqTruck = stopOver ? { ...truck, nextStop: null } : truck;
  return <TruckFaq name={truck.name} entries={buildTruckFaq(faqTruck)} theme={theme} />;
}

export default function TruckProfileShell({
  truck,
  slug,
  theme,
  related,
  breadcrumbs,
}: TruckProfileShellProps) {
  const nearby = related?.nearby ?? [];
  const byCuisine = related?.byCuisine ?? [];
  return (
    <div className="fixed inset-0 flex flex-col bg-black">
      <ProfileHeader />
      <div className="flex-1 overflow-y-auto" style={{ backgroundColor: theme.base }}>
        <div className="relative min-h-[36svh] overflow-hidden md:min-h-[48vh]">
          <div className="absolute inset-0">
            <HeroAtmosphere theme={theme} />
          </div>
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(90deg, ${theme.base}b3 0%, ${theme.base}80 45%, ${theme.base}00 85%), linear-gradient(180deg, ${theme.base}00 0%, ${theme.base}33 45%, ${theme.base}e6 88%, ${theme.base} 100%)`,
            }}
          />
          <div className="relative mx-auto flex min-h-[36svh] max-w-5xl flex-col justify-end px-6 pb-8 pt-8 md:min-h-[48vh] md:px-14 md:pb-12 md:pt-16">
            <ProfileBreadcrumbs crumbs={breadcrumbs} theme={theme} />
            <div className="mt-5 flex items-end gap-4 md:gap-6">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/20 bg-black/40 backdrop-blur-sm md:h-24 md:w-24">
                <img
                  src={truck.photoUrl ?? TRUCK_FALLBACK_IMAGE}
                  alt={`${truck.name} logo`}
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <h1
                  className="text-4xl font-semibold tracking-tight md:text-7xl"
                  style={{
                    color: theme.cream,
                    textShadow: `0 2px 24px ${theme.base}f2, 0 1px 8px ${theme.base}e6`,
                  }}
                >
                  {truck.name}
                </h1>
                {truck.description && (
                  <p
                    className="mt-3 max-w-2xl text-sm"
                    style={{ color: `${theme.cream}bf`, textShadow: `0 1px 12px ${theme.base}cc` }}
                  >
                    {truck.description}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              {truck.cuisines.map((cuisine) => (
                <Link
                  key={cuisine}
                  href={`/cuisine/${slugifyCuisine(cuisine)}`}
                  className="rounded-full border px-3 py-1 text-xs"
                  style={{ borderColor: `${theme.glow}55`, color: theme.cream }}
                >
                  {cuisine}
                </Link>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/?truck=${slug}`}
                className="rounded-lg px-6 py-3 text-sm font-semibold text-white"
                style={{ backgroundColor: theme.accent }}
              >
                View on Map
              </Link>
              {truck.phone && (
                <a
                  href={`tel:${truck.phone}`}
                  className="rounded-lg border px-6 py-3 text-sm font-semibold"
                  style={{ borderColor: `${theme.glow}66`, color: theme.cream }}
                >
                  {formatPhone(truck.phone)}
                </a>
              )}
            </div>
          </div>
        </div>

        <section className="mx-auto max-w-5xl px-8 py-14 md:px-14">
          <div className="mb-8">
            <h2 className="text-3xl font-semibold tracking-tight" style={{ color: theme.cream }}>
              Menu
            </h2>
          </div>
          <Menu truck={truck} theme={theme} />
        </section>

        <section className="mx-auto grid max-w-5xl gap-10 px-8 py-10 md:grid-cols-3 md:px-14">
          <Hours truck={truck} />
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-white/45">Find them</div>
            <p className="mt-2 text-sm text-white/70">
              {truck.address ?? 'Location not published'}
            </p>
            {!truck.address && (
              <p className="mt-1 text-sm text-white/50">
                {[truck.city, truck.state].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-white/45">Contact</div>
            <div className="mt-2 space-y-1.5 text-sm">
              {truck.phone && (
                <a className="block text-white/70 hover:text-white" href={`tel:${truck.phone}`}>
                  {formatPhone(truck.phone)}
                </a>
              )}
              {truck.email && (
                <a
                  className="block break-all text-white/70 hover:text-white"
                  href={`mailto:${truck.email}`}
                >
                  {truck.email}
                </a>
              )}
              {truck.website && (
                <a
                  className="block text-white/70 hover:text-white"
                  href={truck.website}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Website ↗
                </a>
              )}
              {truck.instagram && (
                <a
                  className="block text-white/70 hover:text-white"
                  href={truck.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Instagram ↗
                </a>
              )}
              {!truck.phone && !truck.email && !truck.website && !truck.instagram && (
                <p className="text-white/40">No contact details published.</p>
              )}
            </div>
          </div>
        </section>
        <OwnershipSection truck={truck} theme={theme} />

        {nearby.length > 0 && (
          <section className="mx-auto max-w-6xl px-8 py-2 md:px-14">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold leading-none" style={{ color: theme.cream }}>
                  Other trucks nearby
                </h2>
              </div>
              <Link
                href={`/?truck=${slug}`}
                className="shrink-0 text-sm"
                style={{ color: theme.glow }}
              >
                View all →
              </Link>
            </div>
            <div className="mt-1.5">
              <TruckMarquee
                trucks={nearby}
                theme={theme}
                direction="left"
                speed={22}
                offset={140}
              />
            </div>
          </section>
        )}

        {byCuisine.slice(0, 1).map((list, index) => (
          <section key={list.cuisine} className="mx-auto max-w-6xl px-8 py-2 md:px-14">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold leading-none" style={{ color: theme.cream }}>
                More {list.cuisine} trucks
              </h2>
              <Link
                href={`/cuisine/${slugifyCuisine(list.cuisine)}`}
                className="shrink-0 text-sm"
                style={{ color: theme.glow }}
              >
                View all →
              </Link>
            </div>
            <div className="mt-1.5">
              <TruckMarquee
                trucks={list.trucks}
                theme={theme}
                direction="left"
                speed={20}
                offset={(index + 1) * 260}
              />
            </div>
          </section>
        ))}

        <LiveTruckFaq truck={truck} theme={theme} />

        <SocialFooterSpacer />
      </div>
      <SocialFooter />
    </div>
  );
}
