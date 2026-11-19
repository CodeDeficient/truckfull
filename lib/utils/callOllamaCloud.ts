import type { OpenCodeGoRequest, OpenCodeGoResult } from '@/lib/utils/callOpenCodeGo';

export const OLLAMA_CLOUD_CHAT_URL = 'https://ollama.com/v1/chat/completions';

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_TOKENS = 3000;
const ERROR_BODY_LIMIT = 200;

export interface OllamaCloudDeps {
  readonly apiKey?: string;
  readonly url?: string;
  readonly fetchImpl?: typeof fetch;
}

interface ChatCompletionResponse {
  readonly choices?: ReadonlyArray<{ readonly message?: { readonly content?: string | null } }>;
  readonly usage?: { readonly prompt_tokens?: number; readonly completion_tokens?: number };
}

function buildRequestInit(request: OpenCodeGoRequest, apiKey: string): RequestInit {
  return {
    method: 'POST',
    signal: AbortSignal.timeout(request.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'truckfull-pipeline/1.0',
    },
    body: JSON.stringify({
      model: request.model,
      temperature: 0,
      max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
      messages: [
        { role: 'system', content: request.system },
        { role: 'user', content: request.user },
      ],
    }),
  };
}

async function readResult(response: Response): Promise<OpenCodeGoResult> {
  if (!response.ok) {
    const body = await response.text();
    return {
      success: false,
      status: response.status,
      error: `Ollama Cloud HTTP ${response.status}: ${body.slice(0, ERROR_BODY_LIMIT)}`,
    };
  }
  const data = (await response.json()) as ChatCompletionResponse;
  const text = data.choices?.[0]?.message?.content ?? '';
  if (!text) {
    return {
      success: false,
      status: response.status,
      error: 'Ollama Cloud returned empty content',
    };
  }
  return {
    success: true,
    text,
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
  };
}

export async function callOllamaCloud(
  request: OpenCodeGoRequest,
  deps: OllamaCloudDeps = {},
): Promise<OpenCodeGoResult> {
  const apiKey = deps.apiKey ?? process.env.OLLAMA_CLOUD_API_KEY;
  if (!apiKey) return { success: false, error: 'OLLAMA_CLOUD_API_KEY not configured' };
  const url = deps.url ?? process.env.OLLAMA_CLOUD_URL ?? OLLAMA_CLOUD_CHAT_URL;
  const fetchImpl = deps.fetchImpl ?? fetch;
  try {
    return await readResult(await fetchImpl(url, buildRequestInit(request, apiKey)));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Ollama Cloud error: ${message}` };
  }
}
