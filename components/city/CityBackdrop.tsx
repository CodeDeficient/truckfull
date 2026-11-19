import type { JSX, ReactNode } from 'react';

const TOP_FADE = 'linear-gradient(to bottom, rgb(0,0,0) 0%, rgba(0,0,0,0.6) 50%, transparent 100%)';
const BOTTOM_FADE =
  'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.85) 70%, rgb(0,0,0) 100%)';
const TEXT_SCRIM = 'radial-gradient(ellipse 65% 55% at 50% 55%, rgba(0,0,0,0.45), transparent 75%)';

export function CityBackdrop({ children }: { readonly children?: ReactNode }): JSX.Element {
  return (
    <>
      <div aria-hidden className="absolute inset-0 bg-neutral-900" />
      {children}
      <div aria-hidden className="absolute inset-0" style={{ background: TEXT_SCRIM }} />
      <div aria-hidden className="absolute inset-x-0 top-0 h-16" style={{ background: TOP_FADE }} />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-24"
        style={{ background: BOTTOM_FADE }}
      />
    </>
  );
}
