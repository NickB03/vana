-- Migration: Sync tables with remote vana-dev (Part 1: Tables and Columns)

-- ============================================================================
-- 1. CREATE artifact_versions TABLE (new on remote)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.artifact_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  artifact_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  artifact_type TEXT NOT NULL,
  artifact_title TEXT NOT NULL,
  artifact_content TEXT NOT NULL,
  artifact_language TEXT,
  content_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for artifact_versions
CREATE INDEX IF NOT EXISTS idx_artifact_versions_artifact_id ON public.artifact_versions(artifact_id);
CREATE INDEX IF NOT EXISTS idx_artifact_versions_message_id ON public.artifact_versions(message_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_artifact_versions_unique ON public.artifact_versions(artifact_id, version_number);

-- Enable RLS
ALTER TABLE public.artifact_versions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. CREATE api_throttle TABLE (replaces api_throttle_state)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.api_throttle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_name TEXT NOT NULL UNIQUE,
  request_count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_request TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_throttle_api_name ON public.api_throttle(api_name);

ALTER TABLE public.api_throttle ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. ADD artifact_ids COLUMN TO chat_messages
-- ============================================================================

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS artifact_ids TEXT[];

-- ============================================================================
-- 4. ADD COLUMNS TO guest_rate_limits
-- ============================================================================

ALTER TABLE public.guest_rate_limits
  ADD COLUMN IF NOT EXISTS first_request_at TIMESTAMP WITH TIME ZONE;

-- Update guest_rate_limits RLS (disable for direct access, service_role only)
ALTER TABLE public.guest_rate_limits DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. RLS POLICIES
-- ============================================================================

-- artifact_versions policies
CREATE POLICY "Users can view artifact versions for their sessions"
  ON public.artifact_versions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_messages cm
      JOIN public.chat_sessions cs ON cs.id = cm.session_id
      WHERE cm.id = artifact_versions.message_id
      AND cs.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage artifact versions"
  ON public.artifact_versions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- api_throttle policies
CREATE POLICY "Service role can manage api throttle"
  ON public.api_throttle FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Recreate chat_messages policies with updated names
DROP POLICY IF EXISTS "Users can create messages in their sessions" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view messages from their sessions" ON public.chat_messages;

CREATE POLICY "allow_select_own_messages"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "allow_insert_own_messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "service_role_all_messages"
  ON public.chat_messages FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Recreate chat_sessions policies
DROP POLICY IF EXISTS "Users can view their own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can create their own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can update their own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can delete their own chat sessions" ON public.chat_sessions;

CREATE POLICY "allow_select_own_sessions"
  ON public.chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "allow_insert_own_sessions"
  ON public.chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "allow_update_own_sessions"
  ON public.chat_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "allow_delete_own_sessions"
  ON public.chat_sessions FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "service_role_all_sessions"
  ON public.chat_sessions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 6. DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.artifact_versions IS 'Stores version history for artifacts with deduplication';
COMMENT ON TABLE public.api_throttle IS 'Tracks API request throttling state';
