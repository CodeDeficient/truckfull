import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { GalleryImage } from './PhotoGallery';

// Define the context type
interface PhotoGalleryContextType {
  images: GalleryImage[];
  dispatch: React.Dispatch<GalleryAction>;
}

// Define action types
type GalleryAction =
  | { type: 'ADD_IMAGES'; payload: GalleryImage[] }
  | { type: 'REMOVE_IMAGE'; payload: string }
  | { type: 'UPDATE_IMAGE_ALT'; payload: { id: string; alt: string } }
  | { type: 'REORDER_IMAGES'; payload: GalleryImage[] }
  | { type: 'CLEAR_IMAGES' };

// Create the context
const PhotoGalleryContext = createContext<PhotoGalleryContextType | undefined>(undefined);

// Reducer function to manage gallery state
const galleryReducer = (state: GalleryImage[], action: GalleryAction): GalleryImage[] => {
  switch (action.type) {
    case 'ADD_IMAGES': {
      // Filter out duplicates based on URL
      const newImages = action.payload.filter(
        (newImg) => !state.some((existingImg) => existingImg.url === newImg.url),
      );
      return [...state, ...newImages];
    }

    case 'REMOVE_IMAGE': {
      return state.filter((img) => img.id !== action.payload);
    }

    case 'UPDATE_IMAGE_ALT': {
      return state.map((img) =>
        img.id === action.payload.id ? { ...img, alt: action.payload.alt } : img,
      );
    }

    case 'REORDER_IMAGES': {
      return action.payload;
    }

    case 'CLEAR_IMAGES': {
      // Revoke object URLs for temporary images
      for (const img of state) {
        if (img.url?.startsWith('blob:')) {
          URL.revokeObjectURL(img.url);
        }
      }
      return [];
    }

    default: {
      return state;
    }
  }
};

// Provider component
interface PhotoGalleryProviderProps {
  children: ReactNode;
  initialImages?: GalleryImage[];
}

export const PhotoGalleryProvider: React.FC<PhotoGalleryProviderProps> = ({
  children,
  initialImages = [],
}) => {
  const [images, dispatch] = useReducer(galleryReducer, initialImages);

  return (
    <PhotoGalleryContext.Provider value={{ images, dispatch }}>
      {children}
    </PhotoGalleryContext.Provider>
  );
};

// Custom hook to use the context
export const usePhotoGallery = (): PhotoGalleryContextType => {
  const context = useContext(PhotoGalleryContext);
  if (!context) {
    throw new Error('usePhotoGallery must be used within a PhotoGalleryProvider');
  }
  return context;
};
