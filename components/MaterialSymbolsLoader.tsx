'use client';

import { useEffect } from 'react';

const MATERIAL_SYMBOLS_URL =
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200';

/**
 * Loads Material Symbols CSS asynchronously after first paint.
 * Prevents a 770ms render-blocking stylesheet request on the critical path.
 * Falls back to <link> via <noscript> in the parent layout for non-JS users.
 */
export function MaterialSymbolsLoader() {
  useEffect(() => {
    if (document.querySelector(`link[href="${MATERIAL_SYMBOLS_URL}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = MATERIAL_SYMBOLS_URL;
    document.head.append(link);
  }, []);

  return null;
}
