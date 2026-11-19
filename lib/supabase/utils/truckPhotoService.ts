import { getSupabase } from '@/lib/supabase/client';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logError } from '@/lib/logging';
import type { Json } from '@/lib/database.remote.types';

/**
 * Uploads a photo for a food truck profile
 * @param file - The image file to upload
 * @param truckId - The ID of the truck to associate the photo with
 * @returns The public URL of the uploaded photo or an error message
 */
export async function uploadTruckPhoto(
  file: File,
  truckId: string,
): Promise<{ url?: string; error?: string }> {
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}` };
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  if (file.size > maxSize) {
    return { error: 'File size exceeds 5MB limit' };
  }

  try {
    // Get browser client for authentication checks
    const supabase = getSupabase();

    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return { error: 'User not authenticated' };
    }

    // Upload to the truck-photos folder with unique filename
    const fileName = `${Date.now()}-${crypto.randomUUID()}.${file.type.split('/')[1]}`;
    const filePath = `truck-photos/${truckId}/${fileName}`;

    // Convert file to ArrayBuffer
    const buffer = await file.arrayBuffer();

    // Upload to Supabase storage
    const { error } = await supabase.storage
      .from('truck-photos') // Using bucket name 'truck-photos', assuming it exists
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true, // Overwrite if file exists
      });

    if (error) {
      logError('Error uploading truck photo:', error);
      return { error: 'Failed to upload photo' };
    }

    // Get the public URL
    const { data: publicUrlData } = supabase.storage.from('truck-photos').getPublicUrl(filePath);

    // Return the public URL
    return { url: publicUrlData?.publicUrl };
  } catch (error) {
    logError('Error in uploadTruckPhoto:', error);
    return { error: 'An unexpected error occurred while uploading the photo' };
  }
}

/**
 * Deletes a photo from Supabase storage
 * @param filePath - The path of the file to delete
 * @returns Success or error message
 */
export async function deleteTruckPhoto(
  filePath: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabase();

    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await supabase.storage.from('truck-photos').remove([filePath]);

    if (error) {
      logError('Error deleting truck photo:', error);
      return { success: false, error: 'Failed to delete photo' };
    }

    return { success: true };
  } catch (error) {
    logError('Error in deleteTruckPhoto:', error);
    return { success: false, error: 'An unexpected error occurred while deleting the photo' };
  }
}

/**
 * Updates the food truck record with the photo URL
 * @param truckId - The ID of the truck to update
 * @param photoUrl - The URL of the uploaded photo
 * @returns Success or error message
 */
export async function updateTruckWithPhoto(
  truckId: string,
  photoUrl: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseAdmin(); // Using admin client to bypass RLS

    // First, get the current truck's social_media to merge with the new photo URL
    const { data: truckData, error: fetchError } = await supabase
      .from('food_trucks')
      .select('social_media')
      .eq('id', truckId)
      .single();

    if (fetchError || !truckData) {
      logError('Error fetching truck data:', fetchError);
      return { success: false, error: 'Truck not found' };
    }

    // Update the truck with the photo URL in the social_media JSON field
    // We'll add a photo_url field to the social_media object while preserving other fields
    const existingSocialMedia = truckData.social_media as
      | Record<string, unknown>
      | null
      | undefined;
    const updatedSocialMedia = {
      ...existingSocialMedia,
      photo_url: photoUrl,
    };

    const { error: updateError } = await supabase
      .from('food_trucks')
      .update({
        social_media: updatedSocialMedia as unknown as Json,
      })
      .eq('id', truckId);

    if (updateError) {
      logError('Error updating truck with photo:', updateError);
      return { success: false, error: 'Failed to update truck with photo' };
    }

    return { success: true };
  } catch (error) {
    logError('Error in updateTruckWithPhoto:', error);
    return { success: false, error: 'An unexpected error occurred while updating the truck' };
  }
}

/**
 * Removes the photo URL from the food truck record
 * @param truckId - The ID of the truck to update
 * @returns Success or error message
 */
export async function removeTruckPhoto(
  truckId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseAdmin(); // Using admin client to bypass RLS

    // First, get the current truck's social_media to remove just the photo URL
    const { data: truckData, error: fetchError } = await supabase
      .from('food_trucks')
      .select('social_media')
      .eq('id', truckId)
      .single();

    if (fetchError || !truckData) {
      logError('Error fetching truck data:', fetchError);
      return { success: false, error: 'Truck not found' };
    }

    // Remove the photo_url field from social_media while preserving other fields
    const existingSocialMedia = truckData.social_media as
      | Record<string, unknown>
      | null
      | undefined;
    const updatedSocialMedia = { ...existingSocialMedia };
    delete updatedSocialMedia.photo_url;

    const { error: updateError } = await supabase
      .from('food_trucks')
      .update({
        social_media: updatedSocialMedia as unknown as Json,
      })
      .eq('id', truckId);

    if (updateError) {
      logError('Error removing photo from truck:', updateError);
      return { success: false, error: 'Failed to remove photo from truck' };
    }

    return { success: true };
  } catch (error) {
    logError('Error in removeTruckPhoto:', error);
    return { success: false, error: 'An unexpected error occurred while updating the truck' };
  }
}
