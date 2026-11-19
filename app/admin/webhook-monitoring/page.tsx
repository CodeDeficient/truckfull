import { getWebhookStats } from '@/lib/analytics/webhookStats';
import { WebhookMonitoringClient } from './_components/WebhookMonitoringClient';

export const dynamic = 'force-dynamic';

export default async function WebhookMonitoringPage() {
  const stats = await getWebhookStats('24h').catch(() => ({
    totalReceived: 0,
    parseSuccess: 0,
    parseFailed: 0,
    avgAccuracy: 0,
    avgLatency: 0,
    modelPerformance: [],
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Webhook Monitoring</h1>
      </div>
      <WebhookMonitoringClient initialStats={stats} />
    </div>
  );
}
