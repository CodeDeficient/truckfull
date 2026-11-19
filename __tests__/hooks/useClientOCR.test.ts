import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';

const mockRecognize = jest.fn();

jest.unstable_mockModule('tesseract.js', () => ({
  default: {
    recognize: mockRecognize,
  },
}));

const { useClientOCR } = await import('@/hooks/useClientOCR');

describe('useClientOCR', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractText', () => {
    it('should return success with text when OCR succeeds', async () => {
      mockRecognize.mockResolvedValueOnce({
        data: {
          text: 'Extracted text',
          confidence: 95,
        },
      });

      const { result } = renderHook(() => useClientOCR());

      let extractResult;
      await act(async () => {
        extractResult = await result.current.extractText('test-image-data-url');
      });

      expect(result.current.isProcessing).toBe(false);
      expect(extractResult?.success).toBe(true);
      expect(extractResult?.text).toBe('Extracted text');
      expect(extractResult?.confidence).toBe(95);
    });

    it('should handle File input by converting to data URL', async () => {
      mockRecognize.mockResolvedValueOnce({
        data: {
          text: 'Text from file',
          confidence: 90,
        },
      });

      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const { result } = renderHook(() => useClientOCR());

      await act(async () => {
        await result.current.extractText(mockFile);
      });

      expect(mockRecognize).toHaveBeenCalled();
    });

    it('should handle OCR errors', async () => {
      mockRecognize.mockRejectedValueOnce(new Error('OCR processing failed'));

      const { result } = renderHook(() => useClientOCR());

      await act(async () => {
        await result.current.extractText('test-image');
      });

      expect(result.current.isProcessing).toBe(false);
    });
  });

  describe('progress tracking', () => {
    it('should track progress during OCR', async () => {
      let progressCallback: (progress: { status: string; progress: number }) => void;

      mockRecognize.mockImplementationOnce(
        (_image: string, _lang: string, options: { logger: (m: { status: string; progress: number }) => void }) => {
          progressCallback = options.logger;
          return Promise.resolve({
            data: { text: 'Test', confidence: 100 },
          });
        },
      );

      const { result } = renderHook(() => useClientOCR());

      await act(async () => {
        await result.current.extractText('test-image');
      });

      if (progressCallback) {
        await act(async () => {
          progressCallback({ status: 'recognizing text', progress: 0.5 });
        });
      }

      expect(result.current.progress.status).toBeDefined();
    });
  });
});
