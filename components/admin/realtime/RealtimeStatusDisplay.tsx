import { Card, CardContent } from '@/components/ui/card';
import { ConnectionStatusHeader } from './ConnectionStatusHeader';
import { SystemMetricsGrid } from './SystemMetricsGrid';
import { SystemAlerts } from './SystemAlerts';
import { EventControls } from './EventControls';
import { type SystemAlert } from '@/hooks/useSystemAlerts';
import { type StatusMetric } from './useSystemMetrics';

interface RealtimeStatusDisplayProps {
  readonly isConnected: boolean;
  readonly isConnecting: boolean;
  readonly connectionError: string | undefined;
  readonly lastEventTime: Date | undefined;
  readonly connect: () => void;
  readonly disconnect: () => void;
  readonly systemMetrics: StatusMetric[];
  readonly alerts: SystemAlert[];
  readonly showDetails: boolean;
  readonly onToggleDetails: () => void;
  readonly onAcknowledgeAlert: (alertId: string) => void;
  readonly recentEventsCount: number;
  readonly onClearEvents: () => void;
}

/**
 * Displays the realtime status of a connection with various metrics and controls.
 */
export function RealtimeStatusDisplay({
  isConnected,
  isConnecting,
  connectionError,
  lastEventTime,
  connect,
  disconnect,
  systemMetrics,
  alerts,
  showDetails,
  onToggleDetails,
  onAcknowledgeAlert,
  recentEventsCount,
  onClearEvents,
}: RealtimeStatusDisplayProps) {
  return (
    <div className="space-y-4">
      <Card className={`border-l-4 ${isConnected ? 'border-l-green-500' : 'border-l-red-500'}`}>
        <ConnectionStatusHeader
          isConnected={isConnected}
          isConnecting={isConnecting}
          lastEventTime={lastEventTime ? new Date(lastEventTime) : undefined}
          connect={connect}
          disconnect={disconnect}
        />
        <CardContent>
          {connectionError != undefined && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{connectionError}</p>
            </div>
          )}
          <SystemMetricsGrid metrics={systemMetrics} />
          <SystemAlerts
            alerts={alerts}
            showDetails={showDetails}
            onToggleDetails={onToggleDetails}
            onAcknowledgeAlert={onAcknowledgeAlert}
          />
          <EventControls recentEventsCount={recentEventsCount} onClearEvents={onClearEvents} />
        </CardContent>
      </Card>
    </div>
  );
}
