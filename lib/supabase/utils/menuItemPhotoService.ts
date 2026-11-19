import { getSupabase } from '@/lib/supabase/client';
import { logError } from '@/lib/logging';

/**
 * Uploads a photo for a menu item to Supabase Storage
 * @param file - The image file to upload
 * @param truckId - The ID of the truck the menu item belongs to (optional)
 * @param itemId - The ID of the menu item (optional)
 * @param altText - The alt text for the photo for accessibility (optional)
 * @returns An object with either the URL of the uploaded photo or an error message
 */
export async function uploadMenuItemPhoto(
  file: File,
  truckId?: string,
  itemId?: string,
  altText?: string,
): Promise<{ url?: string; error?: string }> {
  const supabase = getSupabase();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'You must be logged in to upload photos' };
    }

    const timestamp = Date.now();
    const randomString = crypto.randomUUID();
    const fileExtension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const filename = `menu-item-${itemId ?? 'new'}-${timestamp}-${randomString}.${fileExtension}`;

    const folderPath = truckId ? `${user.id}/truck-${truckId}` : user.id;
    const filePath = `${folderPath}/${filename}`;

    const { error } = await supabase.storage.from('menu-item-photos').upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      ...(altText && {
        metadata: { alt_text: altText },
      }),
    });

    if (error) {
      logError('Error uploading menu item photo:', error);
      return { error: error.message };
    }

    // Get the public URL
    const { data: publicData } = supabase.storage.from('menu-item-photos').getPublicUrl(filePath);

    return { url: publicData.publicUrl };
  } catch (error) {
    logError('Unexpected error uploading menu item photo:', error);
    return { error: 'An unexpected error occurred during upload' };
  }
}

/**
 * Deletes a photo for a menu item from Supabase Storage
 * @param filePath - The path of the file to delete
 * @returns An object indicating success or failure
 */
export async function deleteMenuItemPhoto(
  filePath: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'You must be logged in to delete photos' };
    }

    const { error } = await supabase.storage.from('menu-item-photos').remove([filePath]);

    if (error) {
      logError('Error deleting menu item photo:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    logError('Unexpected error deleting menu item photo:', error);
    return { success: false, error: 'An unexpected error occurred during deletion' };
  }
}
