import { logMessage, logWarning } from '@/lib/logging';

export interface LLMResponse {
  success: boolean;
  data?: string;
  error?: string;
  tokensUsed?: number;
  provider?: 'ollama' | 'openrouter';
  model?: string;
}

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

const OLLAMA_CLOUD_URL =
  process.env.OLLAMA_CLOUD_URL ?? 'https://ollama.com/v1/chat/completions';
const OLLAMA_CLOUD_API_KEY = process.env.OLLAMA_CLOUD_API_KEY ?? '';
const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? '';

const DEFAULT_MODEL = 'gemma4:31b';
const CALL_TIMEOUT_MS = 30_000;
const OPENROUTER_FREE_MODEL = 'openrouter/free';
const OPENROUTER_RETRY_MAX = 3;
const OPENROUTER_MIN_INTERVAL_MS = 3000;

let lastOpenRouterCall = 0;

async function callOllama(
  messages: LLMMessage[],
  config: LLMConfig,
): Promise<LLMResponse> {
  if (!OLLAMA_CLOUD_API_KEY) {
    return { success: false, error: 'OLLAMA_CLOUD_API_KEY not configured' };
  }

  const model = config.model ?? DEFAULT_MODEL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);

  try {
    const body: Record<string, unknown> = {
      model,
      messages,
      temperature: config.temperature ?? 0,
      max_tokens: config.maxTokens ?? 65_536,
    };

    if (config.jsonMode !== false) {
      body.response_format = { type: 'json_object' };
    }

    const response = await fetch(OLLAMA_CLOUD_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OLLAMA_CLOUD_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, error: `Ollama HTTP ${response.status}: ${errText.slice(0, 200)}` };
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { total_tokens?: number };
    };
    const content = data.choices?.[0]?.message?.content;
    const tokensUsed = data.usage?.total_tokens ?? 0;

    if (!content) {
      return { success: false, error: 'Ollama returned empty content' };
    }

    return { success: true, data: content, tokensUsed, provider: 'ollama', model };
  } catch (error) {
    clearTimeout(timeout);
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Ollama error: ${msg}` };
  }
}

export async function callOpenRouterDirect(
  messages: LLMMessage[],
  config: LLMConfig,
): Promise<LLMResponse> {
  if (!OPENROUTER_API_KEY) {
    return { success: false, error: 'OPENROUTER_API_KEY not configured' };
  }

  const model = config.model ?? OPENROUTER_FREE_MODEL;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= OPENROUTER_RETRY_MAX; attempt++) {
    const elapsed = Date.now() - lastOpenRouterCall;
    if (elapsed < OPENROUTER_MIN_INTERVAL_MS) {
      await new Promise((resolve) => setTimeout(resolve, OPENROUTER_MIN_INTERVAL_MS - elapsed));
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);

    try {
      const body: Record<string, unknown> = {
        model,
        messages,
        temperature: config.temperature ?? 0,
        max_tokens: config.maxTokens ?? 65_536,
      };

      if (config.jsonMode !== false) {
        body.response_format = { type: 'json_object' };
      }

      const response = await fetch(OPENROUTER_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://truckfull.food',
          'X-Title': 'TruckFull Research',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        lastOpenRouterCall = Date.now();
        const data = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
          usage?: { total_tokens?: number };
        };
        const content = data.choices?.[0]?.message?.content;
        const tokensUsed = data.usage?.total_tokens ?? 0;

        if (!content) {
          return { success: false, error: 'OpenRouter returned empty content' };
        }

        return { success: true, data: content, tokensUsed, provider: 'openrouter', model };
      }

      if (response.status === 429) {
        const retryAfter = Number(response.headers.get('Retry-After') ?? '5');
        const waitMs = Math.min(retryAfter * 1000, 60_000);
        lastError = new Error(`OpenRouter 429: retry after ${retryAfter}s`);
        logWarning(`OpenRouter 429, retry ${attempt + 1}/${OPENROUTER_RETRY_MAX} after ${retryAfter}s`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }

      lastOpenRouterCall = Date.now();
      const errText = await response.text();
      return { success: false, error: `OpenRouter HTTP ${response.status}: ${errText.slice(0, 200)}` };
    } catch (error) {
      clearTimeout(timeout);
      lastOpenRouterCall = Date.now();
      lastError = error instanceof Error ? error : new Error('Unknown OpenRouter error');
      if (attempt < OPENROUTER_RETRY_MAX) {
        const waitMs = 1000 * (attempt + 1);
        logWarning(`OpenRouter error, retry ${attempt + 1}/${OPENROUTER_RETRY_MAX} after ${waitMs}ms`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }
  }

  const msg = lastError?.message ?? 'OpenRouter failed after retries';
  return { success: false, error: msg };
}

export const DEFAULT_LLM_CONFIG: LLMConfig = {
  temperature: 0,
  maxTokens: 65_536,
  jsonMode: true,
};

export async function callLLM(
  messages: LLMMessage[],
  config: LLMConfig = {},
): Promise<LLMResponse> {
  const ollamaResult = await callOllama(messages, config);

  if (ollamaResult.success) {
    logMessage(`callLLM: ${config.model ?? DEFAULT_MODEL} (ollama) succeeded`);
    return ollamaResult;
  }

  logWarning(`callLLM: Ollama failed: ${ollamaResult.error?.slice(0, 100)}`);

  if (OPENROUTER_API_KEY) {
    logMessage('callLLM: Trying OpenRouter free...');
    const orResult = await callOpenRouterDirect(messages, {
      ...config,
      model: OPENROUTER_FREE_MODEL,
    });
    if (orResult.success) {
      logMessage('callLLM: openrouter/free succeeded');
      return orResult;
    }
    logWarning(`callLLM: OpenRouter failed: ${orResult.error?.slice(0, 100)}`);
  }

  const finalError = `All LLM providers failed. Last: ${ollamaResult.error}`;
  logWarning(finalError);
  return { success: false, error: finalError };
}
