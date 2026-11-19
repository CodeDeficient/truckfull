'use client';

import dynamic from 'next/dynamic';
import Link from '@/components/navigation/IntentLink';
import { usePathname } from 'next/navigation';
import type { JSX } from 'react';
import { useAuth } from '@/app/auth/AuthProvider';
import { AvatarMenu } from '@/components/auth';

const SettingsModal = dynamic(
  () => import('@/components/settings/SettingsModal').then((m) => ({ default: m.SettingsModal })),
  { ssr: false },
);
const ProfileModal = dynamic(
  () => import('@/components/profile/ProfileModal').then((m) => ({ default: m.ProfileModal })),
  { ssr: false },
);

const SIGN_IN =
  'rainbow-hover inline-flex h-8 items-center rounded-full bg-red-500/15 px-4 text-sm font-semibold text-red-300 transition-colors hover:text-white focus:outline-none';

export function HeaderAuth(): JSX.Element {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  if (loading) return <span aria-hidden className="size-8 rounded-full bg-white/10" />;
  if (user) {
    return (
      <>
        <AvatarMenu user={user} />
        <SettingsModal />
        <ProfileModal />
      </>
    );
  }
  return (
    <Link href={`/?auth=open&returnTo=${encodeURIComponent(pathname)}`} className={SIGN_IN}>
      Sign In
    </Link>
  );
}
