'use client';

import { useState } from 'react';
import { MapPin, X } from 'lucide-react';

export interface ApproximateLocationBannerProps {
  readonly city: string | null;
  readonly onUseLocation: () => Promise<boolean>;
  readonly onDismiss: () => void;
  readonly className?: string;
}

type BannerStatus = 'idle' | 'locating' | 'failed';

export function ApproximateLocationBanner({
  city,
  onUseLocation,
  onDismiss,
  className = '',
}: ApproximateLocationBannerProps): React.JSX.Element {
  const [status, setStatus] = useState<BannerStatus>('idle');

  const handleUseLocation = (): void => {
    setStatus('locating');
    onUseLocation()
      .then((located) => setStatus(located ? 'idle' : 'failed'))
      .catch(() => setStatus('failed'));
  };

  const message =
    status === 'failed'
      ? "Couldn't get your location. Check your browser's location setting."
      : `Trucks near ${city ?? 'your approximate area'}`;

  return (
    <div
      role="status"
      data-testid="approximate-location-banner"
      className={`flex items-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900/90 py-1.5 pl-3 pr-1.5 text-xs text-white shadow-lg backdrop-blur ${className}`}
    >
      <span className="min-w-0 flex-1 leading-tight">{message}</span>
      {status !== 'failed' && (
        <button
          type="button"
          onClick={handleUseLocation}
          disabled={status === 'locating'}
          className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-2.5 py-1 font-semibold text-primary-foreground disabled:opacity-70"
        >
          <MapPin className="h-3 w-3" />
          {status === 'locating' ? 'Locating…' : 'Use my location'}
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded-full p-1 text-zinc-400 hover:text-white"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
