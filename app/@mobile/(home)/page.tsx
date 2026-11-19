import type { JSX } from 'react';
import { getHomeInitialData } from '@/lib/server/homeInitialTrucks';
import MobileHome from '../MobileHome';

export const dynamic = 'force-dynamic';

export default async function MobileHomePage(): Promise<JSX.Element> {
  const initialSeed = await getHomeInitialData();
  return <MobileHome initialSeed={initialSeed} />;
}
