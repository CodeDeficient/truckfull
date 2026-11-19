import { getSupabase } from '../supabase/client';
import { getSupabaseAdmin } from '../supabase/admin';
import { handleSupabaseError } from '../supabase/utils';
import { logError } from '@/lib/logging';

// Define types for photo upload
export interface PhotoUploadResult {
  url?: string;
  error?: string;
  filePath?: string;
}

export interface PhotoValidationResult {
  isValid: boolean;
  error?: string;
}

export interface PhotoUploadConfig {
  maxFileSize: number; // in bytes
  allowedTypes: string[];
  bucketName: string;
  folderPath: string;
  maxRetries: number;
  retryDelay: number; // in milliseconds
}

// Default configuration
const DEFAULT_CONFIG: PhotoUploadConfig = {
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  bucketName: 'truck-photos', // Default bucket name
  folderPath: 'truck-photos', // Default folder path
  maxRetries: 3,
  retryDelay: 1000, // 1 second
};

/**
 * Validates photo file based on size and type
 * @param file - The file to validate
 * @param config - Configuration options for validation
 * @returns ValidationResult indicating if file is valid
 */
function validatePhoto(file: File, config: PhotoUploadConfig): PhotoValidationResult {
  // Validate file type
  if (!config.allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `File type not allowed. Allowed types: ${config.allowedTypes.join(', ')}`,
    };
  }

  // Validate file size
  if (file.size > config.maxFileSize) {
    const maxSizeMB = config.maxFileSize / (1024 * 1024);
    return {
      isValid: false,
      error: `File size exceeds ${maxSizeMB}MB limit`,
    };
  }

  return { isValid: true };
}

/**
 * Generates a unique filename for the uploaded photo
 * @param file - The file being uploaded
 * @param prefix - Optional prefix for the filename
 * @returns Unique filename
 */
function generateUniqueFilename(file: File, prefix?: string): string {
  const timestamp = Date.now();
  const randomString = crypto.randomUUID();
  const extension = file.type.split('/')[1];
  const prefixPart = prefix ? `${prefix}-` : '';

  return `${prefixPart}${timestamp}-${randomString}.${extension}`;
}

/**
 * Delays execution for a specified amount of time
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after the delay
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Attempts to upload a photo to Supabase Storage with retry logic
 * @param file - The file to upload
 * @param filePath - The path in storage where the file will be saved
 * @param config - Configuration options
 * @param attempt - Current attempt number (for internal use)
 * @returns The result of the upload operation
 */
async function uploadWithRetry(
  file: File,
  filePath: string,
  config: PhotoUploadConfig,
  attempt: number = 1,
): Promise<PhotoUploadResult> {
  const supabase = getSupabase();

  try {
    // Convert file to ArrayBuffer
    const buffer = await file.arrayBuffer();

    // Upload to Supabase storage
    const { error } = await supabase.storage.from(config.bucketName).upload(filePath, buffer, {
      contentType: file.type,
      cacheControl: '31536000',
      upsert: true, // Overwrite if file exists
    });

    if (error) {
      logError(`Upload attempt ${attempt} failed:`, error);

      // If we've reached max retries, return the error
      if (attempt >= config.maxRetries) {
        return {
          error: `Failed to upload photo after ${config.maxRetries} attempts: ${error.message}`,
        };
      }

      // Wait before retrying
      await delay(config.retryDelay * attempt); // Exponential backoff

      // Retry the upload
      return uploadWithRetry(file, filePath, config, attempt + 1);
    }

    // Get the public URL
    const { data: publicUrlData } = supabase.storage.from(config.bucketName).getPublicUrl(filePath);

    return {
      url: publicUrlData?.publicUrl,
      filePath,
    };
  } catch (error: unknown) {
    logError(`Upload attempt ${attempt} error:`, error);

    // If we've reached max retries, return the error
    if (attempt >= config.maxRetries) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      return {
        error: `Failed to upload photo after ${config.maxRetries} attempts: ${errorMessage}`,
      };
    }

    // Wait before retrying
    await delay(config.retryDelay * attempt); // Exponential backoff

    // Retry the upload
    return uploadWithRetry(file, filePath, config, attempt + 1);
  }
}

/**
 * Updates the entity record (e.g., food truck) with the photo URL
 * @param entityId - The ID of the entity to update
 * @param photoUrl - The URL of the uploaded photo
 * @param entityType - The type of entity (e.g., 'food_truck', 'menu_item')
 * @returns Success or error message
 */
async function updateEntityWithPhoto(
  entityId: string,
  photoUrl: string,
  entityType: 'food_truck' | 'menu_item' = 'food_truck',
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseAdmin(); // Using admin client to bypass RLS

    if (entityType === 'food_truck') {
      // For food trucks, fetch the truck data using the common helper
      const { data: truckData, error: fetchError } = await fetchFoodTruckData(entityId);

      if (fetchError || !truckData) {
        logError('Error fetching truck data:', fetchError);
        return { success: false, error: 'Entity not found' };
      }

      // Update the truck with the photo URL in the social_media JSON field
      const updatedSocialMedia = {
        ...truckData.social_media,
        photo_url: photoUrl,
      };

      const { error: updateError } = await supabase
        .from('food_trucks')
        .update({
          social_media: updatedSocialMedia,
        })
        .eq('id', entityId);

      if (updateError) {
        logError('Error updating truck with photo:', updateError);
        return { success: false, error: 'Failed to update entity with photo' };
      }
    } else if (entityType === 'menu_item') {
      // Menu items are now stored in food_trucks.menu JSONB column
      // entityId format should be "truckId:itemName" for menu items
      const [truckId, itemName] = entityId.split(':');
      if (!truckId || !itemName) {
        return { success: false, error: 'Invalid menu item ID format. Expected truckId:itemName' };
      }

      // Fetch current menu
      const { data: truck, error: fetchError } = await supabase
        .from('food_trucks')
        .select('menu')
        .eq('id', truckId)
        .single();

      if (fetchError || !truck) {
        return { success: false, error: 'Failed to fetch truck menu' };
      }

      const menu = ((truck as unknown as Record<string, unknown>).menu ?? []) as Array<{
        name: string;
        photo_url?: string;
        [key: string]: unknown;
      }>;
      const itemIndex = menu.findIndex((item) => item.name === itemName);

      if (itemIndex === -1) {
        return { success: false, error: 'Menu item not found' };
      }

      // Update photo_url in the item
      menu[itemIndex].photo_url = photoUrl;

      // Save back to database
      const { error: updateError } = await supabase
        .from('food_trucks')
        .update({ menu } as unknown as Record<string, unknown>)
        .eq('id', truckId);

      if (updateError) {
        logError('Error updating menu item with photo:', updateError);
        return { success: false, error: 'Failed to update menu item with photo' };
      }
    }

    return { success: true };
  } catch (error: unknown) {
    logError('Error in updateEntityWithPhoto:', error);
    return { success: false, error: 'An unexpected error occurred while updating the entity' };
  }
}

/**
 * Fetches food truck data by ID
 * @param entityId - The ID of the food truck to fetch
 * @returns The food truck data with social_media field or an error
 */
async function fetchFoodTruckData(
  entityId: string,
): Promise<{ data: { social_media: Record<string, unknown> | null } | null; error: unknown }> {
  const supabase = getSupabaseAdmin(); // Using admin client to bypass RLS

  const { data, error } = await supabase
    .from('food_trucks')
    .select('social_media')
    .eq('id', entityId)
    .single();

  return { data: data as { social_media: Record<string, unknown> | null } | null, error };
}

/**
 * Removes the photo URL from the entity record
 * @param entityId - The ID of the entity to update
 * @param entityType - The type of entity (e.g., 'food_truck', 'menu_item')
 * @returns Success or error message
 */
async function removePhotoFromEntity(
  entityId: string,
  entityType: 'food_truck' | 'menu_item' = 'food_truck',
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseAdmin(); // Using admin client to bypass RLS

    if (entityType === 'food_truck') {
      // For food trucks, remove the photo_url from social_media JSON field
      const { data: truckData, error: fetchError } = await fetchFoodTruckData(entityId);

      if (fetchError || !truckData) {
        logError('Error fetching truck data:', fetchError);
        return { success: false, error: 'Entity not found' };
      }

      // Remove the photo_url field from social_media while preserving other fields
      const updatedSocialMedia = { ...truckData.social_media };
      delete updatedSocialMedia.photo_url;

      const { error: updateError } = await supabase
        .from('food_trucks')
        .update({
          social_media: updatedSocialMedia as Record<string, never>,
        })
        .eq('id', entityId);

      if (updateError) {
        logError('Error removing photo from truck:', updateError);
        return { success: false, error: 'Failed to remove photo from entity' };
      }
    } else if (entityType === 'menu_item') {
      // Menu items are now stored in food_trucks.menu JSONB column
      // entityId format should be "truckId:itemName" for menu items
      const [truckId, itemName] = entityId.split(':');
      if (!truckId || !itemName) {
        return { success: false, error: 'Invalid menu item ID format. Expected truckId:itemName' };
      }

      // Fetch current menu
      const { data: truck, error: fetchError } = await supabase
        .from('food_trucks')
        .select('menu')
        .eq('id', truckId)
        .single();

      if (fetchError || !truck) {
        return { success: false, error: 'Failed to fetch truck menu' };
      }

      const menu = ((truck as unknown as Record<string, unknown>).menu ?? []) as Array<{
        name: string;
        photo_url?: string;
        [key: string]: unknown;
      }>;
      const itemIndex = menu.findIndex((item) => item.name === itemName);

      if (itemIndex === -1) {
        return { success: false, error: 'Menu item not found' };
      }

      // Remove photo_url from the item
      delete menu[itemIndex].photo_url;

      // Save back to database
      const { error: updateError } = await supabase
        .from('food_trucks')
        .update({ menu } as unknown as Record<string, unknown>)
        .eq('id', truckId);

      if (updateError) {
        logError('Error removing photo from menu item:', updateError);
        return { success: false, error: 'Failed to remove photo from menu item' };
      }
    }

    return { success: true };
  } catch (error: unknown) {
    logError('Error in removePhotoFromEntity:', error);
    return { success: false, error: 'An unexpected error occurred while updating the entity' };
  }
}

/**
 * Deletes a photo from Supabase storage
 * @param filePath - The path of the file to delete
 * @param bucketName - The name of the bucket where the file is stored
 * @returns Success or error message
 */
async function deletePhotoFromStorage(
  filePath: string,
  bucketName: string = DEFAULT_CONFIG.bucketName,
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

    const { error } = await supabase.storage.from(bucketName).remove([filePath]);

    if (error) {
      logError('Error deleting photo:', error);
      return { success: false, error: 'Failed to delete photo' };
    }

    return { success: true };
  } catch (error: unknown) {
    logError('Error in deletePhotoFromStorage:', error);
    return { success: false, error: 'An unexpected error occurred while deleting the photo' };
  }
}

/**
 * Checks if the authenticated user is the owner of the given entity
 * @param entityId - The ID of the entity (truck or menu item)
 * @param entityType - The type of entity
 * @returns Promise resolving to whether the user is authorized
 */
async function isUserAuthorized(
  entityId: string,
  entityType: 'food_truck' | 'menu_item' = 'food_truck',
): Promise<boolean> {
  const supabase = getSupabase();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return false;
  }

  const truckId = entityType === 'menu_item' ? entityId.split(':')[0] : entityId;
  if (!truckId) {
    return false;
  }

  // Get the truck's owner_id
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('food_trucks')
    .select('owner_id')
    .eq('id', truckId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.owner_id === session.user.id;
}

export const PhotoUploadService = {
  /**
   * Uploads a photo to Supabase Storage
   * @param file - The image file to upload
   * @param entityId - The ID of the entity to associate the photo with
   * @param entityType - The type of entity (e.g., 'food_truck', 'menu_item')
   * @param customConfig - Optional custom configuration
   * @returns The result of the upload operation
   */
  async uploadPhoto(
    file: File,
    entityId: string,
    entityType: 'food_truck' | 'menu_item' = 'food_truck',
    customConfig?: Partial<PhotoUploadConfig>,
  ): Promise<PhotoUploadResult> {
    try {
      // Merge default config with custom config
      const config: PhotoUploadConfig = { ...DEFAULT_CONFIG, ...customConfig };

      // Check if user is authorized to upload photo for this entity
      if (!(await isUserAuthorized(entityId, entityType))) {
        return { error: 'User not authorized to modify this entity' };
      }

      // Validate the file
      const validation = validatePhoto(file, config);
      if (!validation.isValid) {
        return { error: validation.error };
      }

      // Generate unique filename
      const prefix = entityType === 'food_truck' ? `truck-${entityId}` : `menu-${entityId}`;
      const fileName = generateUniqueFilename(file, prefix);
      const filePath = `${config.folderPath}/${entityId}/${fileName}`;

      // Upload the photo with retry logic
      const uploadResult = await uploadWithRetry(file, filePath, config);

      if (uploadResult.error) {
        return { error: uploadResult.error };
      }

      // Update the entity with the photo URL
      const updateResult = await updateEntityWithPhoto(entityId, uploadResult.url!, entityType);
      if (!updateResult.success) {
        // If we couldn't update the entity, we should delete the uploaded file
        await deletePhotoFromStorage(filePath, config.bucketName);
        return { error: updateResult.error ?? 'Failed to update entity with photo URL' };
      }

      return {
        url: uploadResult.url,
        filePath: uploadResult.filePath,
      };
    } catch (error: unknown) {
      handleSupabaseError(error as Error, 'uploadPhoto');
      return { error: 'An unexpected error occurred while uploading the photo' };
    }
  },

  /**
   * Deletes a photo from Supabase Storage and updates the entity
   * @param filePath - The path of the file to delete
   * @param entityId - The ID of the entity associated with the photo
   * @param entityType - The type of entity (e.g., 'food_truck', 'menu_item')
   * @param bucketName - The name of the bucket where the file is stored
   * @returns Success or error message
   */
  async deletePhoto(
    filePath: string,
    entityId: string,
    entityType: 'food_truck' | 'menu_item' = 'food_truck',
    bucketName?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if user is authorized to delete photo for this entity
      if (!(await isUserAuthorized(entityId, entityType))) {
        return { success: false, error: 'User not authorized to modify this entity' };
      }
      // Remove the photo URL from the entity
      const removeResult = await removePhotoFromEntity(entityId, entityType);
      if (!removeResult.success) {
        return removeResult;
      }

      // Delete the photo from storage
      const deleteResult = await deletePhotoFromStorage(filePath, bucketName);

      // If deletion from storage fails, we should try to restore the photo URL in the entity
      if (!deleteResult.success) {
        // Try to restore the photo URL in the entity
        await updateEntityWithPhoto(entityId, `restoring-${Date.now()}`, entityType);
        return deleteResult;
      }

      return { success: true };
    } catch (error: unknown) {
      handleSupabaseError(error as Error, 'deletePhoto');
      return { success: false, error: 'An unexpected error occurred while deleting the photo' };
    }
  },

  /**
   * Updates an entity with a photo URL without uploading a new photo
   * @param entityId - The ID of the entity to update
   * @param photoUrl - The URL of the photo to associate with the entity
   * @param entityType - The type of entity (e.g., 'food_truck', 'menu_item')
   * @returns Success or error message
   */
  async updateEntityPhoto(
    entityId: string,
    photoUrl: string,
    entityType: 'food_truck' | 'menu_item' = 'food_truck',
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if user is authorized to update photo for this entity
      if (!(await isUserAuthorized(entityId, entityType))) {
        return { success: false, error: 'User not authorized to modify this entity' };
      }
      return await updateEntityWithPhoto(entityId, photoUrl, entityType);
    } catch (error: unknown) {
      handleSupabaseError(error as Error, 'updateEntityPhoto');
      return {
        success: false,
        error: 'An unexpected error occurred while updating the entity photo',
      };
    }
  },

  /**
   * Validates a photo file based on the service configuration
   * @param file - The file to validate
   * @param customConfig - Optional custom configuration
   * @returns ValidationResult indicating if file is valid
   */
  validatePhoto(file: File, customConfig?: Partial<PhotoUploadConfig>): PhotoValidationResult {
    const config: PhotoUploadConfig = { ...DEFAULT_CONFIG, ...customConfig };
    return validatePhoto(file, config);
  },
};
