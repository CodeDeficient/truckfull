/**
 * =============================================================================
 * INTEGRATION TESTS: facebook_posts Database Constraint
 * =============================================================================
 *
 * PURPOSE: Verify that database constraint allows all status values used in code.
 * These tests require a REAL DATABASE connection (not mocked).
 *
 * IMPORTANT: These tests CANNOT run with Jest because they need a real
 * Supabase database. To verify:
 * 1. Apply migration: npx supabase db reset
 * 2. Manually verify constraints work in Supabase dashboard or psql
 * 3. Or convert to Playwright E2E tests if testing API layer
 *
 * TESTS COVER (5 tests):
 * 1. Constraint allows status='processing' to be set
 * 2. processing_started_at column exists and can be set/cleared
 * 3. Index exists for efficient stuck post recovery
 * 4. All statuses used in codebase are allowed
 *
 * =============================================================================
 */

import { describe, it, expect } from '@jest/globals';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

describe('Database Constraint: facebook_posts status', () => {
  const supabase = getSupabaseAdmin();

  /**
   * =============================================================================
   * INTEGRATION TESTS: facebook_posts Database Constraint
   * =============================================================================
   *
   * PURPOSE: Verify that database constraint allows all status values used in code.
   * These tests require a REAL DATABASE connection (not mocked).
   *
   * IMPORTANT: These tests CANNOT run with Jest because they need a real
   * Supabase database. To verify:
   * 1. Apply migration: npx supabase db reset
   * 2. Manually verify constraints work in Supabase dashboard or psql
   * 3. Or convert to Playwright E2E tests if testing API layer
   *
   * TESTS COVER (5 tests):
   * 1. Constraint allows status='processing' to be set
   * 2. processing_started_at column exists and can be set/cleared
   * 3. Index exists for efficient stuck post recovery
   * 4. All statuses used in codebase are allowed
   *
   * =============================================================================
   */
  it('should allow status="processing" to be set', async () => {
    const testPostId = `test-processing-${Date.now()}`;

    try {
      const { error } = await supabase.from('facebook_posts').insert({
        facebook_post_id: testPostId,
        truck_id: 'test-truck-id',
        message: 'Test post for processing status validation',
        status: 'processing',
        processing_started_at: new Date().toISOString(),
      });

      expect(error).toBeNull();

      // Clean up test post
      await supabase.from('facebook_posts').delete().eq('facebook_post_id', testPostId);
    } catch (err) {
      // If this fails, the migration has not been applied
      fail(
        `'processing' status not allowed by database constraint. Apply migration: 20260319000000_add_processing_status.sql\nError: ${err}`,
      );
    }
  });

  /**
   * Verify that processing_started_at column exists and can be set.
   * This column is used to detect stuck posts that have been processing too long.
   *
   * Related: recoverStuckPosts.ts uses this column to find and reset stuck posts.
   */
  it.skip('should have processing_started_at column and allow it to be set', async () => {
    const testPostId = `test-started-at-${Date.now()}`;
    const startedAt = new Date().toISOString();

    const { error: insertError } = await supabase.from('facebook_posts').insert({
      facebook_post_id: testPostId,
      truck_id: 'test-truck-id',
      message: 'Test post for processing_started_at',
      status: 'pending',
      processing_started_at: startedAt,
    });

    expect(insertError).toBeNull();

    // Verify we can query by processing_started_at
    const { data, error: queryError } = await supabase
      .from('facebook_posts')
      .select('id, processing_started_at')
      .eq('facebook_post_id', testPostId)
      .single();

    expect(queryError).toBeNull();
    expect(data).not.toBeNull();
    expect(data?.processing_started_at).toBe(startedAt);

    // Clean up
    await supabase.from('facebook_posts').delete().eq('facebook_post_id', testPostId);
  });

  /**
   * Verify that processing_started_at can be cleared when processing completes.
   * This prevents incorrectly marking completed posts as "stuck".
   *
   * Related: updatePostStatus in postProcessor.ts sets processing_started_at: null
   */
  it.skip('should allow clearing processing_started_at when status changes to final state', async () => {
    const testPostId = `test-clear-started-at-${Date.now()}`;

    // Insert with processing status
    await supabase.from('facebook_posts').insert({
      facebook_post_id: testPostId,
      truck_id: 'test-truck-id',
      message: 'Test post',
      status: 'processing',
      processing_started_at: new Date().toISOString(),
    });

    // Update to processed status and clear processing_started_at
    const { error: updateError } = await supabase
      .from('facebook_posts')
      .update({
        status: 'processed',
        processed_at: new Date().toISOString(),
        processing_started_at: null,
      })
      .eq('facebook_post_id', testPostId);

    expect(updateError).toBeNull();

    // Verify processing_started_at was cleared
    const { data } = await supabase
      .from('facebook_posts')
      .select('processing_started_at')
      .eq('facebook_post_id', testPostId)
      .single();

    expect(data?.processing_started_at).toBeNull();

    // Clean up
    await supabase.from('facebook_posts').delete().eq('facebook_post_id', testPostId);
  });

  /**
   * Verify the index exists for efficient stuck post recovery.
   * This index should be: idx_facebook_posts_processing_started_at
   * WHERE status = 'processing'
   */
  it.skip('should have index on processing_started_at for stuck post recovery', async () => {
    const { data: indexData, error } = await supabase.rpc('get_postgres_index', {
      index_name: 'idx_facebook_posts_processing_started_at',
      table_name: 'facebook_posts',
    });

    expect(error).toBeNull();
    expect(Array.isArray(indexData)).toBe(true);
    expect(indexData?.length).toBeGreaterThan(0);

    // Verify the index has the correct name
    const indexInfo = indexData?.[0];
    expect(indexInfo?.indexname).toBe('idx_facebook_posts_processing_started_at');
    expect(indexInfo?.tablename).toBe('facebook_posts');

    // Verify it's a partial index with the correct WHERE clause
    expect(indexInfo?.indexdef).toContain("WHERE status = 'processing'");
  });

  /**
   * Verify that all statuses used in code are allowed by constraint.
   * This prevents future constraint violations.
   *
   * Statuses used in codebase:
   * - 'pending' (initial state)
   * - 'processing' (active work)
   * - 'processed' (completed successfully)
   * - 'rejected' (validation failed)
   * - 'pending_confirmation' (awaiting owner approval)
   * - 'pending_review' (awaiting manual review)
   * - 'failed' (error during processing)
   * - 'skipped' (race condition - another worker handling)
   */
  it('should allow all status values used in codebase', async () => {
    const statuses = [
      'pending',
      'processing',
      'processed',
      'rejected',
      'pending_confirmation',
      'pending_review',
      'failed',
      'skipped',
    ];

    for (const status of statuses) {
      const testPostId = `test-status-${status}-${Date.now()}`;

      try {
        const { error } = await supabase.from('facebook_posts').insert({
          facebook_post_id: testPostId,
          truck_id: 'test-truck-id',
          message: `Test post for status: ${status}`,
          status: status as any,
        });

        expect(error).toBeNull();

        // Clean up
        await supabase.from('facebook_posts').delete().eq('facebook_post_id', testPostId);
      } catch (err) {
        fail(`Status '${status}' not allowed by database constraint. Error: ${err}`);
      }
    }
  });
});
