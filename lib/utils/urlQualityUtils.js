/**
 * Update URL quality score based on job success/failure
 * @param {string} url - The URL to update
 * @param {'success' | 'failure'} result - The result of the operation
 */
export async function updateUrlQualityScore(url, result) {
  try {
    // Import getSupabaseAdmin dynamically to avoid circular dependencies
    const { getSupabaseAdmin } = await import('../supabase');

    if (!getSupabaseAdmin()) {
      return;
    }

    // Get current URL record
    const { data: urlRecord, error: fetchError } = await getSupabaseAdmin()
      .from('discovered_urls')
      .select('processing_attempts, quality_score')
      .eq('url', url)
      .limit(1);

    if (fetchError || !urlRecord || urlRecord.length === 0) {
      return;
    }

    const current = urlRecord[0];
    const currentAttempts = current.processing_attempts || 0;
    const currentScore = current.quality_score || 0.5;

    // Update based on result
    let newScore, newAttempts;
    if (result === 'success') {
      newScore = Math.min(1, currentScore + 0.2); // Increase quality score on success
      newAttempts = currentAttempts;
    } else {
      newScore = Math.max(0, currentScore - 0.3); // Decrease quality score on failure
      newAttempts = currentAttempts + 1;
    }

    // Update the record
    await getSupabaseAdmin()
      .from('discovered_urls')
      .update({
        quality_score: newScore,
        processing_attempts: newAttempts,
        last_processed_at: new Date().toISOString(),
      })
      .eq('url', url);
  } catch (error) {
    console.warn('[urlQualityUtils] Could not update URL quality score:', url, error);
  }
}
