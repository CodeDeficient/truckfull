import { useEffect } from 'react';

import { getSupabase } from '@/lib/supabase/client';
import type { PipelineEvent } from '@/lib/types';
import { logError, logWarning, logMessage } from '@/lib/logging';

/**
 * Manages event subscriptions for pipeline events using Supabase.
 * @example
 * EventSubscriptionManager()
 * @returns {void} This component serves purely for side-effects of subscription management.
 * @description
 *   - Utilizes the Supabase Realtime Client to subscribe and process "pipeline-events".
 *   - Includes an effect cleanup to unsubscribe from events when the component unmounts.
 *   - Current implementation logs events to the console as placeholders.
 */
type RealtimeChannelStatus = 'SUBSCRIBED' | 'CLOSED' | 'CHANNEL_ERROR' | 'TIMED_OUT';

function EventSubscriptionManager() {
  useEffect(() => {
    const handleEvent = (payload: { new: PipelineEvent }) => {
      try {
        const event = payload.new;
        if (typeof event === 'object' && Boolean(event) && 'type' in event) {
          // Process the event based on its type
          switch (event.type) {
            case 'job_started': {
              logMessage('Job started:', event.metadata);
              break;
            }
            case 'job_completed': {
              logMessage('Job completed:', event.metadata);
              break;
            }
            case 'data_updated': {
              logMessage('Data updated:', event.metadata);
              break;
            }
            default: {
              logWarning('Received unknown event type:', event.type);
            }
          }
        } else {
          logWarning('Received malformed event:', payload);
        }
      } catch (error) {
        logError('Error processing pipeline event:', error);
      }
    };

    const subscription = getSupabase()
      .channel('pipeline-events')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pipeline_events' },
        handleEvent,
      )
      .subscribe((status: RealtimeChannelStatus, error?: Error) => {
        if (status === 'SUBSCRIBED') {
          logMessage('Successfully subscribed to pipeline events.');
        }
        if (status === 'CHANNEL_ERROR' && error) {
          logError('Pipeline event subscription error:', error);
        }
      });

    return () => {
      getSupabase().realtime.removeChannel(subscription);
    };
  }, []);
}

export default EventSubscriptionManager;
