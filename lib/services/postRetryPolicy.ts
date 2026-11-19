/**
 * Manual retry policy for persisted Facebook posts.
 *
 * The canonical processor claims strictly pending -> processing. Reaching a
 * failed status requires a deliberate owner-driven requeue; every other
 * non-pending status is either owned by an active run, awaiting owner action,
 * or terminal, and must never be requeued by the manual retry endpoint.
 */

export type ManualRetryAction = 'process' | 'requeue' | 'non-retryable';

export function resolveManualRetryAction(status: string | null | undefined): ManualRetryAction {
  if (status === 'pending') {
    return 'process';
  }
  if (status === 'failed') {
    return 'requeue';
  }
  return 'non-retryable';
}
