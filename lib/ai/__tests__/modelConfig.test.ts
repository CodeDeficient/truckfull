import { describe, it, expect } from '@jest/globals';
import {
  PRIORITY_MODELS,
  FALLBACK_MODELS,
  OLLAMA_VISION_MODELS,
  VISION_MODELS,
  OCR_PROVIDERS,
  getBestTextModel,
  getBestVisionModel,
  getPrimaryOcrProvider,
  getOcrFallbackProvider,
  getVisionModelFallbacks,
} from '../modelConfig';

describe('modelConfig', () => {
  describe('PRIORITY_MODELS', () => {
    it('should contain gemma4:31b as first priority model', () => {
      expect(PRIORITY_MODELS[0]).toBe('gemma4:31b');
    });

    it('should be readonly tuple with at least one model', () => {
      expect(PRIORITY_MODELS.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('FALLBACK_MODELS', () => {
    it('should have at least one fallback model', () => {
      expect(FALLBACK_MODELS.length).toBeGreaterThanOrEqual(1);
    });

    it('should contain only free models', () => {
      expect(FALLBACK_MODELS.every((m) => m.endsWith(':free'))).toBe(true);
    });

    it('should have openai/gpt-oss-20b:free as first fallback', () => {
      expect(FALLBACK_MODELS[0]).toBe('openai/gpt-oss-20b:free');
    });
  });

  describe('OLLAMA_VISION_MODELS', () => {
    it('should contain gemma3:27b as first model', () => {
      expect(OLLAMA_VISION_MODELS[0]).toBe('gemma3:27b');
    });

    it('should contain only Ollama model names', () => {
      expect(OLLAMA_VISION_MODELS.every((m) => m.includes(':'))).toBe(true);
      expect(OLLAMA_VISION_MODELS.every((m) => !m.endsWith(':free'))).toBe(true);
    });
  });

  describe('VISION_MODELS (OpenRouter fallback)', () => {
    it('should contain only free OpenRouter models', () => {
      expect(VISION_MODELS.every((m) => m.endsWith(':free'))).toBe(true);
    });

    it('should contain nemotron as first model', () => {
      expect(VISION_MODELS[0]).toBe('nvidia/nemotron-nano-12b-v2-vl:free');
    });
  });

  describe('OCR_PROVIDERS', () => {
    it('should have ollama as primary provider', () => {
      expect(OCR_PROVIDERS[0]).toBe('ollama');
    });

    it('should have openrouter as fallback', () => {
      expect(OCR_PROVIDERS[1]).toBe('openrouter');
    });
  });

  describe('getBestTextModel', () => {
    it('should return first priority model (gemma4:31b)', () => {
      expect(getBestTextModel()).toBe('gemma4:31b');
    });
  });

  describe('getBestVisionModel', () => {
    it('should return first Ollama vision model', () => {
      expect(getBestVisionModel()).toBe('gemma3:27b');
    });
  });

  describe('getVisionModelFallbacks', () => {
    it('should return Ollama models first, then OpenRouter', () => {
      const fallbacks = getVisionModelFallbacks();
      expect(fallbacks[0]).toBe('gemma3:27b');
      expect(fallbacks.at(-1)).toBe('baidu/qianfan-ocr-fast:free');
    });
  });

  describe('getPrimaryOcrProvider', () => {
    it('should return ollama provider', () => {
      expect(getPrimaryOcrProvider()).toBe('ollama');
    });
  });

  describe('getOcrFallbackProvider', () => {
    it('should return openrouter as fallback', () => {
      expect(getOcrFallbackProvider()).toBe('openrouter');
    });
  });
});
