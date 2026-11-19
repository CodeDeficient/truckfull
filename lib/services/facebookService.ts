import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getUserFacebookPages } from '@/lib/facebook/graphApi';
import { encryptFacebookBusinessToken } from '@/lib/facebook/businessTokenCrypto';

export interface FacebookPageRecord {
  id: string;
  user_id: string;
  facebook_page_id: string;
  page_name: string;
  page_access_token: string;
  category: string | null;
  tasks: string[] | null;
  picture_url: string | null;
  cover_url: string | null;
  description: string | null;
  cached_at: string;
  expires_at: string;
  last_synced_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SaveFacebookPagesOptions {
  userId: string;
  userAccessToken: string;
}

interface SaveFacebookPagesResult {
  success: boolean;
  error?: string;
  savedPages?: FacebookPageRecord[];
}

export async function saveUserFacebookPages(
  options: SaveFacebookPagesOptions,
): Promise<SaveFacebookPagesResult> {
  const { userId, userAccessToken } = options;
  const supabase = getSupabaseAdmin();

  try {
    const pages = await getUserFacebookPages(userAccessToken);

    const pageTokenSecret =
      process.env.FACEBOOK_BUSINESS_APP_SECRET ||
      process.env.FACEBOOK_AUTH_APP_SECRET ||
      process.env.FACEBOOK_APP_SECRET;

    if (!pageTokenSecret) {
      return { success: false, error: 'facebook_token_encryption_secret_missing' };
    }

    if (!pages || pages.length === 0) {
      return { success: true, savedPages: [] };
    }

    const pagesToInsert = pages.map((page) => ({
      user_id: userId,
      facebook_page_id: page.id,
      page_name: page.name,
      page_access_token: encryptFacebookBusinessToken(page.access_token, pageTokenSecret),
      category: page.category ?? null,
      tasks: null,
      picture_url: null,
      cover_url: null,
      description: null,
    }));

    const { data: insertedPages, error: insertError } = await supabase
      .from('facebook_pages')
      .upsert(pagesToInsert, {
        onConflict: 'user_id,facebook_page_id',
        ignoreDuplicates: false,
      })
      .select()
      .returns<FacebookPageRecord[]>();

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    return { success: true, savedPages: insertedPages };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';
    return { success: false, error: message };
  }
}
