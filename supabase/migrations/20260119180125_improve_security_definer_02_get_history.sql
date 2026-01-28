-- ============================================================================
-- MIGRATION: Improve SECURITY DEFINER Error Handling (Part 2/4)
-- Created: 2026-01-19 (Split from 20260114192829)
-- ============================================================================
-- Function: get_artifact_version_history
-- Purpose: Add comprehensive error handling and input validation

CREATE OR REPLACE FUNCTION public.get_artifact_version_history(p_artifact_id text)
RETURNS SETOF public.artifact_versions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_count INTEGER;
BEGIN
  -- ============================================================================
  -- INPUT VALIDATION
  -- ============================================================================
  IF p_artifact_id IS NULL OR LENGTH(p_artifact_id) = 0 THEN
    RAISE EXCEPTION 'artifact_id cannot be NULL or empty'
    USING ERRCODE = '22004';
  END IF;

  -- ============================================================================
  -- COUNT AND WARN IF EMPTY
  -- ============================================================================
  SELECT COUNT(*) INTO v_count
  FROM artifact_versions
  WHERE artifact_id = p_artifact_id;

  IF v_count = 0 THEN
    RAISE WARNING 'No version history found for artifact_id=%', p_artifact_id;
  END IF;

  -- ============================================================================
  -- RETURN RESULTS WITH ERROR HANDLING
  -- ============================================================================
  RETURN QUERY
  SELECT *
  FROM artifact_versions
  WHERE artifact_id = p_artifact_id
  ORDER BY version_number DESC;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to retrieve version history for artifact_id=%: %', p_artifact_id, SQLERRM
    USING HINT = 'Check database logs for detailed error information.';
END;
$function$;
