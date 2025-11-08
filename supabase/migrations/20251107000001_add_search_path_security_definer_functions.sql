-- Migration: Add search_path to SECURITY DEFINER Functions
-- Description: Prevents schema injection attacks by setting explicit search_path
-- Date: November 7, 2025
-- Priority: CRITICAL Security Fix

-- ============================================================================
-- SECURITY CONTEXT
-- ============================================================================
-- Without explicit search_path, SECURITY DEFINER functions are vulnerable to
-- schema injection attacks. Attackers can create malicious schemas that shadow
-- legitimate functions, allowing privilege escalation.
--
-- This migration adds "SET search_path = public, pg_temp" to all SECURITY
-- DEFINER functions to prevent this attack vector.
-- ============================================================================

-- 1. Fix create_artifact_version_atomic()
ALTER FUNCTION create_artifact_version_atomic(
  UUID,  -- p_message_id
  TEXT,  -- p_artifact_id
  TEXT,  -- p_artifact_type
  TEXT,  -- p_artifact_title
  TEXT,  -- p_artifact_content
  TEXT,  -- p_artifact_language
  TEXT   -- p_content_hash
) SET search_path = public, pg_temp;

-- 2. Fix get_artifact_version_history()
ALTER FUNCTION get_artifact_version_history(TEXT) -- p_artifact_id
SET search_path = public, pg_temp;

-- 3. Fix cleanup_old_artifact_versions()
ALTER FUNCTION cleanup_old_artifact_versions()
SET search_path = public, pg_temp;

-- 4. Fix reload_postgrest_schema_cache()
ALTER FUNCTION reload_postgrest_schema_cache()
SET search_path = public, pg_temp;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this query to verify all SECURITY DEFINER functions have search_path set:
--
-- SELECT
--   p.proname,
--   proconfig
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public' AND p.prosecdef = true;
--
-- Expected: All functions show search_path=public, pg_temp in proconfig
-- ============================================================================

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Successfully added search_path to all SECURITY DEFINER functions';
  RAISE NOTICE 'Functions protected: create_artifact_version_atomic, get_artifact_version_history, cleanup_old_artifact_versions, reload_postgrest_schema_cache';
END $$;

