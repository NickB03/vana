-- Migration: Add session_id to artifact_versions for better association tracking
-- =============================================================================
-- PROBLEM:
-- Artifacts are created during tool execution (before message is saved), causing
-- a race condition where artifact_versions rows have no message_id. Later queries
-- by message_id return empty results, causing artifact cards to disappear.
--
-- SOLUTION:
-- 1. Add session_id column (always available during tool execution)
-- 2. Make message_id nullable (two-phase save: create with session_id, link with message_id later)
-- 3. Add composite index on (session_id, created_at) for fast lookups
-- 4. Update RLS policies to support querying by session_id
-- =============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Schema Changes
-- ============================================================================

-- Add session_id column (NOT NULL for new rows, but allow NULL for existing data)
ALTER TABLE public.artifact_versions
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE;

-- Make message_id nullable to support two-phase save
ALTER TABLE public.artifact_versions
  ALTER COLUMN message_id DROP NOT NULL;

-- ============================================================================
-- STEP 2: Indexes
-- ============================================================================

-- Add composite index for fast session-based lookups
-- Used to find recent artifacts for a session before they're linked to messages
CREATE INDEX IF NOT EXISTS idx_artifact_versions_session_created
  ON public.artifact_versions(session_id, created_at DESC);

-- Add standalone session_id index for RLS policy performance
CREATE INDEX IF NOT EXISTS idx_artifact_versions_session
  ON public.artifact_versions(session_id);

-- ============================================================================
-- STEP 3: Update RLS Policies
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create versions in own messages" ON public.artifact_versions;
DROP POLICY IF EXISTS "Users can view versions from own messages" ON public.artifact_versions;

-- New SELECT policy: Allow viewing by message_id OR session_id
CREATE POLICY "Users can view versions from own sessions"
  ON public.artifact_versions
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (
    -- Allow viewing by session_id (for artifacts not yet linked to messages)
    session_id IN (
      SELECT cs.id
      FROM public.chat_sessions cs
      WHERE cs.user_id = auth.uid()
    )
    OR
    -- Allow viewing by message_id (for linked artifacts - backwards compatibility)
    (message_id IS NOT NULL AND message_id IN (
      SELECT cm.id
      FROM public.chat_messages cm
      JOIN public.chat_sessions cs ON cm.session_id = cs.id
      WHERE cs.user_id = auth.uid()
    ))
  );

-- New INSERT policy: Allow creation with session_id
CREATE POLICY "Users can create versions in own sessions"
  ON public.artifact_versions
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (
    -- Must provide session_id
    session_id IS NOT NULL
    AND
    -- Session must belong to user
    session_id IN (
      SELECT cs.id
      FROM public.chat_sessions cs
      WHERE cs.user_id = auth.uid()
    )
    AND
    -- If message_id provided, it must belong to the same session
    (message_id IS NULL OR message_id IN (
      SELECT cm.id
      FROM public.chat_messages cm
      WHERE cm.session_id = session_id
    ))
  );

-- New UPDATE policy: Allow linking artifacts to messages
CREATE POLICY "Users can update versions in own sessions"
  ON public.artifact_versions
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (
    -- Artifact belongs to user's session
    session_id IN (
      SELECT cs.id
      FROM public.chat_sessions cs
      WHERE cs.user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Session must still belong to user
    session_id IN (
      SELECT cs.id
      FROM public.chat_sessions cs
      WHERE cs.user_id = auth.uid()
    )
    AND
    -- If message_id is being added/updated, it must belong to the same session
    (message_id IS NULL OR message_id IN (
      SELECT cm.id
      FROM public.chat_messages cm
      WHERE cm.session_id = session_id
    ))
  );

COMMIT;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Update tool handler to save artifacts with session_id
-- 2. Update frontend to query by session_id for unlinked artifacts
-- 3. Update message save flow to link artifacts via message_id after message creation
-- ============================================================================
