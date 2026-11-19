import { Wifi, WifiOff, Server, Database } from 'lucide-react';
import type { RealtimeMetrics } from '@/lib/types';

export interface StatusMetric {
  label: string;
  value: number | string;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  icon: React.ReactNode;
}

/**
 * Returns a connection status metric object based on connection parameters.
 * @example
 * getConnectionStatusMetric(true, false, 'Network error')
 * { label: 'Connection Status', value: 'Connected', status: 'healthy', icon: <Wifi className="size-4" /> }
 * @param {boolean} isConnected - Indicates if the system is currently connected.
 * @param {boolean} isConnecting - Indicates if the system is in the process of connecting.
 * @param {string} [connectionError] - Optional error message if a connection attempt failed.
 * @returns {StatusMetric} An object containing label, value, status, and icon related to connection status.
 * @description
 *   - The status property is determined by both connection state and presence of connection error.
 *   - Automatically selects an icon based on connection status.
 */
function getConnectionStatusMetric(
  isConnected: boolean,
  isConnecting: boolean,
  connectionError?: string,
): StatusMetric {
  return {
    label: 'Connection Status',
    value: (() => {
      if (isConnected) return 'Connected';
      if (isConnecting) return 'Connecting...';
      return 'Disconnected';
    })(),
    status: (() => {
      if (isConnected) return 'healthy';
      if (connectionError != undefined) return 'error';
      return 'healthy';
    })(),
    icon: isConnected ? <Wifi className="size-4" /> : <WifiOff className="size-4" />,
  };
}

/**
 * Retrieves the system health metric based on the latest metrics provided.
 * @example
 * getSystemHealthMetric({ error_rate: 0.05 })
 * Returns: { label: 'System Health', value: 'healthy', status: 'healthy', icon: JSX.Element }
 * @param {RealtimeMetrics} [latestMetrics] - The latest metrics object containing system health information.
 * @returns {StatusMetric} An object containing the system health status, label, value, and icon.
 * @description
 *   - Determines status based on error_rate with thresholds: 'healthy' < 5%, 'warning' < 10%, 'error' >= 10%.
 *   - Uses a Server icon component for representation.
 */
function getSystemHealthMetric(latestMetrics?: RealtimeMetrics): StatusMetric {
  const errorRate = latestMetrics?.error_rate ?? 0;
  return {
    label: 'System Health',
    value: errorRate < 0.05 ? 'healthy' : errorRate < 0.1 ? 'warning' : 'error',
    status: errorRate < 0.05 ? 'healthy' : errorRate < 0.1 ? 'warning' : 'error',
    icon: <Server className="size-4" />,
  };
}

/**
 * Retrieves the average response time metric from the latest metrics.
 * @example
 * getResponseTimeMetric({ avg_response_time_ms: 120 })
 * { label: 'Avg Response Time', value: 120, unit: 'ms', status: 'healthy', icon: <Database className="size-4" /> }
 * @param {RealtimeMetrics} [latestMetrics] - The latest metrics containing response time information.
 * @returns {StatusMetric} An object representing the response time metric.
 * @description
 *   - Calculates status based on average response time: 'healthy' < 500ms, 'warning' < 1000ms, 'error' >= 1000ms.
 *   - Uses default values (0 for response time) if metrics are not provided.
 */
function getResponseTimeMetric(latestMetrics?: RealtimeMetrics): StatusMetric {
  const responseTime = latestMetrics?.avg_response_time_ms ?? 0;
  return {
    label: 'Avg Response Time',
    value: responseTime,
    unit: 'ms',
    status: (() => {
      if (responseTime < 500) return 'healthy';
      if (responseTime < 1000) return 'warning';
      return 'error';
    })(),
    icon: <Database className="size-4" />,
  };
}

/**
 * Computes system metrics based on connection status and latest data.
 * @example
 * useSystemMetrics({
 *   isConnected: true,
 *   isConnecting: false,
 *   connectionError: "Timeout",
 *   latestMetrics: { active_connections: 10, events_per_second: 5, avg_response_time_ms: 120, error_rate: 0.02 }
 * })
 * [StatusMetric, StatusMetric, StatusMetric]
 * @param {Readonly<Object>} args -
 *        An object containing connection status and latest metrics.
 * @param {boolean} args.isConnected - Indicates if the system is currently connected.
 * @param {boolean} args.isConnecting - Indicates if the system is in the process of connecting.
 * @param {string} [args.connectionError] - Describes any connection error if present.
 * @param {RealtimeMetrics} [args.latestMetrics] - Contains the latest metrics data of the system.
 * @returns {StatusMetric[]} An array of StatusMetric objects representing various system statuses.
 * @description
 *   - Combines multiple metrics in one unified representation.
 *   - The function is geared towards providing real-time dashboards with actionable insights.
 *   - Utilizes helper functions to compute individual metrics like connection status, system health, response time.
 *   - Intended for use in admin dashboards within a real-time data monitoring context.
 */
export function useSystemMetrics({
  isConnected,
  isConnecting,
  connectionError,
  latestMetrics,
}: Readonly<{
  isConnected: boolean;
  isConnecting: boolean;
  connectionError?: string;
  latestMetrics?: RealtimeMetrics;
}>): StatusMetric[] {
  return [
    getConnectionStatusMetric(isConnected, isConnecting, connectionError),
    getSystemHealthMetric(latestMetrics),
    getResponseTimeMetric(latestMetrics),
  ];
}
