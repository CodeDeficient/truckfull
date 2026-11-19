import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.remote.types';
import { logError } from '@/lib/logging';

// Initialize Supabase client
const supabaseUrl = globalThis.process?.env?.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = globalThis.process?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

/**
 * Upload images to Supabase Storage
 * @param files - Array of files to upload
 * @param bucketName - Name of the storage bucket
 * @param folderPath - Optional folder path within the bucket
 * @param userId - User ID to associate with the uploads
 * @returns Array of image URLs if successful, otherwise error
 *
 * NOTE: Uploads are processed concurrently using Promise.all. If any upload
 * fails, all uploads fail immediately (fail-fast). This is intentional because
 * partial uploads are not useful for most use cases. Images are typically small,
 * making retry inexpensive. Callers should handle errors and retry if needed.
 */
export const uploadImagesToStorage = async (
  files: File[],
  bucketName: string = 'food-truck-images',
  folderPath: string = '',
  userId: string,
): Promise<{ urls: string[]; error: Error | null }> => {
  try {
    // Create the folder path with user ID if provided
    const path = folderPath ? `${userId}/${folderPath}` : userId;

    // Upload all files concurrently. If any upload fails, all fail (fail-fast).
    // This is intentional: partial uploads are not useful and can be easily retried.
    const uploadPromises = files.map(async (file) => {
      // Generate unique filename
      const fileName = `${Date.now()}-${crypto.randomUUID()}-${file.name}`;
      const filePath = `${path}/${fileName}`;

      // Upload file to Supabase storage
      const { error } = await supabase.storage.from(bucketName).upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

      if (error) {
        logError('Error uploading file:', error);
        throw new Error(error.message);
      }

      // Get the public URL for the uploaded file
      const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);

      if (!publicUrlData?.publicUrl) {
        logError('Failed to get public URL for uploaded file');
        throw new Error('Failed to get public URL for uploaded file');
      }

      return publicUrlData.publicUrl;
    });

    const urls = await Promise.all(uploadPromises);
    return { urls, error: null };
  } catch (error) {
    logError('Unexpected error during image upload:', error);
    return {
      urls: [],
      error: error instanceof Error ? error : new Error('Unknown upload error'),
    };
  }
};

/**
 * Delete images from Supabase Storage
 * @param imageUrls - Array of image URLs to delete
 * @param bucketName - Name of the storage bucket
 * @returns Boolean indicating success or failure
 */
export const deleteImagesFromStorage = async (
  imageUrls: string[],
  bucketName: string = 'food-truck-images',
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    // Extract file paths from URLs
    const paths = imageUrls.map((url) => {
      // Extract the path from the Supabase URL
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      // The path after bucket name is what we need for deletion
      return pathParts.slice(3).join('/'); // Skip /storage/v1/object/public/bucket-name
    });

    // Delete files from Supabase storage
    const { error } = await supabase.storage.from(bucketName).remove(paths);

    if (error) {
      logError('Error deleting files:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    logError('Unexpected error during image deletion:', error);
    return { success: false, error: error as Error };
  }
};

/**
 * Get public URL for a file in Supabase Storage
 * @param filePath - Path of the file in storage
 * @param bucketName - Name of the storage bucket
 * @returns Public URL if successful
 */
export const getPublicUrl = (
  filePath: string,
  bucketName: string = 'food-truck-images',
): { url: string | null; error: Error | null } => {
  try {
    const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);

    return { url: data?.publicUrl || null, error: null };
  } catch (error) {
    logError('Unexpected error getting public URL:', error);
    return { url: null, error: error as Error };
  }
};

/**
 * Check if file type is allowed
 * @param file - File to check
 * @param allowedTypes - Array of allowed MIME types
 * @returns Boolean indicating if file type is allowed
 */
export const isFileTypeAllowed = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.type);
};

/**
 * Check if file size is within limits
 * @param file - File to check
 * @param maxSizeInMB - Maximum allowed size in MB
 * @returns Boolean indicating if file size is within limits
 */
export const isFileSizeValid = (file: File, maxSizeInMB: number): boolean => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
};
