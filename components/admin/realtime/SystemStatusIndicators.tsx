import React, { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { logError } from '@/lib/logging';

type RealtimeChannelStatus = 'SUBSCRIBED' | 'CLOSED' | 'CHANNEL_ERROR' | 'TIMED_OUT';

interface SystemStatusResponse {
  status: string;
  data: {
    status: string;
  };
}

/**
 * Represents system status indicators in real-time
 * @example
 * SystemStatusIndicators()
 * <div><h3>Current System Status:</h3><span>ONLINE</span></div>
 * @returns {JSX.Element} A JSX element displaying the current system status.
 * @description
 *   - Utilizes Supabase Realtime Client for subscribing to system status updates.
 *   - Updates the display with the latest system status retrieved from a realtime database.
 *   - Handles subscription clean-up on component unmount to avoid memory leaks.
 */
function SystemStatusIndicators() {
  const [systemStatus, setSystemStatus] = useState('UNKNOWN');

  useEffect(() => {
    const subscription = getSupabase()
      .realtime.channel('system-status')
      .subscribe((status: RealtimeChannelStatus, payload: unknown) => {
        if (status === 'SUBSCRIBED') {
          const response = payload as SystemStatusResponse;
          if (typeof response === 'object' && Boolean(response) && 'status' in response) {
            const typedResponse = response;
            const responseStatus = typedResponse.status; // Extract status to a variable

            if (typeof responseStatus === 'string' && responseStatus === 'success') {
              if (typeof typedResponse.data === 'object' && 'status' in typedResponse.data) {
                setSystemStatus(typedResponse.data.status);
              } else {
                logError('Invalid data structure in system status response');
              }
            } else {
              logError('Failed to retrieve system status or invalid response format');
            }
          } else {
            logError('Failed to retrieve system status or invalid response format');
          }
        }
      });

    return () => {
      getSupabase().realtime.removeChannel(subscription);
    };
  }, []);

  return (
    <div>
      <h3>Current System Status:</h3>
      <span>{systemStatus}</span>
    </div>
  );
}

export default SystemStatusIndicators;
