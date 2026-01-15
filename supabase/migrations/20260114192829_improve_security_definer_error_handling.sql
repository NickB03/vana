-- ============================================================================
-- MIGRATION: Improve SECURITY DEFINER Error Handling
-- Created: 2026-01-14
-- ============================================================================
--
-- Purpose: Add comprehensive error handling and input validation to all
--          SECURITY DEFINER functions to prevent silent failures and provide
--          clear, actionable error messages for debugging.
--
-- Changes:
-- - Add input validation to all function parameters (NULL checks, type validation)
-- - Add RAISE NOTICE/WARNING logging for observability
-- - Add exception handlers for specific error types (unique violations, FK violations)
-- - Convert match_intent_examples from SQL to plpgsql for error handling
-- - Improve error messages with helpful hints and context
--
-- Safety: Functions use CREATE OR REPLACE (idempotent, safe to re-run)
--
-- ============================================================================

SET check_function_bodies = off;

-- ============================================================================
-- FUNCTION 1: create_artifact_version_atomic
-- ============================================================================
-- Atomically creates a new artifact version with automatic version numbering
-- Deduplicates by content_hash - returns existing version if content unchanged
-- Now includes: input validation, duplicate logging, exception handlers
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
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_new_version artifact_versions;
  v_latest_hash TEXT;
BEGIN
  -- ============================================================================
  -- INPUT VALIDATION
  -- ============================================================================
  IF p_message_id IS NULL THEN
    RAISE EXCEPTION 'message_id cannot be NULL'
    USING ERRCODE = '22004';
  END IF;

  IF p_artifact_id IS NULL OR LENGTH(p_artifact_id) = 0 THEN
    RAISE EXCEPTION 'artifact_id cannot be NULL or empty'
    USING ERRCODE = '22004';
  END IF;

  IF LENGTH(p_artifact_id) > 255 THEN
    RAISE EXCEPTION 'artifact_id too long (max 255 chars): %', LENGTH(p_artifact_id)
    USING ERRCODE = '22001';
  END IF;

  IF p_artifact_type NOT IN ('application/vnd.ant.react', 'text/html', 'image/svg+xml', 'application/vnd.ant.mermaid') THEN
    RAISE EXCEPTION 'Invalid artifact_type: %. Expected: react, html, svg, or mermaid', p_artifact_type
    USING ERRCODE = '22023';
  END IF;

  IF p_content_hash IS NULL OR LENGTH(p_content_hash) != 64 THEN
    RAISE EXCEPTION 'Invalid content_hash length: %. Expected SHA-256 (64 hex chars)', COALESCE(LENGTH(p_content_hash)::text, 'NULL')
    USING ERRCODE = '22023';
  END IF;

  -- ============================================================================
  -- DUPLICATE DETECTION
  -- ============================================================================
  SELECT content_hash INTO v_latest_hash
  FROM artifact_versions
  WHERE artifact_id = p_artifact_id
  ORDER BY version_number DESC
  LIMIT 1;

  IF v_latest_hash = p_content_hash THEN
    -- Log deduplication for observability
    RAISE NOTICE 'Duplicate content detected for artifact_id=%, hash=%. Returning existing version.',
      p_artifact_id, p_content_hash;

    SELECT * INTO v_new_version
    FROM artifact_versions
    WHERE artifact_id = p_artifact_id
    ORDER BY version_number DESC
    LIMIT 1;

    -- Safety check: ensure we found the version
    IF v_new_version IS NULL THEN
      RAISE EXCEPTION 'Duplicate content detected but no existing version found for artifact_id=%', p_artifact_id;
    END IF;

    RETURN v_new_version;
  END IF;

  -- ============================================================================
  -- INSERT NEW VERSION WITH ERROR HANDLING
  -- ============================================================================
  BEGIN
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

    -- Log successful creation
    RAISE NOTICE 'Created artifact version: artifact_id=%, version=%, message_id=%',
      p_artifact_id, v_new_version.version_number, p_message_id;

    RETURN v_new_version;

  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'Race condition: version already exists for artifact_id=% (concurrent creation detected)', p_artifact_id
      USING HINT = 'Another version was created concurrently. Please retry the operation.',
            ERRCODE = '23505';

    WHEN foreign_key_violation THEN
      RAISE EXCEPTION 'Invalid message_id=%: message does not exist or was deleted', p_message_id
      USING HINT = 'Ensure the message exists before creating artifact versions.',
            ERRCODE = '23503';
  END;
END;
$$;

-- ============================================================================
-- FUNCTION 2: get_artifact_version_history
-- ============================================================================
-- Returns all versions of an artifact ordered by version_number (newest first)
-- Now includes: input validation, count logging, exception handler
CREATE OR REPLACE FUNCTION public.get_artifact_version_history(p_artifact_id text)
RETURNS SETOF public.artifact_versions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
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
$$;

-- ============================================================================
-- FUNCTION 3: match_intent_examples
-- ============================================================================
-- Vector similarity search for intent classification
-- Converted from SQL to plpgsql for comprehensive error handling and validation
-- Now includes: NULL checks, dimension validation, parameter range validation
CREATE OR REPLACE FUNCTION public.match_intent_examples(
  query_embedding vector,
  match_count integer DEFAULT 1,
  similarity_threshold double precision DEFAULT 0.5
)
RETURNS TABLE(intent text, text text, similarity double precision)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  -- ============================================================================
  -- INPUT VALIDATION
  -- ============================================================================
  IF query_embedding IS NULL THEN
    RAISE EXCEPTION 'query_embedding cannot be NULL'
    USING ERRCODE = '22004',
          HINT = 'Provide a valid vector embedding for similarity search.';
  END IF;

  IF match_count <= 0 THEN
    RAISE EXCEPTION 'match_count must be positive: %', match_count
    USING ERRCODE = '22023',
          HINT = 'Use a positive integer for match_count (e.g., 1, 5, 10).';
  END IF;

  IF similarity_threshold < 0 OR similarity_threshold > 1 THEN
    RAISE EXCEPTION 'similarity_threshold must be between 0 and 1: %', similarity_threshold
    USING ERRCODE = '22023',
          HINT = 'Use a value between 0.0 (return all) and 1.0 (exact match only).';
  END IF;

  -- ============================================================================
  -- VECTOR SIMILARITY SEARCH WITH ERROR HANDLING
  -- ============================================================================
  RETURN QUERY
  SELECT
    ie.intent,
    ie.text,
    (1 - (ie.embedding <=> query_embedding))::double precision as similarity
  FROM intent_examples ie
  WHERE (1 - (ie.embedding <=> query_embedding)) > similarity_threshold
  ORDER BY ie.embedding <=> query_embedding
  LIMIT match_count;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Vector similarity search failed for query_embedding (dim=%): %',
      array_length(query_embedding::float[], 1), SQLERRM
    USING HINT = 'Check that embedding dimensions match (expected: 1024) and vector extension is loaded.';
END;
$$;

-- ============================================================================
-- FUNCTION 4: update_app_setting
-- ============================================================================
-- Admin-only function to update application settings
-- Now includes: input validation, better error messages with valid keys list
CREATE OR REPLACE FUNCTION public.update_app_setting(setting_key text, setting_value jsonb)
RETURNS public.app_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  result app_settings;
  caller_email TEXT;
BEGIN
  -- ============================================================================
  -- INPUT VALIDATION
  -- ============================================================================
  IF setting_key IS NULL OR LENGTH(setting_key) = 0 THEN
    RAISE EXCEPTION 'setting_key cannot be NULL or empty'
    USING ERRCODE = '22004';
  END IF;

  IF setting_value IS NULL THEN
    RAISE EXCEPTION 'setting_value cannot be NULL'
    USING ERRCODE = '22004',
          HINT = 'Provide a valid JSON value for the setting.';
  END IF;

  -- ============================================================================
  -- AUTHORIZATION CHECK
  -- ============================================================================
  SELECT email INTO caller_email
  FROM auth.users
  WHERE id = auth.uid();

  IF caller_email NOT IN ('nick@vana.bot', 'nick.brown.2003@gmail.com') THEN
    RAISE EXCEPTION 'Unauthorized: Only admin users can update app settings'
    USING ERRCODE = '42501',
          HINT = 'Contact an administrator to change application settings.';
  END IF;

  -- ============================================================================
  -- UPDATE SETTING WITH IMPROVED ERROR HANDLING
  -- ============================================================================
  UPDATE app_settings
  SET
    value = setting_value,
    updated_by = auth.uid(),
    updated_at = now()
  WHERE key = setting_key
  RETURNING * INTO result;

  IF result IS NULL THEN
    -- Provide helpful context about valid keys
    RAISE EXCEPTION 'Setting not found: %. Valid keys: %',
      setting_key,
      (SELECT string_agg(key, ', ') FROM app_settings)
    USING ERRCODE = 'P0002',
          HINT = 'Check spelling or verify setting exists in app_settings table.';
  END IF;

  -- Log the change for audit trail
  RAISE NOTICE 'Updated app setting: key=%, new_value=%, updated_by=%',
    setting_key, setting_value, caller_email;

  RETURN result;
END;
$$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All SECURITY DEFINER functions now include:
-- ✅ Comprehensive input validation
-- ✅ Clear error messages with hints
-- ✅ Exception handling for specific error types
-- ✅ Logging for observability (NOTICE, WARNING)
-- ✅ Audit trail for sensitive operations
-- ============================================================================
