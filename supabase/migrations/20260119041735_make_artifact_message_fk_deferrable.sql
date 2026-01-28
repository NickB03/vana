-- Migration: Allow updating message stubs
-- =============================================================================
-- PROBLEM:
-- The backend creates message "stubs" (empty content) via service_role to satisfy
-- foreign key constraints before artifacts are saved. The frontend then tries to
-- upsert the full message content, but the RLS policy "Chat messages are immutable"
-- blocks ALL updates, causing 403 errors and artifact disappearance.
--
-- SOLUTION:
-- Replace the blanket "no updates" policy with one that allows users to update
-- ONLY their own stub messages (where content = ''). This preserves the intent
-- of message immutability while allowing the stub completion flow to work.
-- =============================================================================

-- Step 1: Drop the overly restrictive policy
DROP POLICY IF EXISTS "Chat messages are immutable - no updates" ON public.chat_messages;

-- Step 2: Create a policy that allows updating ONLY stub messages
-- A stub message has empty content ('') and was created by the backend
CREATE POLICY "Users can complete message stubs in own sessions"
  ON public.chat_messages
  FOR UPDATE
  USING (
    -- Message belongs to user's session
    EXISTS (
      SELECT 1
      FROM public.chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
        AND chat_sessions.user_id = auth.uid()
    )
    -- Only allow updating stub messages (empty content)
    AND content = ''
  )
  WITH CHECK (
    -- Same ownership check for the new row
    EXISTS (
      SELECT 1
      FROM public.chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
        AND chat_sessions.user_id = auth.uid()
    )
  );

-- Note: The service_role policy "service_role_all_messages" already grants full access
-- to the service role, so backend operations are unaffected by these changes.
