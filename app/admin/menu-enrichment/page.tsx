import { fetchEnrichmentData } from '@/lib/services/menuEnrichmentService';
import MenuEnrichmentClient from './MenuEnrichmentClient';

export const metadata = {
  title: 'Menu Enrichment | Admin',
  robots: { index: false, follow: false },
};

export default async function MenuEnrichmentPage() {
  const trucks = await fetchEnrichmentData();

  return <MenuEnrichmentClient initialTrucks={trucks} />;
}
