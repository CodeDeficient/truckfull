import Link from '@/components/navigation/IntentLink';
import { Heart } from 'lucide-react';
import type { JSX } from 'react';
import TruckAvatarRing from '@/components/seo/TruckAvatarRing';
import type { CompletenessFlags } from '@/lib/city/truckCompleteness';
import { CompletenessIcons } from '@/components/city/CompletenessIcons';

export interface CityTruckCardData {
  readonly id: string;
  readonly name: string;
  readonly slug: string | null;
  readonly description: string | null;
  readonly cuisine_type: string[] | null;
  readonly photo_url: string | null;
  readonly operating_hours: unknown;
  readonly is_claimed: boolean | null;
}

const DESCRIPTION_MAX = 140;

function truncate(str: string | null, max: number): string {
  if (!str) return '';
  return str.length > max ? `${str.slice(0, max).trimEnd()}...` : str;
}

export interface FavoriteControl {
  readonly active: boolean;
  readonly onToggle: () => void;
}

function FavoriteButton({
  name,
  favorite,
}: {
  readonly name: string;
  readonly favorite: FavoriteControl;
}): JSX.Element {
  return (
    <button
      type="button"
      aria-pressed={favorite.active}
      aria-label={favorite.active ? `Remove ${name} from favorites` : `Add ${name} to favorites`}
      onClick={favorite.onToggle}
      className="rainbow-hover -m-1 shrink-0 self-start rounded-full p-2 text-gray-400 transition-colors hover:text-red-400"
    >
      <Heart
        aria-hidden
        className={`size-5 ${favorite.active ? 'fill-red-500 text-red-500' : ''}`}
      />
    </button>
  );
}

function CuisineChips({ cuisines }: { readonly cuisines: readonly string[] }): JSX.Element {
  return (
    <div className="flex min-h-[1.5rem] flex-wrap gap-1.5">
      {cuisines.map((c) => (
        <span
          key={c}
          className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-gray-200"
        >
          {c}
        </span>
      ))}
    </div>
  );
}

export function CityTruckCard({
  truck,
  flags,
  favorite,
}: {
  readonly truck: CityTruckCardData;
  readonly flags?: CompletenessFlags;
  readonly favorite?: FavoriteControl;
}): JSX.Element {
  const href = `/${truck.slug ?? truck.id}`;
  const cuisines = Array.isArray(truck.cuisine_type) ? truck.cuisine_type.slice(0, 3) : [];
  return (
    <li className="flex h-full gap-4 rounded-xl border border-white/10 bg-neutral-950 p-4 transition-colors hover:border-red-500">
      <TruckAvatarRing
        slug={truck.slug ?? truck.id}
        name={truck.name}
        socialMedia={truck.photo_url ? { photo_url: truck.photo_url } : null}
        operatingHours={truck.operating_hours}
        isClaimed={truck.is_claimed}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start gap-2">
          <Link
            href={href}
            className="line-clamp-2 min-h-[3.5rem] flex-1 font-heading text-lg font-bold leading-7 text-white hover:underline"
          >
            {truck.name}
          </Link>
          {favorite && <FavoriteButton name={truck.name} favorite={favorite} />}
        </div>
        <p className="line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-gray-400">
          {truncate(truck.description, DESCRIPTION_MAX)}
        </p>
        <CuisineChips cuisines={cuisines} />
        {flags && (
          <div className="mt-auto pt-1">
            <CompletenessIcons flags={flags} />
          </div>
        )}
      </div>
    </li>
  );
}
