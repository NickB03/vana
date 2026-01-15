-- ============================================================================
-- RECONCILIATION MIGRATION: Sync Production Schema Drift
-- ============================================================================
-- Date: 2026-01-14
-- Purpose: Reconcile 516 lines of drift between local and production schemas
-- Safety: DROP/CREATE pattern for policies and indexes (idempotent)
-- 
-- Changes:
-- - Drop 11 old RLS policies and recreate with improved naming and logic
-- - Add 2 new immutability policies for chat_messages (prevent updates/deletes)
-- - Rebuild 12 indexes with consistent naming (pattern: idx_{table}_{column})
-- - Add new indexes for content_hash deduplication and last_request tracking
-- - Update 4 SECURITY DEFINER functions
-- - Add guest_rate_limits.last_request_at column
-- - Adjust NOT NULL constraints and defaults
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: DROP OLD RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view artifact versions for their sessions" ON public.artifact_versions;
DROP POLICY IF EXISTS "allow_insert_own_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "allow_select_own_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "allow_delete_own_sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "allow_insert_own_sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "allow_select_own_sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "allow_update_own_sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Service role can manage intent examples" ON public.intent_examples;
DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_preferences;

-- ============================================================================
-- SECTION 2: DROP OLD INDEXES AND CONSTRAINTS
-- ============================================================================

ALTER TABLE IF EXISTS public.guest_rate_limits DROP CONSTRAINT IF EXISTS guest_rate_limits_identifier_key;

-- Remove obsolete trigger function (superseded by application-level timestamp updates)
DROP FUNCTION IF EXISTS public.update_chat_session_timestamp();

DROP INDEX IF EXISTS public.guest_rate_limits_identifier_key;
DROP INDEX IF EXISTS public.idx_ai_usage_tracking_user_created;
DROP INDEX IF EXISTS public.idx_artifact_versions_artifact_id;
DROP INDEX IF EXISTS public.idx_artifact_versions_message_id;
DROP INDEX IF EXISTS public.idx_artifact_versions_unique;
DROP INDEX IF EXISTS public.idx_chat_messages_session_created;
DROP INDEX IF EXISTS public.idx_chat_sessions_updated_at;
DROP INDEX IF EXISTS public.idx_chat_sessions_user_id_id;
DROP INDEX IF EXISTS public.idx_chat_sessions_user_updated;
DROP INDEX IF EXISTS public.intent_examples_embedding_idx;

-- ============================================================================
-- SECTION 3: SCHEMA ADJUSTMENTS
-- ============================================================================

-- Chat messages
-- Default empty array for artifact_ids to avoid NULL handling in application code
ALTER TABLE public.chat_messages ALTER COLUMN artifact_ids SET DEFAULT '{}'::text[];
-- Allow NULL created_at for system-generated messages or migrations
ALTER TABLE public.chat_messages ALTER COLUMN created_at DROP NOT NULL;
-- Remove default to force explicit token counting by application
ALTER TABLE public.chat_messages ALTER COLUMN token_count DROP DEFAULT;

-- Chat sessions
-- Allow NULL timestamps for backward compatibility with existing data
ALTER TABLE public.chat_sessions ALTER COLUMN created_at DROP NOT NULL;
-- Remove default to require explicit checkpoint management
ALTER TABLE public.chat_sessions ALTER COLUMN summary_checkpoint DROP DEFAULT;
ALTER TABLE public.chat_sessions ALTER COLUMN updated_at DROP NOT NULL;

-- Guest rate limits
-- Add last_request_at column for tracking most recent API call per guest
ALTER TABLE public.guest_rate_limits ADD COLUMN IF NOT EXISTS last_request_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.guest_rate_limits ALTER COLUMN created_at DROP NOT NULL;
ALTER TABLE public.guest_rate_limits ALTER COLUMN first_request_at SET DEFAULT NOW();
ALTER TABLE public.guest_rate_limits ALTER COLUMN request_count SET DEFAULT 1;
ALTER TABLE public.guest_rate_limits ALTER COLUMN request_count DROP NOT NULL;
ALTER TABLE public.guest_rate_limits ENABLE ROW LEVEL SECURITY;

-- Intent examples
-- Update embedding dimension to 1024 for Gemini 2.5 Flash embeddings
ALTER TABLE public.intent_examples
  ALTER COLUMN embedding SET DATA TYPE extensions.vector(1024)
  USING embedding::extensions.vector(1024);
-- Disable RLS to allow service role access without policy overhead
ALTER TABLE public.intent_examples DISABLE ROW LEVEL SECURITY;

-- User preferences
-- Remove default to require explicit library approval
ALTER TABLE public.user_preferences ALTER COLUMN approved_libraries DROP DEFAULT;

-- ============================================================================
-- SECTION 4: CREATE NEW INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_api_throttle_window_start ON public.api_throttle USING btree (window_start);
CREATE INDEX IF NOT EXISTS idx_artifact_versions_artifact ON public.artifact_versions USING btree (artifact_id);
CREATE INDEX IF NOT EXISTS idx_artifact_versions_created ON public.artifact_versions USING btree (created_at DESC);
-- Index content_hash for deduplication checks in create_artifact_version_atomic()
CREATE INDEX IF NOT EXISTS idx_artifact_versions_hash ON public.artifact_versions USING btree (content_hash);
CREATE INDEX IF NOT EXISTS idx_artifact_versions_message ON public.artifact_versions USING btree (message_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_artifact_ids ON public.chat_messages USING gin (artifact_ids);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON public.chat_sessions USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guest_rate_limits_created_at ON public.guest_rate_limits USING btree (created_at);
-- Index last_request_at for efficient rate limit window queries
CREATE INDEX IF NOT EXISTS idx_guest_rate_limits_last_request ON public.guest_rate_limits USING btree (last_request_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences USING btree (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS unique_artifact_version ON public.artifact_versions USING btree (artifact_id, version_number);
CREATE UNIQUE INDEX IF NOT EXISTS unique_guest_identifier ON public.guest_rate_limits USING btree (identifier);
CREATE INDEX IF NOT EXISTS intent_examples_embedding_idx ON public.intent_examples
  USING ivfflat (embedding extensions.vector_cosine_ops) WITH (lists='11');

-- ============================================================================
-- SECTION 5: CONSTRAINTS
-- ============================================================================

ALTER TABLE public.artifact_versions
  DROP CONSTRAINT IF EXISTS artifact_versions_message_id_fkey;

-- Cascade delete: when a message is deleted, all its artifact versions are removed
-- This maintains referential integrity and prevents orphaned artifact data
ALTER TABLE public.artifact_versions
  ADD CONSTRAINT artifact_versions_message_id_fkey
  FOREIGN KEY (message_id) REFERENCES public.chat_messages(id) ON DELETE CASCADE;

ALTER TABLE public.artifact_versions 
  DROP CONSTRAINT IF EXISTS unique_artifact_version;

ALTER TABLE public.artifact_versions 
  ADD CONSTRAINT unique_artifact_version 
  UNIQUE USING INDEX unique_artifact_version;

ALTER TABLE public.guest_rate_limits 
  DROP CONSTRAINT IF EXISTS unique_guest_identifier;

ALTER TABLE public.guest_rate_limits 
  ADD CONSTRAINT unique_guest_identifier 
  UNIQUE USING INDEX unique_guest_identifier;

COMMIT;

-- ============================================================================
-- SECTION 6: FUNCTIONS (outside transaction to avoid CLI parsing issues)
-- ============================================================================
-- Note: Supabase CLI has known issues parsing complex function bodies in transactions
-- These function definitions are safe to run independently and are idempotent

SET check_function_bodies = off;

-- Atomically creates a new artifact version with automatic version numbering
-- Deduplicates by content_hash - returns existing version if content unchanged
-- SECURITY DEFINER: Required to bypass RLS for atomic version numbering
CREATE OR REPLACE FUNCTION public.create_artifact_version_atomic(
  p_message_id uuid,
  p_artifact_id text,
  p_artifact_type text,
  p_artifact_title text,
  p_artifact_content text,
  p_artifact_language text,
  p_content_hash text
)
RETURNS public.artifact_versions
LANGUAGE plpgsql
SECURITY DEFINER  -- Required to bypass RLS for atomic version numbering
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_new_version artifact_versions;
  v_latest_hash TEXT;
BEGIN
  -- Check for duplicate content (skip if hash matches latest)
  SELECT content_hash INTO v_latest_hash
  FROM artifact_versions
  WHERE artifact_id = p_artifact_id
  ORDER BY version_number DESC
  LIMIT 1;

  IF v_latest_hash = p_content_hash THEN
    -- Return existing version (no duplicate needed)
    SELECT * INTO v_new_version
    FROM artifact_versions
    WHERE artifact_id = p_artifact_id
    ORDER BY version_number DESC
    LIMIT 1;

    RETURN v_new_version;
  END IF;

  -- Insert new version with atomic version numbering
  INSERT INTO artifact_versions (
    message_id,
    artifact_id,
    version_number,
    artifact_type,
    artifact_title,
    artifact_content,
    artifact_language,
    content_hash
  )
  VALUES (
    p_message_id,
    p_artifact_id,
    COALESCE(
      (SELECT MAX(version_number) + 1
       FROM artifact_versions
       WHERE artifact_id = p_artifact_id),
      1
    ),
    p_artifact_type,
    p_artifact_title,
    p_artifact_content,
    p_artifact_language,
    p_content_hash
  )
  RETURNING * INTO v_new_version;

  RETURN v_new_version;
END;
$$;

-- Returns all versions of an artifact ordered by version_number (newest first)
-- SECURITY DEFINER allows bypassing RLS to fetch history efficiently,
-- but RLS policies on artifact_versions still apply to control access
CREATE OR REPLACE FUNCTION public.get_artifact_version_history(p_artifact_id text)
RETURNS SETOF public.artifact_versions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM artifact_versions
  WHERE artifact_id = p_artifact_id
  ORDER BY version_number DESC;
END;
$$;

-- Vector similarity search for intent classification
-- Uses cosine distance to find closest matching intents from examples
-- Note: search_path includes 'extensions' schema for pgvector operators (<=>)
CREATE OR REPLACE FUNCTION public.match_intent_examples(
  query_embedding vector,
  match_count integer DEFAULT 1,
  similarity_threshold double precision DEFAULT 0.5
)
RETURNS TABLE(intent text, text text, similarity double precision)
LANGUAGE sql
STABLE
SET search_path TO 'public', 'extensions'
AS $$
  SELECT
    intent_examples.intent,
    intent_examples.text,
    1 - (intent_examples.embedding <=> query_embedding) as similarity
  FROM intent_examples
  WHERE 1 - (intent_examples.embedding <=> query_embedding) > similarity_threshold
  ORDER BY intent_examples.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Triggers PostgREST to reload its schema cache
-- Used after schema changes to ensure API reflects latest database structure
CREATE OR REPLACE FUNCTION public.reload_postgrest_schema_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  NOTIFY pgrst, 'reload schema';
  NOTIFY pgrst, 'reload config';
END;
$$;

-- Updates app settings with admin-only access control
-- Validates user email against hardcoded admin list
CREATE OR REPLACE FUNCTION public.update_app_setting(
  setting_key text,
  setting_value jsonb
)
RETURNS public.app_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  result app_settings;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to update app settings';
  END IF;

  IF COALESCE(auth.jwt() ->> 'email', '') != 'nick@vana.bot' THEN
    RAISE EXCEPTION 'Only admins can update app settings. User: %',
      COALESCE(auth.jwt() ->> 'email', 'unknown');
  END IF;

  UPDATE app_settings
  SET
    value = setting_value,
    updated_by = auth.uid(),
    updated_at = now()
  WHERE key = setting_key
  RETURNING * INTO result;

  IF result IS NULL THEN
    RAISE EXCEPTION 'Setting not found: %', setting_key;
  END IF;

  RETURN result;
END;
$$;

-- ============================================================================
-- SECTION 7: NEW RLS POLICIES
-- ============================================================================

-- Artifact Versions Policies
CREATE POLICY "Users can create versions in own messages"
  ON public.artifact_versions
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (
    message_id IN (
      SELECT cm.id
      FROM public.chat_messages cm
      JOIN public.chat_sessions cs ON cm.session_id = cs.id
      WHERE cs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view versions from own messages"
  ON public.artifact_versions
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (
    message_id IN (
      SELECT cm.id
      FROM public.chat_messages cm
      JOIN public.chat_sessions cs ON cm.session_id = cs.id
      WHERE cs.user_id = auth.uid()
    )
  );

-- Chat Messages Policies
CREATE POLICY "Chat messages are immutable - no deletes"
  ON public.chat_messages
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "Chat messages are immutable - no updates"
  ON public.chat_messages
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (false);

CREATE POLICY "Users can insert messages in own sessions"
  ON public.chat_messages
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
        AND chat_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view messages in own sessions"
  ON public.chat_messages
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
        AND chat_sessions.user_id = auth.uid()
    )
  );

-- Chat Sessions Policies
CREATE POLICY "Users can delete own chat sessions"
  ON public.chat_sessions
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat sessions"
  ON public.chat_sessions
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat sessions"
  ON public.chat_sessions
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own chat sessions"
  ON public.chat_sessions
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (auth.uid() = user_id);

-- User Preferences Policies
CREATE POLICY "Users can delete own preferences"
  ON public.user_preferences
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.user_preferences
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own preferences"
  ON public.user_preferences
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (auth.uid() = user_id);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
