import { FACEBOOK_GRAPH_API_VERSION } from '@/lib/facebook/constants';
import { EXTERNAL_API_TIMEOUT_MS } from '@/lib/supabase/fetchWithTimeout';

interface GraphSuccessResponse {
  success?: boolean | string;
}

interface GraphErrorResponse {
  error?: {
    message?: string;
    code?: number;
  };
}

export interface PageSubscriptionSuccess {
  success: true;
}

function buildSubscribedAppsUrl(pageId: string): URL {
  return new URL(
    `https://graph.facebook.com/${FACEBOOK_GRAPH_API_VERSION}/${pageId}/subscribed_apps`,
  );
}

async function parseGraphResponse(response: Response): Promise<PageSubscriptionSuccess> {
  const data = (await response.json().catch(() => ({}))) as
    | GraphSuccessResponse
    | GraphErrorResponse;

  if (!response.ok || 'error' in data) {
    const message = 'error' in data ? data.error?.message : undefined;
    throw new Error(message ?? `facebook_graph_request_failed:${response.status}`);
  }

  if (!('success' in data) || (data.success !== true && data.success !== 'true')) {
    throw new Error('facebook_graph_request_failed:missing_success');
  }

  return { success: true };
}

export interface SubscribedApp {
  id: string;
  name: string;
  subscribedFields: string[];
}

export async function getPageSubscriptionStatus(args: {
  pageId: string;
  pageAccessToken: string;
}): Promise<SubscribedApp[]> {
  const url = buildSubscribedAppsUrl(args.pageId);
  url.searchParams.set('fields', 'id,name,subscribed_fields');
  url.searchParams.set('access_token', args.pageAccessToken);

  const response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(EXTERNAL_API_TIMEOUT_MS),
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as GraphErrorResponse;
    const message = data.error?.message;
    throw new Error(message ?? `facebook_graph_request_failed:${response.status}`);
  }

  const data = (await response.json()) as {
    data?: Array<{ id: string; name: string; subscribed_fields?: string[] }>;
  };

  if (!data.data) {
    return [];
  }

  return data.data.map((app) => ({
    id: app.id,
    name: app.name,
    subscribedFields: app.subscribed_fields ?? [],
  }));
}

export async function subscribePageToFeed(args: {
  pageId: string;
  pageAccessToken: string;
}): Promise<PageSubscriptionSuccess> {
  const url = buildSubscribedAppsUrl(args.pageId);
  url.searchParams.set('subscribed_fields', 'feed');
  url.searchParams.set('access_token', args.pageAccessToken);

  const response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(EXTERNAL_API_TIMEOUT_MS),
    method: 'POST',
    headers: { Accept: 'application/json' },
  });

  return parseGraphResponse(response);
}

export async function unsubscribeAppFromPage(args: {
  pageId: string;
  pageAccessToken: string;
}): Promise<PageSubscriptionSuccess> {
  const url = buildSubscribedAppsUrl(args.pageId);
  url.searchParams.set('access_token', args.pageAccessToken);

  const response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(EXTERNAL_API_TIMEOUT_MS),
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });

  return parseGraphResponse(response);
}
