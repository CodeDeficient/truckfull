'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type JSX, type RefObject } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useFavorites } from '@/hooks/useFavorites';
import {
  CityTruckCard,
  type CityTruckCardData,
  type FavoriteControl,
} from '@/components/city/CityTruckCard';
import {
  COMPLETENESS_ICONS,
  COMPLETENESS_LABELS,
  COMPLETENESS_TONES,
} from '@/components/city/CompletenessIcons';
import {
  COMPLETENESS_KEYS,
  completenessScore,
  matchesAll,
  type CompletenessFlags,
  type CompletenessKey,
} from '@/lib/city/truckCompleteness';
import { BOOK_DIRECT_HASH } from '@/lib/city/cityGuide';

export interface DirectoryTruck {
  readonly truck: CityTruckCardData;
  readonly flags: CompletenessFlags;
}

type SortMode = 'complete' | 'name';

const PAGE_SIZE = 24;

const CHIP_BASE =
  'rainbow-hover inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors focus:outline-none';
const CHIP_OFF = 'bg-white/10 text-white hover:bg-white/15';
const CONTROL =
  'rainbow-hover rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold text-white focus:outline-none disabled:opacity-40';

function sortTrucks(trucks: readonly DirectoryTruck[], mode: SortMode): DirectoryTruck[] {
  const copy = [...trucks];
  if (mode === 'name') return copy.sort((a, b) => a.truck.name.localeCompare(b.truck.name));
  return copy.sort((a, b) => completenessScore(b.flags) - completenessScore(a.flags));
}

function FilterChips({
  required,
  onToggle,
}: {
  readonly required: ReadonlySet<CompletenessKey>;
  readonly onToggle: (key: CompletenessKey) => void;
}): JSX.Element {
  return (
    <div role="group" aria-label="Show trucks with" className="flex flex-wrap gap-2">
      {COMPLETENESS_KEYS.map((key) => {
        const Icon = COMPLETENESS_ICONS[key];
        const on = required.has(key);
        const tone = COMPLETENESS_TONES[key];
        return (
          <button
            key={key}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(key)}
            className={`${CHIP_BASE} ${on ? tone.on : CHIP_OFF}`}
          >
            <Icon aria-hidden className={`size-4 ${on ? '' : tone.icon}`} />
            {COMPLETENESS_LABELS[key]}
          </button>
        );
      })}
    </div>
  );
}

function Pager({
  page,
  pageCount,
  onPage,
}: {
  readonly page: number;
  readonly pageCount: number;
  readonly onPage: (page: number) => void;
}): JSX.Element | null {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Pages" className="mt-8 flex items-center justify-center gap-4">
      <button
        type="button"
        className={CONTROL}
        disabled={page === 0}
        onClick={() => onPage(page - 1)}
      >
        Previous
      </button>
      <span className="text-sm text-gray-400">
        Page {page + 1} of {pageCount}
      </span>
      <button
        type="button"
        className={CONTROL}
        disabled={page >= pageCount - 1}
        onClick={() => onPage(page + 1)}
      >
        Next
      </button>
    </nav>
  );
}

interface DirectoryState {
  readonly required: ReadonlySet<CompletenessKey>;
  readonly sort: SortMode;
  readonly page: number;
  readonly setPage: (page: number) => void;
  readonly visible: DirectoryTruck[];
  readonly toggle: (key: CompletenessKey) => void;
  readonly changeSort: (mode: SortMode) => void;
  readonly requireOnly: (key: CompletenessKey) => void;
}

function useDirectoryState(trucks: readonly DirectoryTruck[]): DirectoryState {
  const [required, setRequired] = useState<ReadonlySet<CompletenessKey>>(new Set());
  const [sort, setSort] = useState<SortMode>('complete');
  const [page, setPage] = useState(0);
  const visible = useMemo(
    () =>
      sortTrucks(
        trucks.filter((t) => matchesAll(t.flags, required)),
        sort,
      ),
    [trucks, required, sort],
  );
  const toggle = (key: CompletenessKey): void => {
    const next = new Set(required);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setRequired(next);
    setPage(0);
  };
  const changeSort = (mode: SortMode): void => {
    setSort(mode);
    setPage(0);
  };
  const requireOnly = useCallback((key: CompletenessKey): void => {
    setRequired(new Set([key]));
    setPage(0);
  }, []);
  return { required, sort, page, setPage, visible, toggle, changeSort, requireOnly };
}

function showingText(shown: number, matching: number, total: number): string {
  if (matching === total) return `Showing ${shown} of ${total} listings`;
  return `Showing ${shown} of ${matching} matching listings (${total} total)`;
}

function SortSelect({
  sort,
  onChange,
}: {
  readonly sort: SortMode;
  readonly onChange: (mode: SortMode) => void;
}): JSX.Element {
  return (
    <label className="flex items-center gap-2">
      Sort by
      <select
        value={sort}
        onChange={(e) => onChange(e.target.value === 'name' ? 'name' : 'complete')}
        className="rounded-full border-0 bg-neutral-900 [color-scheme:dark] px-3 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-red-500/70"
      >
        <option value="complete" className="bg-neutral-900 text-white">
          Most details first
        </option>
        <option value="name" className="bg-neutral-900 text-white">
          Name (A to Z)
        </option>
      </select>
    </label>
  );
}

function useBookDirectLink(
  requireOnly: (key: CompletenessKey) => void,
  topRef: RefObject<HTMLDivElement | null>,
): void {
  useEffect(() => {
    const apply = (): void => {
      if (globalThis.location.hash !== BOOK_DIRECT_HASH) return;
      requireOnly('phone');
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    apply();
    globalThis.addEventListener('hashchange', apply);
    return () => globalThis.removeEventListener('hashchange', apply);
  }, [requireOnly, topRef]);
}

function useFavoriteControl(): (truckId: string) => FavoriteControl {
  const { isFavorited, toggleFavorite, isAuthenticated } = useFavorites();
  const router = useRouter();
  const pathname = usePathname();
  return (truckId) => ({
    active: isFavorited(truckId),
    onToggle: () => {
      if (!isAuthenticated) {
        router.push(`/?auth=open&returnTo=${encodeURIComponent(pathname)}`);
        return;
      }
      void toggleFavorite(truckId);
    },
  });
}

export function CityTruckDirectory({
  title,
  trucks,
}: {
  readonly title: string;
  readonly trucks: readonly DirectoryTruck[];
}): JSX.Element {
  const { required, sort, page, setPage, visible, toggle, changeSort, requireOnly } =
    useDirectoryState(trucks);
  const favoriteFor = useFavoriteControl();
  const topRef = useRef<HTMLDivElement>(null);
  useBookDirectLink(requireOnly, topRef);
  const pageCount = Math.ceil(visible.length / PAGE_SIZE);
  const shown = visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const goTo = (next: number): void => {
    setPage(next);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="py-10">
      <div ref={topRef} className="mx-auto max-w-5xl scroll-mt-20 px-6 sm:px-10">
        <h2 className="font-heading text-3xl font-bold text-white sm:text-4xl">{title}</h2>
        <div className="mt-6 flex flex-col gap-4">
          <FilterChips required={required} onToggle={toggle} />
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-400">
            <p aria-live="polite">{showingText(shown.length, visible.length, trucks.length)}</p>
            <SortSelect sort={sort} onChange={changeSort} />
          </div>
        </div>
        {shown.length === 0 ? (
          <p className="mt-8 text-gray-400">No trucks match all of those filters yet.</p>
        ) : (
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {shown.map(({ truck, flags }) => (
              <CityTruckCard
                key={truck.id}
                truck={truck}
                flags={flags}
                favorite={favoriteFor(truck.id)}
              />
            ))}
          </ul>
        )}
        <Pager page={page} pageCount={pageCount} onPage={goTo} />
      </div>
    </section>
  );
}
