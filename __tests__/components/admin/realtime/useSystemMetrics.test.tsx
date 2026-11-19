import { jest } from '@jest/globals';
import { Wifi, WifiOff, Server, Database } from 'lucide-react';

jest.unstable_mockModule('lucide-react', () => ({
  Wifi: (props: any) => React.createElement('span', { 'data-testid': 'wifi-icon', ...props }),
  WifiOff: (props: any) => React.createElement('span', { 'data-testid': 'wifi-off-icon', ...props }),
  Server: (props: any) => React.createElement('span', { 'data-testid': 'server-icon', ...props }),
  Database: (props: any) => React.createElement('span', { 'data-testid': 'database-icon', ...props }),
}));

const { useSystemMetrics } = await import('@/components/admin/realtime/useSystemMetrics');

import React from 'react';

describe('useSystemMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns array of StatusMetric objects', () => {
    const metrics = useSystemMetrics({
      isConnected: true,
      isConnecting: false,
    });
    expect(Array.isArray(metrics)).toBe(true);
    expect(metrics.length).toBe(3);
  });

  it('returns connection status metric', () => {
    const metrics = useSystemMetrics({
      isConnected: true,
      isConnecting: false,
    });
    expect(metrics[0].label).toBe('Connection Status');
    expect(metrics[0].value).toBe('Connected');
    expect(metrics[0].status).toBe('healthy');
  });

  it('returns connecting status when isConnecting is true', () => {
    const metrics = useSystemMetrics({
      isConnected: false,
      isConnecting: true,
    });
    expect(metrics[0].value).toBe('Connecting...');
  });

  it('returns disconnected status when not connected', () => {
    const metrics = useSystemMetrics({
      isConnected: false,
      isConnecting: false,
    });
    expect(metrics[0].value).toBe('Disconnected');
  });

  it('returns error status when connectionError is present', () => {
    const metrics = useSystemMetrics({
      isConnected: false,
      isConnecting: false,
      connectionError: 'Network timeout',
    });
    expect(metrics[0].status).toBe('error');
  });

  it('returns system health metric', () => {
    const metrics = useSystemMetrics({
      isConnected: true,
      isConnecting: false,
      latestMetrics: { error_rate: 0.02 },
    });
    expect(metrics[1].label).toBe('System Health');
    expect(metrics[1].status).toBe('healthy');
  });

  it('returns warning status for 5-10% error rate', () => {
    const metrics = useSystemMetrics({
      isConnected: true,
      isConnecting: false,
      latestMetrics: { error_rate: 0.07 },
    });
    expect(metrics[1].status).toBe('warning');
  });

  it('returns error status for >10% error rate', () => {
    const metrics = useSystemMetrics({
      isConnected: true,
      isConnecting: false,
      latestMetrics: { error_rate: 0.15 },
    });
    expect(metrics[1].status).toBe('error');
  });

  it('returns response time metric', () => {
    const metrics = useSystemMetrics({
      isConnected: true,
      isConnecting: false,
      latestMetrics: { avg_response_time_ms: 120 },
    });
    expect(metrics[2].label).toBe('Avg Response Time');
    expect(metrics[2].value).toBe(120);
    expect(metrics[2].unit).toBe('ms');
  });

  it('returns healthy status for <500ms response time', () => {
    const metrics = useSystemMetrics({
      isConnected: true,
      isConnecting: false,
      latestMetrics: { avg_response_time_ms: 300 },
    });
    expect(metrics[2].status).toBe('healthy');
  });

  it('returns warning status for 500-1000ms response time', () => {
    const metrics = useSystemMetrics({
      isConnected: true,
      isConnecting: false,
      latestMetrics: { avg_response_time_ms: 750 },
    });
    expect(metrics[2].status).toBe('warning');
  });

  it('returns error status for >1000ms response time', () => {
    const metrics = useSystemMetrics({
      isConnected: true,
      isConnecting: false,
      latestMetrics: { avg_response_time_ms: 1500 },
    });
    expect(metrics[2].status).toBe('error');
  });

  it('handles undefined latestMetrics', () => {
    const metrics = useSystemMetrics({
      isConnected: true,
      isConnecting: false,
    });
    expect(metrics[1].status).toBe('healthy');
    expect(metrics[2].value).toBe(0);
  });
});
