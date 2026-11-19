import 'dotenv/config';
import path from 'node:path';
import { config } from 'dotenv';
import { FACEBOOK_GRAPH_API_VERSION } from '@/lib/facebook/constants';
import { logMessage } from '@/lib/logging';
import { EXTERNAL_API_TIMEOUT_MS } from '@/lib/supabase/fetchWithTimeout';

config({ path: path.resolve(process.cwd(), '.env.local') });

export interface FacebookPost {
  id: string;
  message?: string;
  full_picture?: string;
}

export interface MenuExtraction {
  postId: string;
  postMessage?: string;
  imageUrl: string;
  foodItems: string[];
  location?: { address: string; fuzzy: boolean };
  times?: { start: string; end: string };
  confidence: number;
  success: boolean;
  error?: string;
}

interface GraphResponse<T> {
  data: T[];
  paging?: {
    next?: string;
  };
  error?: {
    message: string;
    type: string;
    code: number;
  };
}

async function fetchFromGraphApi<T>(endpoint: string, accessToken: string): Promise<T | null> {
  const url = `https://graph.facebook.com/${FACEBOOK_GRAPH_API_VERSION}${endpoint}`;
  const response = await fetch(`${url}&access_token=${accessToken}`, {
    signal: AbortSignal.timeout(EXTERNAL_API_TIMEOUT_MS),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Graph API error: ${JSON.stringify(error)}`);
  }

  return response.json();
}

async function processPostWithOCR(post: FacebookPost): Promise<MenuExtraction> {
  if (!post.full_picture) {
    return {
      postId: post.id,
      postMessage: post.message,
      imageUrl: '',
      foodItems: [],
      confidence: 0,
      success: false,
      error: 'No image found in post',
    };
  }

  try {
    const { ocrWithVision } = await import('../ai/ocrVision');
    const result = await ocrWithVision(post.full_picture, 'photo');

    return {
      postId: post.id,
      postMessage: post.message,
      imageUrl: post.full_picture,
      foodItems: result.food_items,
      location: result.location?.address
        ? { address: result.location.address, fuzzy: result.location.fuzzy ?? false }
        : undefined,
      times:
        result.times?.start && result.times?.end
          ? { start: result.times.start, end: result.times.end }
          : undefined,
      confidence: result.confidence,
      success: result.confidence > 0.5,
    };
  } catch (error) {
    return {
      postId: post.id,
      postMessage: post.message,
      imageUrl: post.full_picture,
      foodItems: [],
      confidence: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function fetchFacebookPosts(
  pageId: string,
  accessToken: string,
  limit: number = 10,
): Promise<FacebookPost[]> {
  const response = await fetchFromGraphApi<GraphResponse<FacebookPost>>(
    `/${pageId}/posts?fields=id,message,full_picture&limit=${limit}`,
    accessToken,
  );

  if (!response?.data) {
    throw new Error('Failed to fetch posts');
  }

  return response.data;
}

export async function processFacebookPosts(
  pageId: string,
  accessToken: string,
  options?: {
    limit?: number;
  },
): Promise<{
  successful: MenuExtraction[];
  failed: MenuExtraction[];
}> {
  const { limit = 10 } = options || {};

  const posts = await fetchFacebookPosts(pageId, accessToken, limit);
  const postsWithImages = posts.filter((post) => post.full_picture);

  logMessage(`📊 Found ${posts.length} posts, ${postsWithImages.length} with images`);
  logMessage(`🔍 Processing ${postsWithImages.length} posts with OCR...`);

  const results = await Promise.allSettled(postsWithImages.map((p) => processPostWithOCR(p)));

  const successful: MenuExtraction[] = [];
  const failed: MenuExtraction[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      if (result.value.success) {
        successful.push(result.value);
        logMessage(
          `✅ Post ${result.value.postId}: ${result.value.foodItems.length} items extracted`,
        );
      } else {
        failed.push(result.value);
        logMessage(`❌ Post ${result.value.postId}: ${result.value.error}`);
      }
    } else {
      logMessage(`💥 Promise rejected: ${result.reason}`);
    }
  }

  return { successful, failed };
}
