import { subscribePageToFeed, getPageSubscriptionStatus } from '@/lib/facebook/pageSubscriptions';
import { hasAllRequiredBusinessScopes } from '@/lib/facebook/businessOAuth';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface ConnectAndSubscribeResult {
  subscribed: boolean;
  subscribedFields: string[];
  error?: string;
}

export async function connectPageAndSubscribe(args: {
  pageId: string;
  pageAccessToken: string;
  appId: string;
}): Promise<ConnectAndSubscribeResult> {
  try {
    await subscribePageToFeed({
      pageId: args.pageId,
      pageAccessToken: args.pageAccessToken,
    });
  } catch (error) {
    return {
      subscribed: false,
      subscribedFields: [],
      error: error instanceof Error ? error.message : 'unknown_error',
    };
  }

  try {
    const apps = await getPageSubscriptionStatus({
      pageId: args.pageId,
      pageAccessToken: args.pageAccessToken,
    });

    const ourApp = apps.find((app) => app.id === args.appId);

    if (!ourApp) {
      return { subscribed: false, subscribedFields: [] };
    }

    return {
      subscribed: ourApp.subscribedFields.includes('feed'),
      subscribedFields: ourApp.subscribedFields,
    };
  } catch (error) {
    return {
      subscribed: false,
      subscribedFields: [],
      error: error instanceof Error ? error.message : 'unknown_error',
    };
  }
}

export interface UpdateWebhookStateResult {
  success: boolean;
  conflict: boolean;
  error: string | null;
}

export async function updateWebhookState(
  supabase: SupabaseClient,
  truckId: string,
  userId: string,
  enabled: boolean,
): Promise<UpdateWebhookStateResult> {
  const { data: updatedTruck, error: updateError } = await supabase.rpc(
    'set_food_truck_facebook_auto_updates',
    {
      p_truck_id: truckId,
      p_owner_id: userId,
      p_enabled: enabled,
    },
  );

  if (updateError) {
    return { success: false, conflict: false, error: 'Failed to update webhook sync' };
  }

  if (!updatedTruck) {
    return { success: false, conflict: true, error: null };
  }

  return { success: true, conflict: false, error: null };
}

export function checkBusinessTokenScopes(grantedScopes: string[]): {
  valid: boolean;
  missing: string[];
} {
  return hasAllRequiredBusinessScopes(grantedScopes);
}
