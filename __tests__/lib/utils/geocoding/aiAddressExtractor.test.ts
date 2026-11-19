import { isAiExtractorAvailable } from '@/lib/utils/geocoding/aiAddressExtractor';

describe('aiAddressExtractor pure functions', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('isAiExtractorAvailable', () => {
    it('returns false when no LLM provider is configured', () => {
      delete process.env.OLLAMA_CLOUD_API_KEY;
      delete process.env.OPENROUTER_API_KEY;
      expect(isAiExtractorAvailable()).toBe(false);
    });

    it('returns true when OLLAMA_CLOUD_API_KEY is set (primary)', () => {
      delete process.env.OPENROUTER_API_KEY;
      process.env.OLLAMA_CLOUD_API_KEY = 'ollama-key';
      expect(isAiExtractorAvailable()).toBe(true);
    });

    it('returns true when only OPENROUTER_API_KEY is set (fallback)', () => {
      delete process.env.OLLAMA_CLOUD_API_KEY;
      process.env.OPENROUTER_API_KEY = 'or-key';
      expect(isAiExtractorAvailable()).toBe(true);
    });

    it('returns true when both providers are configured', () => {
      process.env.OLLAMA_CLOUD_API_KEY = 'ollama-key';
      process.env.OPENROUTER_API_KEY = 'or-key';
      expect(isAiExtractorAvailable()).toBe(true);
    });
  });
});
