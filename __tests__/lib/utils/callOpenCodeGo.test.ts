import { describe, expect, it } from '@jest/globals';
import { callOpenCodeGo, OPENCODE_GO_CHAT_URL } from '@/lib/utils/callOpenCodeGo';

interface Captured {
  url?: string;
  init?: RequestInit;
}

function fakeFetch(response: Response, captured: Captured = {}): typeof fetch {
  return async (input, init) => {
    captured.url = String(input);
    captured.init = init;
    return response;
  };
}

const REQUEST = { model: 'glm-5.3-flash', system: 'system prompt', user: 'listing text' };

describe('callOpenCodeGo', () => {
  it('sends a chat completion request with the session headers', async () => {
    const captured: Captured = {};
    const body = {
      choices: [{ message: { content: '{"ok":true}' } }],
      usage: { prompt_tokens: 12, completion_tokens: 5 },
    };
    const result = await callOpenCodeGo(REQUEST, {
      apiKey: 'test-key',
      fetchImpl: fakeFetch(new Response(JSON.stringify(body)), captured),
    });

    expect(result).toEqual({
      success: true,
      text: '{"ok":true}',
      inputTokens: 12,
      outputTokens: 5,
    });
    expect(captured.url).toBe(OPENCODE_GO_CHAT_URL);
    const headers = captured.init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer test-key');
    expect(headers['User-Agent']).toMatch(/^truckfull/);
    expect(headers['x-opencode-session']).toMatch(/^truckfull-/);
    expect(JSON.parse(String(captured.init?.body))).toMatchObject({
      model: 'glm-5.3-flash',
      temperature: 0,
      messages: [
        { role: 'system', content: 'system prompt' },
        { role: 'user', content: 'listing text' },
      ],
    });
  });

  it('fails without calling the API when no key is configured', async () => {
    const captured: Captured = {};
    const result = await callOpenCodeGo(REQUEST, {
      apiKey: '',
      fetchImpl: fakeFetch(new Response('{}'), captured),
    });
    expect(result).toEqual({ success: false, error: 'OPENCODE_GO_API_KEY not configured' });
    expect(captured.url).toBeUndefined();
  });

  it('reports HTTP errors with the status', async () => {
    const result = await callOpenCodeGo(REQUEST, {
      apiKey: 'test-key',
      fetchImpl: fakeFetch(new Response('rate limited', { status: 429 })),
    });
    expect(result).toEqual({
      success: false,
      status: 429,
      error: 'OpenCode Go HTTP 429: rate limited',
    });
  });

  it('treats an empty reply as a failure', async () => {
    const result = await callOpenCodeGo(REQUEST, {
      apiKey: 'test-key',
      fetchImpl: fakeFetch(
        new Response(JSON.stringify({ choices: [{ message: { content: '' } }] })),
      ),
    });
    expect(result).toMatchObject({ success: false, error: 'OpenCode Go returned empty content' });
  });

  it('turns network errors into a failed result', async () => {
    const result = await callOpenCodeGo(REQUEST, {
      apiKey: 'test-key',
      fetchImpl: async () => {
        throw new Error('socket hang up');
      },
    });
    expect(result).toEqual({ success: false, error: 'OpenCode Go error: socket hang up' });
  });
});
