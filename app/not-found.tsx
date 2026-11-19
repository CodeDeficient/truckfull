import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import NotFoundMessage from './NotFoundMessage';

export const metadata: Metadata = {
  title: '404 - Page Not Found',
};

export default function NotFound(): ReactElement {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-black">
      <NotFoundMessage />
    </main>
  );
}
