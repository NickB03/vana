-- ============================================================================
-- MIGRATION: Improve SECURITY DEFINER Error Handling (Part 3/4)
-- Created: 2026-01-19 (Split from 20260114192829)
-- ============================================================================
-- Function: match_intent_examples
-- Purpose: Add comprehensive error handling and input validation
-- Converted from SQL to plpgsql for error handling capabilities

CREATE OR REPLACE FUNCTION public.match_intent_examples(
  query_embedding vector,
  match_count integer DEFAULT 1,
  similarity_threshold double precision DEFAULT 0.5
)
RETURNS TABLE(intent text, text text, similarity double precision)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public', 'extensions'
AS $function$
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
$function$;
