import { randomUUID } from 'node:crypto';

export const OPENCODE_GO_CHAT_URL = 'https://opencode.ai/zen/go/v1/chat/completions';

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_TOKENS = 3000;
const ERROR_BODY_LIMIT = 200;
const SESSION_ID = `truckfull-${randomUUID()}`;

export interface OpenCodeGoRequest {
  readonly model: string;
  readonly system: string;
  readonly user: string;
  readonly maxTokens?: number;
  readonly timeoutMs?: number;
}

export interface OpenCodeGoDeps {
  readonly apiKey?: string;
  readonly fetchImpl?: typeof fetch;
}

export type OpenCodeGoResult =
  | {
      readonly success: true;
      readonly text: string;
      readonly inputTokens: number;
      readonly outputTokens: number;
    }
  | { readonly success: false; readonly error: string; readonly status?: number };

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
      'x-opencode-session': SESSION_ID,
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

export async function callOpenCodeGo(
  request: OpenCodeGoRequest,
  deps: OpenCodeGoDeps = {},
): Promise<OpenCodeGoResult> {
  const apiKey = deps.apiKey ?? process.env.OPENCODE_GO_API_KEY;
  if (!apiKey) return { success: false, error: 'OPENCODE_GO_API_KEY not configured' };
  const fetchImpl = deps.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl(OPENCODE_GO_CHAT_URL, buildRequestInit(request, apiKey));
    if (!response.ok) {
      const body = await response.text();
      return {
        success: false,
        status: response.status,
        error: `OpenCode Go HTTP ${response.status}: ${body.slice(0, ERROR_BODY_LIMIT)}`,
      };
    }
    const data = (await response.json()) as ChatCompletionResponse;
    const text = data.choices?.[0]?.message?.content ?? '';
    if (!text) {
      return {
        success: false,
        status: response.status,
        error: 'OpenCode Go returned empty content',
      };
    }
    return {
      success: true,
      text,
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: `OpenCode Go error: ${message}` };
  }
}
