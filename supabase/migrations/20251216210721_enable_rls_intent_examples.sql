-- Enable RLS on intent_examples table
-- Security fix: Table contains read-only reference data for intent detection
-- Only Edge Functions (service_role) need direct access

-- Enable RLS (idempotent)
ALTER TABLE intent_examples ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Service role can manage intent examples" ON intent_examples;

-- Service role has full access (needed for setup via intent-examples function)
CREATE POLICY "Service role can manage intent examples"
  ON intent_examples
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Update match_intent_examples() to SECURITY DEFINER
-- This allows the function to access intent_examples with elevated permissions
-- while preventing users from directly querying the table
CREATE OR REPLACE FUNCTION match_intent_examples(
  query_embedding extensions.vector(1024),
  match_count int default 1,
  similarity_threshold float default 0.5
)
RETURNS TABLE (
  intent text,
  text text,
  similarity float
)
LANGUAGE sql
STABLE
SECURITY DEFINER  -- Added: Run with creator's permissions
SET search_path = public, extensions
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

-- Verify grants are still in place (idempotent)
GRANT SELECT ON intent_examples TO service_role;
GRANT EXECUTE ON FUNCTION match_intent_examples TO anon, authenticated;
