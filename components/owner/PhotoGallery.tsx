/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- Intentional: tabIndex needed for keyboard navigation in drag-and-drop */
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, Upload, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logError } from '@/lib/logging';

// Define the image type
export type GalleryImageStatus = 'idle' | 'uploading' | 'error' | 'success';

export interface GalleryImage {
  id: string;
  url: string;
  file?: File;
  name?: string;
  alt?: string;
  status?: GalleryImageStatus;
}

// Sortable Image Item Component
const SortableImageItem = ({
  image,
  index,
  onRemove,
  altText,
  onAltChange,
}: {
  image: GalleryImage;
  index: number;
  onRemove: (id: string) => void;
  altText: string;
  onAltChange: (id: string, alt: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Handle keyboard events for accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      onRemove(image.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow',
        'bg-white dark:bg-gray-800',
        isDragging && 'ring-2 ring-blue-500',
      )}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="group"
      aria-roledescription="sortable image item"
      aria-label={`Image ${index + 1} of ${altText}`}
    >
      <div className="aspect-square flex items-center justify-center bg-gray-100 dark:bg-gray-700">
        {(() => {
          if (image.url) {
            return (
              <img
                src={image.url}
                alt={altText ?? `Food item ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
                fetchPriority="auto"
                onLoad={(e) => {
                  // Optional: Track image load for performance metrics
                  (e.target as HTMLImageElement).dataset.loaded = 'true';
                }}
                onError={(e) => {
                  // Fallback for failed image loads
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder-image.jpg';
                  target.alt = 'Image unavailable';
                }}
              />
            );
          }

          if (image.status === 'uploading') {
            return (
              <div className="flex flex-col items-center justify-center p-4 text-gray-500">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <span className="text-sm">Uploading...</span>
              </div>
            );
          }

          if (image.status === 'error') {
            return (
              <div className="flex flex-col items-center justify-center p-4 text-red-500">
                <AlertCircle className="h-8 w-8 mb-2" />
                <span className="text-sm">Upload failed</span>
              </div>
            );
          }

          if (image.file) {
            return (
              <div className="flex flex-col items-center justify-center p-4 text-gray-500">
                <div className="animate-pulse">
                  <ImageIcon className="h-8 w-8 mb-2" />
                  <span className="text-sm">Processing...</span>
                </div>
              </div>
            );
          }

          return (
            <div className="flex flex-col items-center justify-center p-4 text-gray-500">
              <ImageIcon className="h-8 w-8 mb-2" />
              <span className="text-sm">Loading...</span>
            </div>
          );
        })()}
      </div>

      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
        <div className="flex space-x-2">
          <button
            onClick={() => onRemove(image.id)}
            className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-300"
            aria-label={`Remove image ${index + 1}`}
            type="button"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="p-2 border-t bg-gray-50 dark:bg-gray-700">
        <input
          type="text"
          value={altText}
          onChange={(e) => onAltChange(image.id, e.target.value)}
          placeholder={`Alt text for image ${index + 1}`}
          className="w-full text-xs p-1 border rounded bg-white dark:bg-gray-600 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-label={`Alt text for image ${index + 1}`}
        />
      </div>

      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 p-1 bg-black bg-opacity-50 rounded text-white cursor-move focus:outline-none focus:ring-2 focus:ring-blue-300"
        aria-label={`Drag to reorder image ${index + 1}, press space to lift, arrow keys to move, space to drop`}
        role="button"
        tabIndex={0}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </div>
    </div>
  );
};

// Main PhotoGallery Component
interface PhotoGalleryProps {
  images: GalleryImage[];
  onImagesChange: (images: GalleryImage[]) => void;
  maxImages?: number;
  allowedTypes?: string[];
  maxSize?: number; // in MB
  accessibilityDescription?: string;
  uploadToStorage?: (files: File[]) => Promise<{ urls: string[]; error: Error | null }>;
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  images,
  onImagesChange,
  maxImages = 10,
  allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  maxSize = 5,
  accessibilityDescription = 'Food item photo gallery with drag and drop reordering',
  uploadToStorage,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>(
    'idle',
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = images.findIndex((img) => img.id === active.id);
      const newIndex = images.findIndex((img) => img.id === over.id);

      const newImages = arrayMove(images, oldIndex, newIndex);
      onImagesChange(newImages);
    }
  };

  const handleRemoveImage = (id: string) => {
    onImagesChange(images.filter((img) => img.id !== id));
  };

  const handleAltChange = (id: string, alt: string) => {
    onImagesChange(images.map((img) => (img.id === id ? { ...img, alt } : img)));
  };

  // Common function to process and add files
  const processFiles = async (files: FileList | File[]) => {
    const fileList = [...files];
    const validFiles = fileList.filter(
      (file) => allowedTypes.includes(file.type) && file.size <= maxSize * 1024 * 1024,
    );

    if (validFiles.length > 0) {
      if (uploadToStorage) {
        // Upload to storage and get URLs
        setUploadStatus('uploading');

        try {
          const result = await uploadToStorage(validFiles);

          if (result.error) {
            logError('Upload error:', result.error);
            setUploadStatus('error');
            return;
          }

          const newImages = result.urls.map((url, index) => ({
            id: `stored-${Date.now()}-${index}`,
            url,
            name: validFiles[index].name,
            alt: `Food item ${images.length + index + 1}`,
          }));

          onImagesChange([...images, ...newImages]);
          setUploadStatus('success');
        } catch (error) {
          logError('Unexpected upload error:', error);
          setUploadStatus('error');
        } finally {
          setTimeout(() => setUploadStatus('idle'), 2000);
        }
      } else {
        // Use temporary URLs for local preview
        const newImages = validFiles.slice(0, maxImages - images.length).map((file, index) => ({
          id: `temp-${Date.now()}-${index}`,
          url: URL.createObjectURL(file),
          file,
          name: file.name,
          alt: `Food item ${images.length + index + 1}`,
        }));

        onImagesChange([...images, ...newImages]);
      }
    }
  };

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        await processFiles(e.dataTransfer.files);
      }
    },
    [processFiles, setDragActive],
  );

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(e.target.files);
    }
  };

  // Clean up object URLs when component unmounts or images change
  useEffect(() => {
    return () => {
      for (const img of images) {
        if (img.url?.startsWith('blob:')) {
          URL.revokeObjectURL(img.url);
        }
      }
    };
  }, [images]);

  return (
    <div className="w-full" role="region" aria-label={accessibilityDescription}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="mb-4">
          <SortableContext
            items={images.map((img) => img.id)}
            strategy={verticalListSortingStrategy}
          >
            <div
              className={cn(
                'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4',
                'transition-colors',
                dragActive ? 'ring-2 ring-blue-500 rounded-lg p-2' : '',
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={(e) => void handleDrop(e)}
              role="list"
              aria-label="Sortable gallery of food item images"
            >
              {images.map((image, index) => {
                const altText = image.alt ?? `Food item ${index + 1}`;
                return (
                  <SortableImageItem
                    key={image.id}
                    image={image}
                    index={index}
                    onRemove={handleRemoveImage}
                    altText={altText}
                    onAltChange={handleAltChange}
                  />
                );
              })}
            </div>
          </SortableContext>
        </div>

        <div className="relative">
          {uploadStatus === 'uploading' && (
            <div
              className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 rounded-lg"
              role="alert"
              aria-live="polite"
            >
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                <p>Uploading images...</p>
              </div>
            </div>
          )}

          {uploadStatus === 'error' && (
            <div
              className="absolute inset-0 bg-red-500 bg-opacity-80 flex items-center justify-center z-50 rounded-lg"
              role="alert"
              aria-live="assertive"
            >
              <div className="text-white text-center px-4">
                <p>Error uploading images. Please try again.</p>
              </div>
            </div>
          )}

          {uploadStatus === 'success' && (
            <div
              className="absolute inset-0 bg-green-500 bg-opacity-80 flex items-center justify-center z-50 rounded-lg"
              role="status"
              aria-live="polite"
            >
              <div className="text-white text-center px-4">
                <p>Images uploaded successfully!</p>
              </div>
            </div>
          )}

          {images.length < maxImages && (
            <div className="flex flex-col items-center">
              <label
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-700 hover:bg-gray-100 transition-colors relative overflow-hidden"
                aria-label="Upload new images"
                htmlFor="gallery-upload"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6 z-10">
                  <Upload className="w-8 h-8 mb-2 text-gray-500" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {allowedTypes.join(', ')}, max {maxSize}MB
                  </p>
                </div>
                <input
                  id="gallery-upload"
                  type="file"
                  className="hidden"
                  multiple
                  accept={allowedTypes.join(',')}
                  onChange={(e) => void handleFileInput(e)}
                  aria-label="Select images to upload"
                />
              </label>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400" aria-live="polite">
                {images.length} of {maxImages} images added
              </p>
            </div>
          )}
        </div>
      </DndContext>
    </div>
  );
};

export default PhotoGallery;
