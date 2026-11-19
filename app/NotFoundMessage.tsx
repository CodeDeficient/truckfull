'use client';

import Link from '@/components/navigation/IntentLink';
import { usePathname } from 'next/navigation';
import type { ReactElement } from 'react';
import { getNotFoundCopy } from '@/lib/seo/notFoundCopy';

export default function NotFoundMessage(): ReactElement {
  const copy = getNotFoundCopy(usePathname());
  return (
    <div className="max-w-md text-center">
      <h1 className="text-6xl font-bold text-gray-900 dark:text-white">404</h1>
      <h2 className="mt-4 text-xl font-semibold text-gray-700 dark:text-gray-300">{copy.heading}</h2>
      <p className="mt-2 text-gray-500 dark:text-gray-400">{copy.body}</p>
      <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href={copy.primary.href}
          className="inline-block rounded-lg bg-orange-500 px-6 py-3 text-white hover:bg-orange-600"
        >
          {copy.primary.label}
        </Link>
        {copy.secondary ? (
          <Link
            href={copy.secondary.href}
            className="inline-block rounded-lg border border-gray-300 px-6 py-3 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900"
          >
            {copy.secondary.label}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
