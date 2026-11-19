import { useState, useCallback } from 'react';
import { uploadImagesToStorage } from '@/lib/utils/imageStorage';
import { logError } from '@/lib/logging';

interface UsePhotoGalleryReturn {
  uploadImages: (
    files: FileList | File[],
    userId: string,
  ) => Promise<{ success: boolean; error?: string }>;
  isUploading: boolean;
  uploadProgress: number;
}

export const usePhotoGallery = (): UsePhotoGalleryReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadImages = useCallback(async (files: FileList | File[], userId: string) => {
    setIsUploading(true);

    try {
      // Convert FileList to array if needed
      const filesArray = [...files];

      // Check file types and sizes
      const validFiles = filesArray.filter((file) => {
        const maxSize = 5 * 1024 * 1024; // 5MB
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

        return allowedTypes.includes(file.type) && file.size <= maxSize;
      });

      if (validFiles.length === 0) {
        return {
          success: false,
          error: 'No valid files to upload. Please check file types and sizes.',
        };
      }

      // Upload to Supabase
      const result = await uploadImagesToStorage(
        validFiles,
        'food-truck-images',
        'menu-items',
        userId,
      );

      if (result.error) {
        logError('Upload error:', result.error);
        return {
          success: false,
          error: result.error.message || 'Upload failed',
        };
      }

      return { success: true };
    } catch (error) {
      logError('Unexpected error during upload:', error);
      return {
        success: false,
        error: (error as Error).message || 'An unexpected error occurred',
      };
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, []);

  return {
    uploadImages,
    isUploading,
    uploadProgress,
  };
};
