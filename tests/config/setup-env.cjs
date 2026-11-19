// Unified environment setup for Jest tests

// Polyfill Request API for NextRequest usage in API route tests
// This must be loaded before any Next.js imports
class MockRequest {
  constructor(input, init) {
    // Create writable properties
    Object.defineProperty(this, 'url', {
      value: typeof input === 'string' ? input : input.url,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(this, 'method', {
      value: init?.method || (typeof input === 'string' ? 'GET' : input.method),
      writable: true,
      configurable: true,
    });
    Object.defineProperty(this, 'headers', {
      value: new Headers(init?.headers),
      writable: true,
      configurable: true,
    });
    Object.defineProperty(this, 'body', {
      value: init?.body,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(this, 'cache', {
      value: init?.cache || 'default',
      writable: true,
      configurable: true,
    });
    Object.defineProperty(this, 'credentials', {
      value: init?.credentials || 'same-origin',
      writable: true,
      configurable: true,
    });
    Object.defineProperty(this, 'integrity', {
      value: init?.integrity || '',
      writable: true,
      configurable: true,
    });
    Object.defineProperty(this, 'mode', {
      value: init?.mode || 'cors',
      writable: true,
      configurable: true,
    });
    Object.defineProperty(this, 'redirect', {
      value: init?.redirect || 'follow',
      writable: true,
      configurable: true,
    });
    Object.defineProperty(this, 'referrer', {
      value: init?.referrer || 'about:client',
      writable: true,
      configurable: true,
    });
    Object.defineProperty(this, 'referrerPolicy', {
      value: init?.referrerPolicy || '',
      writable: true,
      configurable: true,
    });
    Object.defineProperty(this, 'signal', {
      value: init?.signal,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(this, 'keepalive', {
      value: init?.keepalive || false,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(this, 'bodyUsed', {
      value: false,
      writable: true,
      configurable: true,
    });
  }

  async json() {
    if (typeof this.body === 'string') {
      try {
        return JSON.parse(this.body);
      } catch {
        return this.body;
      }
    }
    return {};
  }

  async text() {
    return typeof this.body === 'string' ? this.body : '';
  }

  async blob() {
    return new Blob();
  }

  async formData() {
    return new FormData();
  }

  async arrayBuffer() {
    return new ArrayBuffer(0);
  }

  clone() {
    const copy = new MockRequest(this.url, {
      method: this.method,
      headers: this.headers,
      body: this.body,
      signal: this.signal,
    });
    return copy;
  }
}

global.Request = MockRequest;

// Polyfill TextEncoder/TextDecoder for jsdom environment (needed by resend package)
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = class TextEncoder {
    encode(input) {
      return new Uint8Array(Array.from(input).map((c) => c.charCodeAt(0)));
    }
  };
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = class TextDecoder {
    decode(bytes) {
      return Array.from(new Uint8Array(bytes))
        .map((b) => String.fromCharCode(b))
        .join('');
    }
  };
}

// Polyfill Response API for NextResponse usage in API route tests
class MockResponse {
  constructor(body = null, init = {}) {
    Object.defineProperty(this, 'status', {
      value: init.status || 200,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(this, 'statusText', {
      value: init.statusText || 'OK',
      writable: true,
      configurable: true,
    });
    Object.defineProperty(this, 'headers', {
      value: new Headers(init.headers),
      writable: true,
      configurable: true,
    });
    Object.defineProperty(this, 'body', {
      value: body,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(this, 'ok', {
      value: (init.status || 200) >= 200 && (init.status || 200) < 300,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(this, 'type', {
      value: init.type || 'basic',
      writable: true,
      configurable: true,
    });
    Object.defineProperty(this, 'redirected', {
      value: init.redirected || false,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(this, 'url', {
      value: init.url || '',
      writable: true,
      configurable: true,
    });
    Object.defineProperty(this, 'bodyUsed', {
      value: false,
      writable: true,
      configurable: true,
    });
  }

  async json() {
    if (typeof this.body === 'string') {
      return JSON.parse(this.body);
    }
    return this.body;
  }

  async text() {
    return typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
  }

  async blob() {
    return new Blob();
  }

  async formData() {
    return new FormData();
  }

  async arrayBuffer() {
    return new ArrayBuffer(0);
  }

  clone() {
    return new MockResponse(this.body, {
      status: this.status,
      statusText: this.statusText,
      headers: this.headers,
    });
  }

  static json(data, init = {}) {
    return new MockResponse(JSON.stringify(data), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });
  }
}

global.Response = MockResponse;

// Load environment variables from appropriate files
const path = require('path');
const { config } = require('dotenv');

// Load from .env.local file first (using dotenv CLI package for compatibility)
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  const envConfig = config({ path: envPath });
  if (envConfig.parsed) {
    Object.assign(process.env, envConfig.parsed);
  }
} catch (error) {
  console.warn('dotenv.config failed:', error.message);
}

// Also load from test-specific .env file if it exists, to allow test-specific overrides
const testEnvPath = path.resolve(process.cwd(), 'tests/.env.test');
try {
  const testEnvConfig = config({ path: testEnvPath });
  // Merge test env with main env (test env overrides .env.local)
  if (testEnvConfig.parsed) {
    Object.assign(process.env, testEnvConfig.parsed);
  }
} catch (error) {
  // It's OK if test-specific env doesn't exist
}

// Ensure required environment variables for tests are set (with fallbacks)
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
}
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}
if (!process.env.BASE_URL) {
  process.env.BASE_URL = 'http://localhost:3000';
}
if (!process.env.NEXT_PUBLIC_APP_URL) {
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
}
