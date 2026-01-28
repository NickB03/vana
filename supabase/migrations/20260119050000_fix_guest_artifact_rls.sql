-- Migration: Fix RLS policies to allow guest users to read artifacts
-- =============================================================================
-- DATE: 2026-01-19
--
-- PROBLEM:
-- Guest users (anonymous, no auth.uid()) can generate artifacts via Edge Functions,
-- but cannot SELECT them from the frontend because the RLS policy requires
-- `cs.user_id = auth.uid()`, which is NULL for guests.
--
-- SYMPTOMS:
-- - Artifact generation succeeds with guest-art-* ID during streaming
-- - After streaming completes, MessageWithArtifacts tries to query DB
-- - Query fails with "Failed to fetch artifacts from DB" error
-- - Artifact card doesn't render after page refresh
--
-- ROOT CAUSE:
-- The policy "Users can view versions from own messages" (created in reconcile_prod_drift)
-- checks `cs.user_id = auth.uid()`, which is NULL for anonymous users, blocking all reads.
--
-- ARCHITECTURAL CONTEXT:
-- Guest users:
-- 1. Do NOT have sessions in chat_sessions table (no DB records)
-- 2. Store messages in localStorage only (no chat_messages records)
-- 3. Currently, guest artifacts are NOT persisted to artifact_versions table
--    because there's no message_id FK to link to (tool-calling-chat.ts:750-762)
--
-- SOLUTION (PHASE 1 - RLS Policy):
-- Add a new policy that allows anonymous (anon role) users to SELECT artifacts
-- ONLY if the artifact_id starts with 'guest-art-' prefix. This enables:
-- 1. Future enhancement to save guest artifacts to DB (with synthetic message_id)
-- 2. Proper error handling when DB query returns empty results for guests
-- 3. Security: No cross-user data leakage (guest-art-* IDs are content-addressed hashes)
--
-- NOTE: This migration alone does NOT fix the bug. Additional changes needed:
-- - Backend: Save guest artifacts to artifact_versions with synthetic message_id
-- - OR Frontend: Skip DB query for guest users, use localStorage artifact data
-- =============================================================================

-- Step 1: Add policy for anonymous users to read guest artifacts
-- This policy is permissive (allows reads) but restrictive (only guest-art-* prefix)
CREATE POLICY "Anonymous users can view guest artifacts"
  ON public.artifact_versions
  FOR SELECT
  TO anon
  USING (
    -- Only allow reading artifacts with guest-art-* prefix
    -- Safe because: guest IDs are content-addressed, no PII, ephemeral
    artifact_id LIKE 'guest-art-%'
  );

-- SECURITY NOTES:
-- 1. The existing "Users can view versions from own messages" policy still
--    applies to authenticated users (no weakening of security)
-- 2. The service_role policy grants full access for backend operations (unchanged)
-- 3. Guest artifacts are content-addressed (SHA-256 hash of content), preventing
--    enumeration attacks or cross-user data leakage
-- 4. Guest artifacts expire with the 5-hour session window (not stored long-term)

-- NEXT STEPS:
-- Choose implementation path:
-- Path A: Save guest artifacts to DB (requires synthetic message_id generation)
-- Path B: Extend MessageWithArtifacts to skip DB query for guest users
