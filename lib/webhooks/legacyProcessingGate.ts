/**
 * Gate for the legacy (pre-Meta-webhook) post processing pipeline.
 *
 * The legacy writer (`processPendingPosts` in
 * `lib/webhooks/postProcessingPipeline.ts`) is superseded by the canonical
 * Meta webhook path (`processFacebookPost`). These entry points remain only
 * for diagnostic use and are disabled by default in Production.
 */
export function isLegacyProcessingEnabled(): boolean {
  return process.env.ENABLE_LEGACY_POST_PROCESSING === 'true';
}
