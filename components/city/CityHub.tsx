'use client';

import Link from '@/components/navigation/IntentLink';
import { useMemo, useState, type JSX, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import { CityBreadcrumb } from '@/components/city/CityHero';
import {
  filterCityGroups,
  MAX_CITY_QUERY_LENGTH,
  normalizeCityQuery,
  type StateCityGroup,
} from '@/lib/city/cityDirectory';
import { slugifyCity } from '@/lib/utils/slugify';

const COLLAPSED_CITY_COUNT = 12;

function CityRow({
  city,
  state,
  count,
  collapsed,
}: {
  readonly city: string;
  readonly state: string;
  readonly count: number;
  readonly collapsed: boolean;
}): JSX.Element {
  return (
    <li hidden={collapsed}>
      <Link href={`/city/${slugifyCity(city, state)}`} prefetch={false}>
        <span>{city}</span>
        <span>{count}</span>
      </Link>
    </li>
  );
}

function StateCard({
  group,
  searching,
}: {
  readonly group: StateCityGroup;
  readonly searching: boolean;
}): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const showAll = searching || expanded;
  const hidden = group.cities.length - COLLAPSED_CITY_COUNT;
  return (
    <section
      id={`state-${group.state}`}
      aria-labelledby={`state-${group.state}-heading`}
      className="scroll-mt-24 rounded-xl border border-white/10 bg-neutral-950 p-5 sm:p-6"
    >
      <h3
        id={`state-${group.state}-heading`}
        className="font-heading text-2xl font-bold text-white sm:text-3xl"
      >
        {group.stateName} food trucks
      </h3>
      <p className="mt-1 text-sm text-gray-400">
        {group.truckCount.toLocaleString('en-US')} {group.truckCount === 1 ? 'listing' : 'listings'}{' '}
        · {group.cities.length} {group.cities.length === 1 ? 'city' : 'cities'}
      </p>
      <ul className="hub-city-list mt-4 grid grid-cols-1 gap-x-8 min-[420px]:grid-cols-2 md:grid-cols-3">
        {group.cities.map(({ city, state, count }, index) => (
          <CityRow
            key={slugifyCity(city, state)}
            city={city}
            state={state}
            count={count}
            collapsed={!showAll && index >= COLLAPSED_CITY_COUNT}
          />
        ))}
      </ul>
      {!searching && hidden > 0 && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="rainbow-hover mt-4 rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-white/15 focus:outline-none"
        >
          {expanded ? 'Show fewer' : `Show all ${group.cities.length} cities`}
        </button>
      )}
    </section>
  );
}

function CitySearch({
  query,
  onChange,
}: {
  readonly query: string;
  readonly onChange: (value: string) => void;
}): JSX.Element {
  return (
    <label className="relative block">
      <span className="sr-only">Find your city</span>
      <Search
        aria-hidden
        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
      />
      <input
        type="search"
        value={query}
        maxLength={MAX_CITY_QUERY_LENGTH}
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        onChange={(event) => onChange(event.target.value.slice(0, MAX_CITY_QUERY_LENGTH))}
        placeholder="Find your city"
        className="w-full rounded-full border border-white/10 bg-neutral-900 py-3 pl-12 pr-4 text-white placeholder:text-gray-500 [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-red-500/70"
      />
    </label>
  );
}

function StateJumpLinks({ groups }: { readonly groups: readonly StateCityGroup[] }): JSX.Element {
  return (
    <nav aria-label="Jump to state" className="mt-4 flex flex-wrap gap-2">
      {groups.map((group) => (
        <a
          key={group.state}
          href={`#state-${group.state}`}
          className="rainbow-hover rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-white/15 focus:outline-none"
        >
          {group.stateName}
        </a>
      ))}
    </nav>
  );
}

const HERO_FADE =
  'radial-gradient(ellipse 45% 65% at 50% 45%, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.15) 100%), linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 65%, rgb(0,0,0) 100%)';

function HubHero({
  backdrop,
  intro,
  query,
  onQueryChange,
}: {
  readonly backdrop: ReactNode;
  readonly intro: ReactNode;
  readonly query: string;
  readonly onQueryChange: (value: string) => void;
}): JSX.Element {
  return (
    <section className="relative overflow-hidden bg-black text-white">
      <div aria-hidden className="absolute inset-0">
        {backdrop}
      </div>
      <div aria-hidden className="absolute inset-0" style={{ background: HERO_FADE }} />
      <div className="relative z-10 mx-auto max-w-3xl px-6 pb-8 pt-10 text-center sm:px-10 sm:pt-12">
        {intro}
        <div className="mx-auto mt-5 max-w-xl text-left">
          <CitySearch query={query} onChange={onQueryChange} />
        </div>
      </div>
    </section>
  );
}

function StateDirectory({
  groups,
  query,
}: {
  readonly groups: readonly StateCityGroup[];
  readonly query: string;
}): JSX.Element {
  const visible = useMemo(() => filterCityGroups(groups, query), [groups, query]);
  const searching = normalizeCityQuery(query).length > 0;
  return (
    <section aria-labelledby="browse-by-state" className="py-6">
      <div className="mx-auto max-w-5xl px-6 sm:px-10">
        <h2 id="browse-by-state" className="font-heading text-3xl font-bold text-white sm:text-4xl">
          {searching ? 'Matching cities' : 'Food trucks by state'}
        </h2>
        {!searching && <StateJumpLinks groups={groups} />}
        <div className="mt-6 space-y-6">
          {visible.map((group) => (
            <StateCard key={group.state} group={group} searching={searching} />
          ))}
        </div>
        {visible.length === 0 && (
          <p role="status" className="mt-6 text-gray-400">
            No cities match &ldquo;{normalizeCityQuery(query)}&rdquo; yet.
          </p>
        )}
      </div>
    </section>
  );
}

export function CityHub({
  groups,
  backdrop,
  intro,
  topCities,
}: {
  readonly groups: readonly StateCityGroup[];
  readonly backdrop: ReactNode;
  readonly intro: ReactNode;
  readonly topCities: ReactNode;
}): JSX.Element {
  const [query, setQuery] = useState('');
  const searching = normalizeCityQuery(query).length > 0;
  return (
    <>
      <HubHero backdrop={backdrop} intro={intro} query={query} onQueryChange={setQuery} />
      <CityBreadcrumb />
      {!searching && topCities}
      <StateDirectory groups={groups} query={query} />
    </>
  );
}
