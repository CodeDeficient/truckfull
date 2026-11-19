'use client';

import NextLink from 'next/link';
import {
  useState,
  type ComponentProps,
  type FocusEvent,
  type JSX,
  type MouseEvent,
  type TouchEvent,
} from 'react';

type LinkProps = ComponentProps<typeof NextLink>;
type PrefetchSetting = LinkProps['prefetch'];

export function resolvePrefetch(requested: PrefetchSetting, intent: boolean): PrefetchSetting {
  if (requested === false || !intent) return false;
  return requested ?? null;
}

export default function IntentLink({
  prefetch,
  onMouseEnter,
  onTouchStart,
  onFocus,
  ...rest
}: LinkProps): JSX.Element {
  const [intent, setIntent] = useState(false);
  return (
    <NextLink
      {...rest}
      prefetch={resolvePrefetch(prefetch, intent)}
      onMouseEnter={(event: MouseEvent<HTMLAnchorElement>) => {
        setIntent(true);
        onMouseEnter?.(event);
      }}
      onTouchStart={(event: TouchEvent<HTMLAnchorElement>) => {
        setIntent(true);
        onTouchStart?.(event);
      }}
      onFocus={(event: FocusEvent<HTMLAnchorElement>) => {
        setIntent(true);
        onFocus?.(event);
      }}
    />
  );
}
