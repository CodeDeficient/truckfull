'use client';

import * as React from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState<boolean>(false);

  React.useEffect(() => {
    const mediaQueryList = globalThis.matchMedia?.(query);

    if (mediaQueryList) {
      setMatches(mediaQueryList.matches);

      const listener = (event: MediaQueryListEvent) => {
        setMatches(event.matches);
      };

      mediaQueryList.addEventListener('change', listener);
      return () => {
        mediaQueryList.removeEventListener('change', listener);
      };
    }

    return () => {};
  }, [query]);

  return matches;
}
