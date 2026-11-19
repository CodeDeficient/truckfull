/**
 * Webhook Payload Test Fixtures
 *
 * Realistic Meta webhook payloads for unit and integration testing.
 * Based on the real Facebook Graph API webhook format.
 */

/** Valid page post webhook — real Meta structure */
export const VALID_PAGE_POST_WEBHOOK = {
  object: 'page',
  entry: [
    {
      id: '123456789_01234567',
      time: 1739298000,
      changes: [
        {
          field: 'feed',
          value: {
            item: 'post',
            post_id: '987654321_987654321',
            created_time: '2025-02-11T15:30:00+0000',
            message: "We're at Main St & 5th Ave today until 7pm! Tacos 🌮",
            permalink_url: 'https://facebook.com/123/posts/987654321',
            attachments: {
              data: [
                {
                  media: {
                    image: {
                      src: 'https://scontent.facebook.com/v/123.jpg',
                    },
                  },
                },
              ],
            },
          },
        },
      ],
    },
  ],
} as const;

/** Non-page object webhook (should be ignored) */
export const INVALID_PAYLOAD_OBJECT = {
  object: 'user',
  entry: [],
} as const;

/** Webhook with multiple entries and changes */
export const MULTI_ENTRY_WEBHOOK = {
  object: 'page',
  entry: [
    {
      id: '123456789',
      time: 1739298000,
      changes: [
        {
          field: 'feed',
          value: {
            item: 'post',
            post_id: 'post_001',
            message: 'First post',
          },
        },
        {
          field: 'feed',
          value: {
            item: 'post',
            post_id: 'post_002',
            message: 'Second post',
          },
        },
      ],
    },
    {
      id: '987654321',
      time: 1739298001,
      changes: [
        {
          field: 'feed',
          value: {
            item: 'post',
            post_id: 'post_003',
            message: 'Third post from another page',
          },
        },
      ],
    },
  ],
} as const;

/** Webhook with non-feed change (messages) — should be filtered */
export const NON_FEED_CHANGE_WEBHOOK = {
  object: 'page',
  entry: [
    {
      id: '123456789',
      time: 1739298000,
      changes: [
        {
          field: 'messages',
          value: { message: 'DM text' },
        },
      ],
    },
  ],
} as const;

// --- Malformed JSON Payloads (as raw strings) ---

/** Trailing comma after last property */
export const MALFORMED_TRAILING_COMMA =
  '{"object":"page","entry":[{"id":"123","time":1739298000,"changes":[],}]}';

/** Single quotes instead of double quotes */
export const MALFORMED_SINGLE_QUOTES = "{'object':'page','entry':[]}";

/** Missing closing bracket */
export const MALFORMED_TRUNCATED = '{"object":"page","entry":[{"id":"123","time":1739298000';

/** Missing quotes around keys */
export const MALFORMED_UNQUOTED_KEYS = '{object:"page",entry:[]}';

/** Valid JSON (for baseline comparison in repair tests) */
export const VALID_JSON_STRING = '{"object":"page","entry":[]}';

/**
 * Helper: generate HMAC signature for a payload string.
 * Uses the same algorithm as the production webhook handler.
 */
export function generateTestSignature(payload: string, secret: string = 'test-app-secret'): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require('crypto') as typeof import('crypto');
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `sha256=${hmac}`;
}
