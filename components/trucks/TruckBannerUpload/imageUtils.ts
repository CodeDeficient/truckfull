import { logError } from '@/lib/logging';
/**
 * imageUtils.ts
 * Utility functions for image processing: validation, resizing, and compression.
 */

/**
 * Converts a canvas to a blob using the specified format and quality
 */
const canvasToBlob = (canvas: HTMLCanvasElement, quality: number): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      'image/jpeg',
      quality,
    );
  });
};

/**
 * Finds the optimal quality level for image compression using binary search
 */
const findOptimalQuality = async (
  canvas: HTMLCanvasElement,
  targetSizeBytes: number,
  initialQuality: number,
): Promise<Blob> => {
  let low = 0.1;
  let high = initialQuality;
  let closestBlob: Blob;

  try {
    closestBlob = await canvasToBlob(canvas, initialQuality);
  } catch (error_) {
    logError('Error getting initial blob:', error_);
    throw new Error('Failed to process image');
  }

  while (low < high) {
    const mid = (low + high) / 2;

    try {
      const candidateBlob = await canvasToBlob(canvas, mid);

      if (candidateBlob.size <= targetSizeBytes) {
        closestBlob = candidateBlob;
        low = mid + 0.01; // Slightly increase low to find a potentially better quality
      } else {
        high = mid - 0.01;
      }
    } catch (error_) {
      logError('Error during quality adjustment:', error_);
      // If conversion fails at a certain quality, try a lower one
      high = mid - 0.01;
    }
  }

  return closestBlob;
};

/**
 * Processes an image by resizing it to a target dimension and compressing it to a target file size.
 * @param file - The input File object.
 * @param targetWidth - The desired width after resizing.
 * @param targetHeight - The desired height after resizing.
 * @param targetFileSizeMB - The target file size in megabytes for compression.
 * @returns A Promise resolving to the processed File object.
 */
export const processImage = async (
  file: File,
  targetWidth: number,
  targetHeight: number,
  targetFileSizeMB: number,
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);

    const cleanup = () => {
      URL.revokeObjectURL(img.src);
    };

    const handleImageLoad = () => {
      void (async () => {
        cleanup();

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get 2D context from canvas.'));
          return;
        }

        // Step 1: Resize the image to the target dimensions
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        try {
          // Convert to Blob with initial quality (e.g., 0.9 for JPEG)
          const quality = 0.9;
          const resizedBlob = await canvasToBlob(canvas, quality);

          // Step 2: Check if the resized image already meets the target size
          const targetSizeBytes = targetFileSizeMB * 1024 * 1024; // Convert MB to bytes
          if (resizedBlob.size <= targetSizeBytes) {
            resolve(new File([resizedBlob], file.name, { type: 'image/jpeg' }));
            return;
          }

          // Binary search for the optimal quality level to meet the target size
          const optimalBlob = await findOptimalQuality(canvas, targetSizeBytes, quality);
          resolve(new File([optimalBlob], file.name, { type: 'image/jpeg' }));
        } catch (error_) {
          logError('Error processing image:', error_);
          reject(new Error('Failed to process image'));
        }
      })();
    };

    const handleImageError = () => {
      cleanup();
      reject(new Error('Failed to load image for processing.'));
    };

    img.addEventListener('load', handleImageLoad);
    img.addEventListener('error', handleImageError);
  });
};
