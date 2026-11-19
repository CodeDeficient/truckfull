'use client';

import Link from '@/components/navigation/IntentLink';
import { useMemo, useState, type JSX } from 'react';
import { Search } from 'lucide-react';
import { MAX_CITY_QUERY_LENGTH, normalizeCityQuery } from '@/lib/city/cityDirectory';
import { COLLAPSED_CUISINE_COUNT, filterCuisineNames } from '@/lib/city/cityGuide';

export interface CuisinePickerItem {
  readonly cuisine: string;
  readonly count: number;
  readonly href: string | null;
  readonly title: string;
}

const PILL =
  'rainbow-hover inline-block rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-white/15 focus:outline-none';

function CuisineSearch({
  query,
  onChange,
}: {
  readonly query: string;
  readonly onChange: (value: string) => void;
}): JSX.Element {
  return (
    <label className="relative mt-6 block max-w-sm">
      <span className="sr-only">Find a cuisine</span>
      <Search
        aria-hidden
        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
      />
      <input
        type="search"
        value={query}
        maxLength={MAX_CITY_QUERY_LENGTH}
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        onChange={(event) => onChange(event.target.value.slice(0, MAX_CITY_QUERY_LENGTH))}
        placeholder="Find a cuisine"
        className="w-full rounded-full border border-white/10 bg-neutral-900 py-2 pl-11 pr-4 text-sm text-white placeholder:text-gray-500 [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-red-500/70"
      />
    </label>
  );
}

function CuisinePill({
  item,
  hidden,
}: {
  readonly item: CuisinePickerItem;
  readonly hidden: boolean;
}): JSX.Element {
  const label = `${item.cuisine} (${item.count})`;
  return (
    <li hidden={hidden} title={item.title}>
      {item.href ? (
        <Link href={item.href} className={PILL}>
          {label}
        </Link>
      ) : (
        <span className={PILL}>{label}</span>
      )}
    </li>
  );
}

export function CuisinePicker({
  items,
}: {
  readonly items: readonly CuisinePickerItem[];
}): JSX.Element {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const matches = useMemo(
    () =>
      filterCuisineNames(
        items.map((item) => item.cuisine),
        query,
      ),
    [items, query],
  );
  const searching = normalizeCityQuery(query).length > 0;
  const collapsible = items.length > COLLAPSED_CUISINE_COUNT;
  const isHidden = (item: CuisinePickerItem, index: number): boolean =>
    searching
      ? !matches.has(item.cuisine)
      : !expanded && collapsible && index >= COLLAPSED_CUISINE_COUNT;

  return (
    <>
      {collapsible && <CuisineSearch query={query} onChange={setQuery} />}
      <ul className="mt-4 flex flex-wrap gap-2">
        {items.map((item, index) => (
          <CuisinePill key={item.cuisine} item={item} hidden={isHidden(item, index)} />
        ))}
      </ul>
      {searching && matches.size === 0 && (
        <p role="status" className="mt-4 text-gray-400">
          No cuisines match &ldquo;{normalizeCityQuery(query)}&rdquo;.
        </p>
      )}
      {collapsible && !searching && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="rainbow-hover mt-4 rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-white/15 focus:outline-none"
        >
          {expanded ? 'Show fewer' : `Show all ${items.length} cuisines`}
        </button>
      )}
    </>
  );
}
