import React, { useState, useRef, ChangeEvent } from 'react';
import { processImage } from './TruckBannerUpload/imageUtils';
import { logError } from '@/lib/logging';

interface TruckBannerUploadProps {
  onUpload: (processedFile: File) => void;
}

// Define the expected aspect ratio (e.g., 16:9 for banners)
const EXPECTED_ASPECT_RATIO = 16 / 9;

const TruckBannerUpload: React.FC<TruckBannerUploadProps> = ({ onUpload }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPEG, PNG, etc.).');
      return;
    }

    setSelectedFile(file);
    setError(null);

    // Generate preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Optionally, validate aspect ratio immediately after selection
    validateAspectRatio(file, EXPECTED_ASPECT_RATIO);
  };

  const validateAspectRatio = (file: File, expectedRatio: number) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);

    const handleLoad = () => {
      const actualRatio = img.width / img.height;
      const tolerance = 0.1; // Allow 10% deviation
      if (Math.abs(actualRatio - expectedRatio) > tolerance) {
        setError(
          `Image aspect ratio (${actualRatio.toFixed(2)}) is not close to the required ${expectedRatio.toFixed(2)} (e.g., 16:9).`,
        );
      } else {
        setError(null);
      }
      URL.revokeObjectURL(img.src); // Clean up
    };

    img.addEventListener('load', handleLoad);
  };

  const handleOptimizeAndUpload = async () => {
    if (!selectedFile) {
      setError('No file selected.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Process the image: resize and compress
      // Target dimensions can be adjusted as needed, e.g., max 1920x1080 for large banners
      const targetWidth = 1920;
      const targetHeight = Math.round(targetWidth / EXPECTED_ASPECT_RATIO);
      // Target max file size in MB
      const targetFileSizeMB = 2;

      const processedFile = await processImage(
        selectedFile,
        targetWidth,
        targetHeight,
        targetFileSizeMB,
      );

      // Call the parent-provided callback with the processed file
      onUpload(processedFile);

      // Optionally, update the preview with the processed image
      // const processedUrl = URL.createObjectURL(processedFile);
      // setPreviewUrl(processedUrl);
    } catch (error_) {
      logError('Error processing image:', error_);
      setError('Failed to process image. Please try another file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Reset input value
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Upload Truck Banner/Header Photo</h3>
      <label
        htmlFor="banner-upload"
        aria-label="Upload new images"
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors w-full block"
      >
        {previewUrl == null ? (
          <div className="space-y-2">
            <p className="text-gray-600">Click or drag an image to upload</p>
            <p className="text-sm text-gray-500">
              Recommended: 16:9 aspect ratio (e.g., 1920x1080), Max 5MB
            </p>
          </div>
        ) : (
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Banner preview" className="max-w-full max-h-48 rounded" />
          </div>
        )}
        <input
          id="banner-upload"
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*"
        />
      </label>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {selectedFile && (
        <div className="flex space-x-2">
          <button
            onClick={() => void handleOptimizeAndUpload()}
            disabled={isProcessing}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : 'Optimize & Upload'}
          </button>
          <button
            onClick={clearSelection}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Clear
          </button>
        </div>
      )}

      {isProcessing && <p className="text-blue-600">Processing image...</p>}
    </div>
  );
};

export default TruckBannerUpload;
