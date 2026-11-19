'use client';

import { useState, type Dispatch, type SetStateAction, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { logError } from '@/lib/logging';

interface CommonProps<T> {
  readonly formData: T;
  readonly setFormData: Dispatch<SetStateAction<T>>;
  readonly uploadService: (
    file: File,
    truckId?: string,
    itemId?: string,
    altText?: string,
  ) => Promise<{ url?: string; error?: string }>;
  readonly deleteService: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  readonly photoType: 'truck' | 'menu-item';
  readonly altTextLabel?: string;
  readonly altTextPlaceholder?: string;
  readonly onUploadError?: (error: string) => void;
  readonly onUploadSuccess?: () => void;
  readonly onBeforeUpload?: (file: File) => boolean | void;
  readonly photoLabel?: string;
  readonly maxSize?: number; // in bytes, default 5MB
  readonly allowedTypes?: string[];
  readonly onPhotoUrlChange?: (url: string | undefined) => void;
  readonly processImage?: (file: File) => Promise<File>;
}

const validateFile = (
  file: File,
  maxSize: number = 5 * 1024 * 1024,
  allowedTypes: string[] = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
): { isValid: boolean; error: string | null } => {
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }

  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File size exceeds ${(maxSize / (1024 * 1024)).toFixed(1)}MB limit`,
    };
  }

  return { isValid: true, error: null };
};

function PhotoUploadSection<
  T extends { photo_url?: string; photo_alt_text?: string; id?: string; truck_id?: string },
>({
  formData,
  setFormData,
  uploadService,
  deleteService,
  photoType,
  altTextLabel = 'Photo Alt Text (for accessibility)',
  altTextPlaceholder = 'Describe the image for visually impaired users',
  onUploadError,
  onUploadSuccess,
  onBeforeUpload,
  photoLabel = photoType === 'truck' ? 'Truck Photo' : 'Menu Item Photo',
  maxSize = 5 * 1024 * 1024, // 5MB default
  allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  onPhotoUrlChange,
  processImage,
}: CommonProps<T>) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (onBeforeUpload && onBeforeUpload(file) === false) {
      return; // Early return if onBeforeUpload returns false
    }

    const { isValid, error } = validateFile(file, maxSize, allowedTypes);
    if (!isValid) {
      setUploadError(error);
      onUploadError?.(error ?? 'Invalid file');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      // Process image if needed
      let fileToUpload = file;
      if (processImage) {
        fileToUpload = await processImage(file);
      }

      // Determine the photo_alt_text based on the photo type
      const altText = formData.photo_alt_text;

      // Call the upload service with appropriate parameters
      const result = await uploadService(fileToUpload, formData.truck_id, formData.id, altText);

      if (result.error) {
        setUploadError(result.error);
        onUploadError?.(result.error);
      } else {
        // Update form data with the new photo URL
        if (onPhotoUrlChange) {
          onPhotoUrlChange(result.url);
        } else {
          setFormData((prev) => ({ ...prev, photo_url: result.url }));
        }
        setUploadError(null);
        onUploadSuccess?.();
      }
    } catch (error) {
      const errorMsg = 'An unexpected error occurred during upload';
      setUploadError(errorMsg);
      onUploadError?.(errorMsg);
      logError('Error uploading photo:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async () => {
    const currentPhoto = formData.photo_url ?? previewUrl;
    if (!currentPhoto) return;

    // Determine the photo path based on photo type
    const pathStart = currentPhoto.indexOf(
      photoType === 'truck' ? '/truck-photos/' : '/menu-item-photos/',
    );
    if (pathStart === -1) {
      const error = 'Unable to determine file path to delete';
      setUploadError(error);
      onUploadError?.(error);
      return;
    }

    const filePath = currentPhoto.slice(Math.max(0, pathStart + 1));
    const result = await deleteService(filePath);

    if (result.success) {
      if (onPhotoUrlChange) {
        onPhotoUrlChange(undefined); // eslint-disable-line unicorn/no-useless-undefined
      } else {
        setFormData((prev) => ({ ...prev, photo_url: null }));
      }
      setPreviewUrl(null);
      setUploadError(null);
    } else {
      const error = result.error ?? 'Failed to delete photo';
      setUploadError(error);
      onUploadError?.(error);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChangeWrapper = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    try {
      await handleFileChange(e);
    } catch (error) {
      logError('Upload error:', error);
    }
  };

  const handleDeletePhotoWrapper = async (): Promise<void> => {
    try {
      await handleDeletePhoto();
    } catch (error) {
      logError('Delete error:', error);
    }
  };

  const currentPhoto = formData.photo_url ?? previewUrl;
  const altText =
    formData.photo_alt_text ??
    (photoType === 'truck' ? 'Truck profile preview' : 'Menu item preview');

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">{photoLabel}</h3>
      <div className="flex flex-col items-center space-y-4">
        {currentPhoto ? (
          <div className="relative">
            {photoType === 'truck' ? (
              <Image
                src={currentPhoto}
                alt={altText}
                width={192}
                height={192}
                className="object-cover rounded-lg border border-gray-200 shadow-sm"
                onError={(e) => {
                  logError('Error loading photo:', e);
                }}
              />
            ) : (
              <img
                src={currentPhoto}
                alt={altText}
                className="w-48 h-48 object-cover rounded-lg border border-gray-200 shadow-sm"
                onError={(e) => {
                  logError('Error loading photo:', e);
                }}
              />
            )}
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute -top-2 -right-2 rounded-full"
              onClick={handleDeletePhotoWrapper}
              disabled={uploading}
            >
              ×
            </Button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg w-48 h-48 flex items-center justify-center bg-gray-50">
            <span className="text-gray-500">No photo</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <Button type="button" variant="outline" onClick={triggerFileSelect} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Choose Photo'}
          </Button>
          <Input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChangeWrapper}
            accept={allowedTypes.join(',').replaceAll('image/', '.')}
            className="hidden"
            disabled={uploading}
          />
        </div>

        {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}

        {/* Alt text field for accessibility - conditionally shown */}
        {photoType === 'menu-item' && (
          <div className="w-full max-w-md">
            <Label htmlFor="photo-alt-text">{altTextLabel}</Label>
            <Input
              id="photo-alt-text"
              value={formData.photo_alt_text ?? ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  photo_alt_text: e.target.value,
                }))
              }
              placeholder={altTextPlaceholder}
              disabled={uploading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Adding alt text helps visually impaired users understand your{' '}
              {photoType === 'menu-item' ? 'menu item' : 'truck'}.
            </p>
          </div>
        )}

        <p className="text-xs text-gray-500 text-center">
          JPG, PNG, or WebP. Max size: {(maxSize / (1024 * 1024)).toFixed(1)}MB.
          {photoType === 'menu-item' && ' Images will be automatically resized.'}
        </p>
      </div>
    </div>
  );
}

export default PhotoUploadSection;
