'use client';

import React from 'react';
import { PhotoGalleryProvider, usePhotoGallery } from '@/components/owner/PhotoGalleryProvider';
import PhotoGallery from '@/components/owner/PhotoGallery';
import { Button } from '@/components/ui/button';
import { usePhotoGallery as usePhotoGalleryHook } from '@/hooks/usePhotoGallery';
import { GalleryImage } from '@/components/owner/PhotoGallery';

// Example component showing how to use the PhotoGallery in a food truck menu context
const MenuItemPhotoGallery: React.FC = () => {
  const { images, dispatch } = usePhotoGallery();
  const { uploadImages, isUploading } = usePhotoGalleryHook();
  const userId = 'test-user-123'; // In a real app, this would come from auth context

  const handleImagesChange = (newImages: GalleryImage[]) => {
    dispatch({ type: 'REORDER_IMAGES', payload: newImages });
  };

  const handleSaveImages = async () => {
    if (images.length > 0) {
      // In a real application, you would get the authenticated user ID
      const result = await uploadImages(
        images.reduce<File[]>((acc, img) => {
          if (img.file) acc.push(img.file);
          return acc;
        }, []),
        userId,
      );

      if (result.success) {
        alert('Images uploaded successfully!');
      } else {
        alert(`Upload failed: ${result.error}`);
      }
    }
  };

  const handleUploadToStorage = async (files: File[]) => {
    const result = await uploadImages(files, userId);
    return result.success
      ? { urls: files.map(() => 'placeholder-url'), error: null }
      : { urls: [], error: new Error(result.error ?? 'Upload failed') };
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Menu Item Photo Gallery</h2>

      <PhotoGallery
        images={images}
        onImagesChange={handleImagesChange}
        maxImages={10}
        allowedTypes={['image/jpeg', 'image/png', 'image/webp']}
        maxSize={5}
        accessibilityDescription="Manage food item photos with drag and drop reordering"
        uploadToStorage={handleUploadToStorage}
      />

      <div className="mt-4 flex space-x-2">
        <Button
          onClick={() => {
            void handleSaveImages();
          }}
          disabled={isUploading || images.length === 0}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isUploading ? 'Uploading...' : 'Save Images'}
        </Button>

        <Button
          onClick={() => dispatch({ type: 'CLEAR_IMAGES' })}
          variant="outline"
          disabled={images.length === 0}
        >
          Clear All
        </Button>
      </div>

      <div className="mt-6">
        <h3 className="font-medium mb-2">Current Images ({images.length}):</h3>
        <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-300">
          {images.map((img, index) => (
            <li key={img.id}>
              {img.name ?? `Image ${index + 1}`} - {img.alt ?? 'No description'}
            </li>
          ))}
          {images.length === 0 && <li>No images added yet</li>}
        </ul>
      </div>
    </div>
  );
};

// Wrapper component that provides the context
const MenuItemPhotoGalleryWithContext: React.FC = () => {
  // Example initial images - in a real app you might load these from an API
  const initialImages: GalleryImage[] = [
    // {
    //   id: '1',
    //   url: 'https://example.com/food-item-1.jpg',
    //   name: 'Burger.jpg',
    //   alt: 'Delicious gourmet burger with toppings'
    // },
    // {
    //   id: '2',
    //   url: 'https://example.com/food-item-2.jpg',
    //   name: 'Pizza.jpg',
    //   alt: 'Freshly baked pizza with cheese and vegetables'
    // }
  ];

  return (
    <PhotoGalleryProvider initialImages={initialImages}>
      <MenuItemPhotoGallery />
    </PhotoGalleryProvider>
  );
};

export default MenuItemPhotoGalleryWithContext;
