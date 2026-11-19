// app/admin/pipeline/page.tsx
import { getPipelineStats } from '@/lib/api/pipeline/handlers';
import { PipelineClient } from './_components/PipelineClient';

export const dynamic = 'force-dynamic';

export default async function PipelinePage() {
  const stats = await getPipelineStats().catch(() => ({
    syncLog: [],
    eventCounts: {
      total: 0,
      withCoordinates: 0,
      vetted: 0,
      relevant: 0,
      classified: 0,
      reviewNeeded: 0,
    },
    geocodingFailures: { total: 0, unresolved: 0 },
    recentEvents: [],
  }));

  return <PipelineClient stats={stats} />;
}
