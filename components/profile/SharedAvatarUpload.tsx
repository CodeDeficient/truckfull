'use client';

import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getSupabase } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Loader2, Upload, X } from 'lucide-react';

interface SharedAvatarUploadProps {
  readonly userId: string;
  readonly currentUrl?: string;
  readonly onUploaded?: (publicUrl: string) => void | Promise<void>;
  readonly storageBucket?: string; // Default is 'public', can be 'user-avatars' for modal version
  readonly showPreview?: boolean; // Whether to show image preview functionality
  readonly showFileName?: boolean; // Whether to show selected file name
  readonly maxSize?: number; // Max file size in bytes (default: 5MB)
  readonly containerClassName?: string; // Additional classes for the container
  readonly showInfoText?: boolean; // Whether to show file format info text
  readonly inputId?: string; // ID for the input element (useful for label targeting)
  readonly hideUploadButton?: boolean; // Whether to hide the upload button (for custom implementation)
  readonly customUploadButton?: React.ReactNode; // Custom upload button component
  readonly onFileSelected?: (file: File) => void; // Callback when a file is selected
  readonly onRemovePreview?: () => void; // Callback when preview is removed
}

export function SharedAvatarUpload({
  userId,
  currentUrl,
  onUploaded,
  storageBucket = 'public',
  showPreview = false,
  showFileName = false,
  maxSize = 5_242_880, // 5MB
  containerClassName = '',
  showInfoText = false,
  inputId,
  hideUploadButton = false,
  customUploadButton,
  onFileSelected,
  onRemovePreview,
}: SharedAvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | undefined>();
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string>('');

  const supabase: SupabaseClient = getSupabase() as SupabaseClient;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      // Validate file size if in preview mode
      if (showPreview && f.size > maxSize) {
        setError(`File size must be less than ${maxSize / 1_048_576}MB`);
        return;
      }

      // Validate file type
      if (!f.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      setFile(f);
      setError('');

      if (showPreview) {
        // Create preview URL
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(f);
      }

      if (onFileSelected) {
        onFileSelected(f);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError('');

    try {
      const fileExt = file.name.split('.').pop() ?? 'png';
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `avatars/${userId}/${fileName}`;

      // Upload to specified bucket
      const { error: uploadError } = await supabase.storage
        .from(storageBucket)
        .upload(filePath, file, {
          cacheControl: '31536000',
          upsert: true,
        });

      if (uploadError) {
        setError(uploadError.message);
        setIsUploading(false);
        return;
      }

      // Get public URL
      const { data: publicData } = supabase.storage.from(storageBucket).getPublicUrl(filePath);

      const publicUrl = publicData?.publicUrl;
      if (publicUrl == undefined || publicUrl.length === 0) {
        setError('Failed to obtain public URL');
        setIsUploading(false);
        return;
      }

      // Call onUploaded callback
      if (onUploaded) {
        await onUploaded(publicUrl);
      }

      // Reset state
      setFile(undefined);
      if (showPreview) {
        setPreviewUrl(undefined);
      }
      if (inputRef.current) inputRef.current.value = '';
    } catch (error_: unknown) {
      const message = error_ instanceof Error ? error_.message : 'Unexpected error during upload';
      setError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePreview = () => {
    setFile(undefined);
    setPreviewUrl(undefined);
    if (inputRef.current) inputRef.current.value = '';
    setError('');
    if (onRemovePreview) {
      onRemovePreview();
    }
  };

  // Avatar preview element (reusable between both components)
  const avatarPreview = (
    <div className="relative">
      {previewUrl || currentUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl || currentUrl}
          alt={showPreview ? 'Avatar preview' : 'Current avatar'}
          className={`${
            showPreview
              ? 'w-32 h-32 rounded-full object-cover border-4 border-slate-200 dark:border-slate-700'
              : 'w-20 h-20 rounded-full object-cover mx-auto'
          }`}
        />
      ) : (
        <div
          className={`${
            showPreview
              ? 'w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center border-4 border-slate-200 dark:border-slate-700'
              : 'w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground text-sm'
          }`}
        >
          {showPreview ? <Upload className="w-12 h-12 text-white" /> : 'No avatar'}
        </div>
      )}
    </div>
  );

  return (
    <div className={`space-y-3 ${containerClassName}`}>
      {/* Avatar Preview */}
      {showPreview ? (
        <div className="flex flex-col items-center space-y-4">
          {avatarPreview}
          {previewUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemovePreview}
              className="text-sm text-muted-foreground hover:text-destructive"
            >
              <X className="w-4 h-4 mr-1" />
              Remove preview
            </Button>
          )}
        </div>
      ) : (
        <div className="flex justify-center">{avatarPreview}</div>
      )}

      {/* File Input */}
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-3">
          {inputId ? (
            <>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id={inputId}
              />
              <Button
                variant="outline"
                className="w-full cursor-pointer"
                onClick={() => inputRef.current?.click()}
                type="button"
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose Image
              </Button>
            </>
          ) : (
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="text-sm"
            />
          )}

          {showFileName && file && (
            <p className="text-sm text-muted-foreground">Selected: {file.name}</p>
          )}
        </div>

        {/* Upload Button */}
        {!hideUploadButton &&
          (customUploadButton || (
            <Button
              onClick={() => {
                void handleUpload();
              }}
              disabled={!file || isUploading}
              className={inputId && 'w-full'}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
          ))}
      </div>

      {/* Error Message */}
      {error.length > 0 && (
        <div
          className={inputId ? 'p-3 rounded-md bg-destructive/10 border border-destructive/20' : ''}
        >
          <p
            className={
              inputId ? 'text-sm text-destructive text-center' : 'text-sm text-red-600 text-center'
            }
          >
            {error}
          </p>
        </div>
      )}

      {/* Info Text */}
      {showInfoText && (
        <p className="text-xs text-center text-muted-foreground">
          Supported formats: JPG, PNG, GIF, WebP • Max size: {maxSize / 1_048_576}MB
        </p>
      )}
    </div>
  );
}
