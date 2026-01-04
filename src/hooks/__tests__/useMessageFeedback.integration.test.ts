/**
 * Integration Tests for useMessageFeedback
 *
 * These tests use REAL local Supabase - no mocks!
 * Requires: `supabase start` running before tests
 *
 * Run with: npm run test:integration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useMessageFeedback } from '../useMessageFeedback';
import {
  testSupabase,
  createTestSession,
  createTestMessage,
  getTestUserId,
} from '@/test/integration-setup';

describe('useMessageFeedback (Integration)', () => {
  let testSession: { id: string };
  let testMessage: { id: string };
  let testUserId: string;

  // Create FRESH test data before EACH test to avoid cleanup conflicts
  // The integration-setup's afterEach cleans up tracked sessions/messages,
  // so we need to recreate them for each test.
  beforeEach(async () => {
    testUserId = await getTestUserId();
    testSession = await createTestSession(testUserId);
    testMessage = await createTestMessage(testSession.id, 'assistant', 'Test response');
  });

  // Clean up feedback after each test (sessions/messages cleaned by integration-setup)
  afterEach(async () => {
    // Delete any feedback created during tests
    if (testMessage?.id) {
      await testSupabase
        .from('message_feedback')
        .delete()
        .eq('message_id', testMessage.id);
    }
  });

  describe('submitFeedback - REAL database operations', () => {
    it('actually inserts feedback into the database', async () => {
      const { result } = renderHook(() => useMessageFeedback());

      // Submit feedback
      let feedback: any;
      await act(async () => {
        feedback = await result.current.submitFeedback({
          messageId: testMessage.id,
          sessionId: testSession.id,
          rating: 'positive',
        });
      });

      // Verify it was returned
      expect(feedback).not.toBeNull();
      expect(feedback.rating).toBe('positive');
      expect(feedback.message_id).toBe(testMessage.id);

      // REAL TEST: Query the database directly to verify it was actually inserted
      const { data: dbFeedback, error } = await testSupabase
        .from('message_feedback')
        .select('*')
        .eq('id', feedback.id)
        .single();

      expect(error).toBeNull();
      expect(dbFeedback).not.toBeNull();
      expect(dbFeedback!.rating).toBe('positive');
      expect(dbFeedback!.message_id).toBe(testMessage.id);
      expect(dbFeedback!.session_id).toBe(testSession.id);
    });

    it('stores negative feedback with category and comment', async () => {
      const { result } = renderHook(() => useMessageFeedback());

      let feedback: any;
      await act(async () => {
        feedback = await result.current.submitFeedback({
          messageId: testMessage.id,
          sessionId: testSession.id,
          rating: 'negative',
          category: 'inaccurate',
          comment: 'The code example was wrong',
        });
      });

      // Verify in database
      const { data: dbFeedback } = await testSupabase
        .from('message_feedback')
        .select('*')
        .eq('id', feedback.id)
        .single();

      expect(dbFeedback!.rating).toBe('negative');
      expect(dbFeedback!.category).toBe('inaccurate');
      expect(dbFeedback!.comment).toBe('The code example was wrong');
    });

    it('prevents duplicate feedback (database constraint)', async () => {
      const { result } = renderHook(() => useMessageFeedback());

      // Submit first feedback
      await act(async () => {
        await result.current.submitFeedback({
          messageId: testMessage.id,
          sessionId: testSession.id,
          rating: 'positive',
        });
      });

      // Try to submit again - should fail with duplicate error
      let duplicateFeedback: any;
      await act(async () => {
        duplicateFeedback = await result.current.submitFeedback({
          messageId: testMessage.id,
          sessionId: testSession.id,
          rating: 'negative', // Different rating, same message
        });
      });

      // Should return null and set error
      expect(duplicateFeedback).toBeNull();

      await waitFor(() => {
        expect(result.current.error).toBe('You have already submitted feedback for this message');
      });

      // Verify only ONE feedback exists in database
      const { data: allFeedback } = await testSupabase
        .from('message_feedback')
        .select('*')
        .eq('message_id', testMessage.id);

      expect(allFeedback).toHaveLength(1);
      expect(allFeedback![0].rating).toBe('positive'); // First one should persist
    });

    it('handles invalid message_id (foreign key constraint)', async () => {
      const { result } = renderHook(() => useMessageFeedback());

      let feedback: any;
      await act(async () => {
        feedback = await result.current.submitFeedback({
          messageId: 'non-existent-message-id',
          sessionId: testSession.id,
          rating: 'positive',
        });
      });

      // Should fail due to FK constraint
      expect(feedback).toBeNull();
      expect(result.current.error).not.toBeNull();
    });

    it('sets loading state correctly during submission', async () => {
      const { result } = renderHook(() => useMessageFeedback());

      expect(result.current.isLoading).toBe(false);

      // Start submission (don't await)
      let submitPromise: Promise<any>;
      act(() => {
        submitPromise = result.current.submitFeedback({
          messageId: testMessage.id,
          sessionId: testSession.id,
          rating: 'positive',
        });
      });

      // Should be loading now
      expect(result.current.isLoading).toBe(true);

      // Wait for completion
      await act(async () => {
        await submitPromise;
      });

      // Should be done loading
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('getFeedbackForMessage - REAL database queries', () => {
    it('returns null when no feedback exists', async () => {
      const { result } = renderHook(() => useMessageFeedback());

      let feedback: any;
      await act(async () => {
        feedback = await result.current.getFeedbackForMessage(testMessage.id);
      });

      expect(feedback).toBeNull();
    });

    it('returns existing feedback from database', async () => {
      // First, insert feedback directly into DB
      const { data: insertedFeedback } = await testSupabase
        .from('message_feedback')
        .insert({
          message_id: testMessage.id,
          session_id: testSession.id,
          user_id: null, // Guest user
          rating: 'positive',
          category: null,
          comment: 'Great response!',
        })
        .select()
        .single();

      const { result } = renderHook(() => useMessageFeedback());

      let feedback: any;
      await act(async () => {
        feedback = await result.current.getFeedbackForMessage(testMessage.id);
      });

      expect(feedback).not.toBeNull();
      expect(feedback.id).toBe(insertedFeedback!.id);
      expect(feedback.rating).toBe('positive');
      expect(feedback.comment).toBe('Great response!');
    });
  });
});

/**
 * Tests that verify actual database behavior:
 *
 * 1. ✅ Data is ACTUALLY inserted (not just mocked)
 * 2. ✅ Foreign key constraints are enforced
 * 3. ✅ Unique constraints prevent duplicates
 * 4. ✅ Queries return real data
 *
 * These tests would PASS with mocks but catch REAL bugs:
 * - Wrong column names
 * - Missing database migrations
 * - Incorrect FK relationships
 * - RLS policy issues
 */
