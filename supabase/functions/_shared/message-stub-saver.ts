/**
 * Message Stub Saver
 *
 * Creates minimal message records to satisfy FK constraints for artifact saves.
 * The message content will be updated later by the frontend after streaming completes.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

/**
 * Create a stub message record to enable artifact saves during streaming.
 * This prevents FK constraint violations when artifacts are saved before the full message.
 *
 * @param supabase - Supabase service client (bypasses RLS)
 * @param messageId - Pre-generated message ID from frontend
 * @param sessionId - Session ID for the message
 * @param isGuest - Whether this is a guest session
 * @param requestId - Request ID for logging
 * @returns Success/failure result
 */
export async function saveMessageStub(
  supabase: SupabaseClient,
  messageId: string,
  sessionId: string | undefined,
  isGuest: boolean,
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Note: This function is only called for authenticated users with valid sessions.
    // Guest users skip DB persistence entirely (no session FK exists for guests).
    if (!sessionId) {
      console.warn(`[${requestId}] saveMessageStub called without sessionId - skipping DB insert`);
      return { success: false, error: 'No sessionId provided' };
    }

    console.log(`[${requestId}] Creating message stub: messageId=${messageId}, sessionId=${sessionId}`);

    // Insert minimal message record (will be updated by frontend after streaming)
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        id: messageId,
        session_id: sessionId,
        role: 'assistant',
        content: '', // Placeholder - will be updated by frontend
        created_at: new Date().toISOString(),
      });

    if (error) {
      // Check if message already exists (idempotent operation)
      if (error.code === '23505') { // unique_violation
        console.log(`[${requestId}] Message stub already exists: ${messageId}`);
        return { success: true };
      }

      console.error(`[${requestId}] Failed to save message stub:`, error);
      return {
        success: false,
        error: `Database error: ${error.message}`,
      };
    }

    console.log(`[${requestId}] ✅ Message stub created: ${messageId}`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[${requestId}] Message stub save error:`, errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
}
