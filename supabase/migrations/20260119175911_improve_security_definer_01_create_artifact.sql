-- ============================================================================
-- MIGRATION: Improve SECURITY DEFINER Error Handling (Part 1/4)
-- Created: 2026-01-19 (Split from 20260114192829)
-- ============================================================================
-- Function: create_artifact_version_atomic
-- Purpose: Add comprehensive error handling and input validation

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
AS $function$
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
$function$;
