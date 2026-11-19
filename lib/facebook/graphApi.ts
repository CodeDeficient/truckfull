/**
 * Facebook Graph API integration for fetching user's managed pages
 * @module lib/facebook/graphApi
 */

import { FACEBOOK_GRAPH_API_VERSION } from '@/lib/facebook/constants';
import { logError, logMessage } from '@/lib/logging';
import { EXTERNAL_API_TIMEOUT_MS } from '@/lib/supabase/fetchWithTimeout';

interface CacheEntry<T> {
  result: T;
  expiresAt: number;
}

const PAGE_DETAILS_CACHE_TTL_MS = 30 * 60 * 1000;
const POSTS_CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_SIZE = 1000;

const pageDetailsCache = new Map<string, CacheEntry<FacebookPage>>();
const postsCache = new Map<
  string,
  CacheEntry<
    Array<{
      id: string;
      message?: string;
      created_time: string;
      full_picture?: string;
      permalink_url?: string;
      attachments?: unknown;
    }>
  >
>();

function setCache<T>(cache: Map<string, CacheEntry<T>>, key: string, result: T, ttl: number): void {
  if (cache.size >= CACHE_MAX_SIZE) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, {
    result,
    expiresAt: Date.now() + ttl,
  });
}

function getCached<T>(cache: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.result;
}

function invalidateCache<T>(cache: Map<string, CacheEntry<T>>, key: string): void {
  cache.delete(key);
}

/**
 * Represents a Facebook Page that a user manages
 */
export interface FacebookPage {
  id: string;
  name: string;
  category: string;
  access_token: string;
  permalink_url?: string;
  username?: string;
  followers_count?: number;
}

/**
 * Response from Facebook Graph API for user accounts/pages
 */
interface FacebookPagesResponse {
  data: Array<{
    id: string;
    name: string;
    category: string;
    access_token: string;
    permalink_url?: string;
    username?: string;
  }>;
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
    next?: string;
  };
}

/**
 * Fetches all Facebook Pages that a user manages
 * @param accessToken - Facebook user access token with pages_manage_pages permission
 * @param userId - Facebook user ID (use 'me' for current user)
 * @returns Array of FacebookPage objects
 * @throws Error if API call fails or access token is invalid
 *
 * @example
 * const pages = await getUserFacebookPages('EAAB...');
 * pages.forEach(page => {
 *   console.log(`Page: ${page.name}, ID: ${page.id}`);
 * });
 */
export async function getUserFacebookPages(
  accessToken: string,
  userId: string = 'me',
): Promise<FacebookPage[]> {
  if (!accessToken?.trim()) {
    throw new Error('Access token is required');
  }

  const baseUrl = `https://graph.facebook.com/${FACEBOOK_GRAPH_API_VERSION}`;
  const fields = ['id', 'name', 'category', 'access_token', 'permalink_url', 'username'].join(',');

  const url = new URL(`${baseUrl}/${userId}/accounts`);
  url.searchParams.set('access_token', accessToken);
  url.searchParams.set('fields', fields);
  url.searchParams.set('limit', '100');

  try {
    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(EXTERNAL_API_TIMEOUT_MS),
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Facebook Graph API error: ${response.status} - ${errorData.error?.message ?? 'Unknown error'}`,
      );
    }

    const data: FacebookPagesResponse = await response.json();
    const pages: FacebookPage[] = data.data.map((page) => ({
      id: page.id,
      name: page.name,
      category: page.category,
      access_token: page.access_token,
      permalink_url: page.permalink_url,
      username: page.username,
    }));

    let nextUrl = data.paging?.next;
    while (nextUrl && pages.length < 500) {
      const nextResponse = await fetch(nextUrl, {
        signal: AbortSignal.timeout(EXTERNAL_API_TIMEOUT_MS),
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!nextResponse.ok) {
        logError('Failed to fetch next page of Facebook pages:', nextResponse.statusText);
        break;
      }

      const nextData: FacebookPagesResponse = await nextResponse.json();
      pages.push(
        ...nextData.data.map((page) => ({
          id: page.id,
          name: page.name,
          category: page.category,
          access_token: page.access_token,
          permalink_url: page.permalink_url,
          username: page.username,
        })),
      );

      nextUrl = nextData.paging?.next;
    }

    logMessage(`Successfully fetched ${pages.length} Facebook pages for user ${userId}`);
    return pages;
  } catch (error) {
    logError('Error fetching Facebook pages:', error);
    throw error;
  }
}

/**
 * Fetches detailed information about a specific Facebook Page
 * @param pageId - Facebook Page ID
 * @param accessToken - Page access token
 * @returns FacebookPage object with detailed information
 * @throws Error if API call fails
 */
export async function getPageDetails(pageId: string, accessToken: string): Promise<FacebookPage> {
  const baseUrl = `https://graph.facebook.com/${FACEBOOK_GRAPH_API_VERSION}`;
  const fields = [
    'id',
    'name',
    'category',
    'access_token',
    'permalink_url',
    'username',
    'followers_count',
    'about',
    'description',
    'website',
    'phone',
    'location',
  ].join(',');

  const url = new URL(`${baseUrl}/${pageId}`);
  url.searchParams.set('access_token', accessToken);
  url.searchParams.set('fields', fields);

  try {
    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(EXTERNAL_API_TIMEOUT_MS),
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Facebook Graph API error: ${response.status} - ${errorData.error?.message ?? 'Unknown error'}`,
      );
    }

    const data = await response.json();
    return {
      id: data.id,
      name: data.name,
      category: data.category,
      access_token: data.access_token,
      permalink_url: data.permalink_url,
      username: data.username,
      followers_count: data.followers_count,
    };
  } catch (error) {
    logError(`Error fetching details for Facebook page ${pageId}:`, error);
    throw error;
  }
}

/**
 * Validates a Facebook access token and returns its metadata
 * @param accessToken - Facebook access token to validate
 * @param appId - Facebook Auth App ID (optional, defaults to FACEBOOK_AUTH_APP_ID env var)
 * @param appSecret - Facebook Auth App Secret (optional, defaults to FACEBOOK_AUTH_APP_SECRET env var)
 * @returns Token metadata including user ID, app ID, and expiration
 * @throws Error if token is invalid or app credentials are missing
 */
export async function validateAccessToken(
  accessToken: string,
  appId?: string,
  appSecret?: string,
): Promise<{
  userId: string;
  appId: string;
  expiresAt: string;
  isValid: boolean;
}> {
  const baseUrl = `https://graph.facebook.com/${FACEBOOK_GRAPH_API_VERSION}`;
  const url = new URL(`${baseUrl}/debug_token`);
  url.searchParams.set('input_token', accessToken);

  const usedAppId = appId ?? globalThis.process?.env?.FACEBOOK_AUTH_APP_ID;
  const usedAppSecret = appSecret ?? globalThis.process?.env?.FACEBOOK_AUTH_APP_SECRET;

  if (!usedAppId || !usedAppSecret) {
    throw new Error('Facebook App ID and Secret are required for token validation');
  }

  const appAccessToken = `${usedAppId}|${usedAppSecret}`;
  url.searchParams.set('access_token', appAccessToken);

  try {
    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(EXTERNAL_API_TIMEOUT_MS),
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Token validation failed: ${response.status}`);
    }

    const data = await response.json();
    const tokenData = data.data;

    return {
      userId: tokenData.user_id,
      appId: tokenData.app_id,
      expiresAt: tokenData.expires_at
        ? new Date(tokenData.expires_at * 1000).toISOString()
        : 'never',
      isValid: tokenData.is_valid,
    };
  } catch (error) {
    logError('Error validating Facebook access token:', error);
    throw error;
  }
}

/**
 * Fetches Facebook posts from a page (for menu/status extraction)
 * @param pageId - Facebook Page ID
 * @param accessToken - Page access token
 * @param limit - Number of posts to fetch (default: 10)
 * @returns Array of posts with message, created_time, and attachments
 */
export async function getPagePosts(
  pageId: string,
  accessToken: string,
  limit: number = 10,
): Promise<
  Array<{
    id: string;
    message?: string;
    created_time: string;
    full_picture?: string;
    permalink_url?: string;
    attachments?: unknown;
  }>
> {
  const baseUrl = `https://graph.facebook.com/${FACEBOOK_GRAPH_API_VERSION}`;
  const fields = [
    'id',
    'message',
    'created_time',
    'full_picture',
    'permalink_url',
    'attachments',
  ].join(',');

  const url = new URL(`${baseUrl}/${pageId}/posts`);
  url.searchParams.set('access_token', accessToken);
  url.searchParams.set('fields', fields);
  url.searchParams.set('limit', limit.toString());

  try {
    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(EXTERNAL_API_TIMEOUT_MS),
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Facebook Graph API error: ${response.status} - ${errorData.error?.message ?? 'Unknown error'}`,
      );
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    logError(`Error fetching posts for Facebook page ${pageId}:`, error);
    throw error;
  }
}

export function getCachedPageDetails(pageId: string): FacebookPage | undefined {
  return getCached(pageDetailsCache, pageId);
}

export function cachePageDetails(
  pageId: string,
  page: FacebookPage,
  ttlMs: number = PAGE_DETAILS_CACHE_TTL_MS,
): void {
  setCache(pageDetailsCache, pageId, page, ttlMs);
}

export function invalidatePageDetailsCache(pageId: string): void {
  invalidateCache(pageDetailsCache, pageId);
}

export function getCachedPosts(pageId: string):
  | Array<{
      id: string;
      message?: string;
      created_time: string;
      full_picture?: string;
      permalink_url?: string;
      attachments?: unknown;
    }>
  | undefined {
  return getCached(postsCache, pageId);
}

export function cachePosts(
  pageId: string,
  posts: Array<{
    id: string;
    message?: string;
    created_time: string;
    full_picture?: string;
    permalink_url?: string;
    attachments?: unknown;
  }>,
  ttlMs: number = POSTS_CACHE_TTL_MS,
): void {
  setCache(postsCache, pageId, posts, ttlMs);
}

export function invalidatePostsCache(pageId: string): void {
  invalidateCache(postsCache, pageId);
}
