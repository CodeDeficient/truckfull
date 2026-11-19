'use client';

import { useState, useCallback } from 'react';
import Tesseract from 'tesseract.js';

interface OCRResult {
  success: boolean;
  text?: string;
  confidence?: number;
  error?: string;
}

interface OCRProgress {
  status: string;
  progress: number;
}

/**
 * Client-side OCR hook using Tesseract.js
 * Runs entirely in the browser - no server costs or API limits
 */
export function useClientOCR() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<OCRProgress>({ status: '', progress: 0 });

  const extractText = useCallback(async (imageSource: File | string): Promise<OCRResult> => {
    setIsProcessing(true);
    setProgress({ status: 'Initializing OCR...', progress: 0 });

    try {
      // Convert File to data URL if needed
      let imageData: string | File = imageSource;

      if (imageSource instanceof File) {
        imageData = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.addEventListener('load', () => resolve(reader.result as string));
          reader.addEventListener('error', reject);
          reader.readAsDataURL(imageSource);
        });
      }

      const result = await Tesseract.recognize(imageData, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress({
              status: 'Reading text...',
              progress: Math.round(m.progress * 100),
            });
          } else if (m.status === 'loading language traineddata') {
            setProgress({
              status: 'Loading language data...',
              progress: Math.round(m.progress * 100),
            });
          } else {
            setProgress({
              status: m.status,
              progress: Math.round((m.progress || 0) * 100),
            });
          }
        },
      });

      setProgress({ status: 'Complete', progress: 100 });

      return {
        success: true,
        text: result.data.text,
        confidence: result.data.confidence,
      };
    } catch (error) {
      console.error('OCR Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OCR processing failed',
      };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    extractText,
    isProcessing,
    progress,
  };
}
