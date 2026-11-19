/**
 * Pure decision logic for the event waitlist API route.
 *
 * Kept free of Supabase/Resend imports so tests exercise the real functions
 * without any mocking (mock-free-testing skill).
 */

/** RFC 5321 hard limit; prevents CPU burn on oversized strings before
 * format validation ever runs (the column itself is unbounded text). */
export const MAX_EMAIL_LENGTH = 254;

export interface WaitlistInsertOutcome {
  readonly status: number;
  readonly body: Record<string, unknown>;
  /** Whether support should be notified (genuinely new row only). */
  readonly notify: boolean;
}

/**
 * Normalize an email for storage: lowercase, trimmed. Returns null when the
 * input is not a string or exceeds the length cap — the caller rejects.
 */
export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const email = raw.trim().toLowerCase();
  if (email.length === 0 || email.length > MAX_EMAIL_LENGTH) return null;
  return email;
}

/**
 * Pure: map a Postgrest insert error to the HTTP outcome. Duplicate
 * submissions (unique violation on email+role) are idempotent success with
 * no support notification — the email is already on the waitlist.
 */
export function classifyWaitlistInsertError(error: {
  code?: string | null;
}): WaitlistInsertOutcome {
  if (error.code === '23505') {
    return { status: 200, body: { success: true, duplicate: true }, notify: false };
  }
  return { status: 500, body: { error: 'Failed to join waitlist' }, notify: false };
}
