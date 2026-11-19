import { describe, it, expect } from '@jest/globals';
import {
  TURNSTILE_ACTION,
  TURNSTILE_VERIFY_URL,
  evaluateTurnstileResult,
  getAllowedHostnames,
  isAllowedHostname,
  verifyTurnstileToken,
  type TurnstileSiteVerifyResponse,
} from '@/lib/security/turnstile';

const ALLOWED = ['truckfull.app', 'localhost', 'example.com'];

function passingResult(overrides: Partial<TurnstileSiteVerifyResponse> = {}): TurnstileSiteVerifyResponse {
  return {
    success: true,
    hostname: 'truckfull.app',
    action: TURNSTILE_ACTION,
    ...overrides,
  };
}

describe('getAllowedHostnames', () => {
  it('parses comma-separated hostnames, trimmed and lowercased', () => {
    const env = { TURNSTILE_ALLOWED_HOSTNAMES: 'TruckFull.app, localhost , 127.0.0.1' };
    expect(getAllowedHostnames(env)).toEqual(['truckfull.app', 'localhost', '127.0.0.1']);
  });

  it('returns an empty array when unset', () => {
    expect(getAllowedHostnames({})).toEqual([]);
  });

  it('returns an empty array when blank', () => {
    expect(getAllowedHostnames({ TURNSTILE_ALLOWED_HOSTNAMES: '  ' })).toEqual([]);
  });

  it('drops empty entries between commas', () => {
    expect(getAllowedHostnames({ TURNSTILE_ALLOWED_HOSTNAMES: 'a.com,,b.com' })).toEqual([
      'a.com',
      'b.com',
    ]);
  });
});

describe('isAllowedHostname', () => {
  it('accepts a hostname present in the allowlist', () => {
    expect(isAllowedHostname('truckfull.app', ALLOWED)).toBe(true);
  });

  it('accepts case-insensitively', () => {
    expect(isAllowedHostname('TruckFull.APP', ALLOWED)).toBe(true);
  });

  it('rejects a hostname not in the allowlist', () => {
    expect(isAllowedHostname('evil.example.net', ALLOWED)).toBe(false);
  });

  it('rejects undefined hostname', () => {
    expect(isAllowedHostname(undefined, ALLOWED)).toBe(false);
  });

  it('rejects when the allowlist is empty', () => {
    expect(isAllowedHostname('truckfull.app', [])).toBe(false);
  });
});

describe('evaluateTurnstileResult', () => {
  it('accepts a passing result with the signup action and allowed hostname', () => {
    const result = evaluateTurnstileResult(passingResult(), ALLOWED);
    expect(result).toEqual({ ok: true, hostname: 'truckfull.app', action: 'signup', testingKey: false });
  });

  it('rejects a non-passing result', () => {
    const result = evaluateTurnstileResult({ success: false, 'error-codes': ['invalid-input-response'] }, ALLOWED);
    expect(result).toEqual({ ok: false, reason: 'verification_failed' });
  });

  it('rejects a missing action for non-testing credentials', () => {
    const result = evaluateTurnstileResult(passingResult({ action: undefined }), ALLOWED);
    expect(result).toEqual({ ok: false, reason: 'wrong_action' });
  });

  it('rejects a wrong action for non-testing credentials', () => {
    const result = evaluateTurnstileResult(passingResult({ action: 'login' }), ALLOWED);
    expect(result).toEqual({ ok: false, reason: 'wrong_action' });
  });

  it('rejects a disallowed hostname even with a valid action', () => {
    const result = evaluateTurnstileResult(passingResult({ hostname: 'evil.example.net' }), ALLOWED);
    expect(result).toEqual({ ok: false, reason: 'wrong_hostname' });
  });

  it('rejects a missing hostname', () => {
    const result = evaluateTurnstileResult(passingResult({ hostname: undefined }), ALLOWED);
    expect(result).toEqual({ ok: false, reason: 'wrong_hostname' });
  });

  it('relaxes the action check for testing credentials but keeps the hostname check', () => {
    const result = evaluateTurnstileResult(
      passingResult({ action: undefined, metadata: { result_with_testing_key: true } }),
      ALLOWED,
    );
    expect(result).toEqual({ ok: true, hostname: 'truckfull.app', action: undefined, testingKey: true });
  });

  it('still rejects a disallowed hostname for testing credentials', () => {
    const result = evaluateTurnstileResult(
      passingResult({ hostname: 'evil.example.net', metadata: { result_with_testing_key: true } }),
      ALLOWED,
    );
    expect(result).toEqual({ ok: false, reason: 'wrong_hostname' });
  });

  it('rejects a malformed response', () => {
    const result = evaluateTurnstileResult(null as unknown as TurnstileSiteVerifyResponse, ALLOWED);
    expect(result).toEqual({ ok: false, reason: 'invalid_response' });
  });
});

describe('verifyTurnstileToken', () => {
  const SECRET = '0x0000000000000000000000000000000000000000';

  function fakeFetcher(response: {
    ok?: boolean;
    status?: number;
    body?: unknown;
    throws?: boolean;
  }): typeof fetch {
    return (async () => {
      if (response.throws) {
        throw new Error('network down');
      }
      return {
        ok: response.ok ?? true,
        status: response.status ?? 200,
        json: async () => response.body,
      } as unknown as Response;
    }) as typeof fetch;
  }

  it('posts the secret and token to the siteverify endpoint', async () => {
    let captured: { url: string; init: RequestInit } | undefined;
    const fetcher = (async (url: string, init?: RequestInit) => {
      captured = { url, init };
      return {
        ok: true,
        status: 200,
        json: async () => passingResult(),
      } as unknown as Response;
    }) as typeof fetch;

    const result = await verifyTurnstileToken('token-123', {
      fetcher,
      secretKey: SECRET,
      allowedHostnames: ALLOWED,
    });

    expect(result).toEqual({ ok: true, hostname: 'truckfull.app', action: 'signup', testingKey: false });
    expect(captured?.url).toBe(TURNSTILE_VERIFY_URL);
    const body = captured?.init?.body as URLSearchParams;
    expect(body.get('secret')).toBe(SECRET);
    expect(body.get('response')).toBe('token-123');
    expect(body.get('remoteip')).toBeNull();
  });

  it('sends the visitor IP as remoteip when provided', async () => {
    let captured: { init: RequestInit } | undefined;
    const fetcher = (async (url: string, init?: RequestInit) => {
      captured = { init };
      return {
        ok: true,
        status: 200,
        json: async () => passingResult(),
      } as unknown as Response;
    }) as typeof fetch;

    await verifyTurnstileToken('token-123', {
      fetcher,
      secretKey: SECRET,
      allowedHostnames: ALLOWED,
      remoteIp: '203.0.113.5',
    });

    const body = captured?.init?.body as URLSearchParams;
    expect(body.get('remoteip')).toBe('203.0.113.5');
  });

  it('uses AbortSignal.timeout for the siteverify call', async () => {
    let captured: { init: RequestInit } | undefined;
    const fetcher = (async (url: string, init?: RequestInit) => {
      captured = { init };
      return {
        ok: true,
        status: 200,
        json: async () => passingResult(),
      } as unknown as Response;
    }) as typeof fetch;

    await verifyTurnstileToken('token-123', {
      fetcher,
      secretKey: SECRET,
      allowedHostnames: ALLOWED,
    });

    expect(captured?.init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('returns siteverify_timeout when the fetch aborts', async () => {
    const fetcher = (async () => {
      throw new DOMException('The operation was aborted', 'TimeoutError');
    }) as typeof fetch;

    const result = await verifyTurnstileToken('token-123', {
      fetcher,
      secretKey: SECRET,
      allowedHostnames: ALLOWED,
    });
    expect(result).toEqual({ ok: false, reason: 'siteverify_timeout' });
  });

  it('returns missing_config when the secret key is absent', async () => {
    const result = await verifyTurnstileToken('token-123', {
      fetcher: fakeFetcher({ body: passingResult() }),
      secretKey: '',
      allowedHostnames: ALLOWED,
    });
    expect(result).toEqual({ ok: false, reason: 'missing_config' });
  });

  it('returns missing_config when the allowlist is empty', async () => {
    const result = await verifyTurnstileToken('token-123', {
      fetcher: fakeFetcher({ body: passingResult() }),
      secretKey: SECRET,
      allowedHostnames: [],
    });
    expect(result).toEqual({ ok: false, reason: 'missing_config' });
  });

  it('returns network_error when the fetch throws', async () => {
    const result = await verifyTurnstileToken('token-123', {
      fetcher: fakeFetcher({ throws: true }),
      secretKey: SECRET,
      allowedHostnames: ALLOWED,
    });
    expect(result).toEqual({ ok: false, reason: 'network_error' });
  });

  it('returns network_error when the response is not ok', async () => {
    const result = await verifyTurnstileToken('token-123', {
      fetcher: fakeFetcher({ ok: false, status: 500, body: {} }),
      secretKey: SECRET,
      allowedHostnames: ALLOWED,
    });
    expect(result).toEqual({ ok: false, reason: 'network_error' });
  });

  it('returns invalid_response when the body is not JSON', async () => {
    const fetcher = (async () => {
      return {
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('bad json');
        },
      } as unknown as Response;
    }) as typeof fetch;

    const result = await verifyTurnstileToken('token-123', {
      fetcher,
      secretKey: SECRET,
      allowedHostnames: ALLOWED,
    });
    expect(result).toEqual({ ok: false, reason: 'invalid_response' });
  });

  it('propagates evaluation failures (wrong action)', async () => {
    const result = await verifyTurnstileToken('token-123', {
      fetcher: fakeFetcher({ body: passingResult({ action: 'login' }) }),
      secretKey: SECRET,
      allowedHostnames: ALLOWED,
    });
    expect(result).toEqual({ ok: false, reason: 'wrong_action' });
  });
});
