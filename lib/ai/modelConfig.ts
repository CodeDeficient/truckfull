export const PRIORITY_MODELS = ['gemma4:31b'] as const;

export const FALLBACK_MODELS = [
  'openai/gpt-oss-20b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'meta-llama/llama-3.3-70b-instruct:free',
] as const;

// Ollama Cloud vision models (primary — no rate limits)
// gemma3:12b deprecated on Ollama Cloud July 15, 2026 — replaced with gemma3:27b
export const OLLAMA_VISION_MODELS = [
  'gemma3:27b',
] as const;

// OpenRouter free vision models (fallback when Ollama unavailable)
// nvidia/nemotron-nano-12b-v2-vl: ~1.4s, good extraction
// baidu/qianfan-ocr-fast: ~4.3s, excellent layout preservation
export const VISION_MODELS = [
  'nvidia/nemotron-nano-12b-v2-vl:free',
  'baidu/qianfan-ocr-fast:free',
] as const;

export const OCR_PROVIDERS = ['ollama', 'openrouter'] as const;
export type OcrProvider = (typeof OCR_PROVIDERS)[number];

export type ModelName =
  | (typeof PRIORITY_MODELS)[number]
  | (typeof FALLBACK_MODELS)[number]
  | (typeof OLLAMA_VISION_MODELS)[number]
  | (typeof VISION_MODELS)[number];

export const ALL_MODELS = [...PRIORITY_MODELS, ...FALLBACK_MODELS, ...OLLAMA_VISION_MODELS, ...VISION_MODELS] as const;

export function getBestTextModel(): string {
  return PRIORITY_MODELS[0];
}

export function getBestVisionModel(): string {
  return OLLAMA_VISION_MODELS[0];
}

export function getVisionModelFallbacks(): string[] {
  return [...OLLAMA_VISION_MODELS, ...VISION_MODELS];
}

export function getPrimaryOcrProvider(): OcrProvider {
  return OCR_PROVIDERS[0];
}

export function getOcrFallbackProvider(): OcrProvider | undefined {
  return OCR_PROVIDERS[1];
}
