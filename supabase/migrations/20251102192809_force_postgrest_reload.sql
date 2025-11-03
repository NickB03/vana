-- Force PostgREST Schema Cache Reload
-- =====================================
-- This migration creates a function to properly reload PostgREST schema cache
-- after DDL changes in Supabase cloud environment

-- 1. Create a function to force PostgREST reload
CREATE OR REPLACE FUNCTION reload_postgrest_schema_cache()
RETURNS void AS $$
BEGIN
  -- Send NOTIFY to PostgREST to reload schema
  NOTIFY pgrst, 'reload schema';

  -- Also notify config reload
  NOTIFY pgrst, 'reload config';

  -- Log the reload attempt
  RAISE NOTICE 'PostgREST schema cache reload requested at %', NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Execute the reload function immediately
SELECT reload_postgrest_schema_cache();

-- 3. Grant execute permission to service_role
GRANT EXECUTE ON FUNCTION reload_postgrest_schema_cache() TO service_role;
GRANT EXECUTE ON FUNCTION reload_postgrest_schema_cache() TO authenticated;

-- 4. Verify artifact_ids column exists
DO $$
DECLARE
  column_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'chat_messages'
      AND column_name = 'artifact_ids'
  ) INTO column_exists;

  IF NOT column_exists THEN
    RAISE EXCEPTION 'artifact_ids column does not exist on chat_messages table';
  ELSE
    RAISE NOTICE 'Verified: artifact_ids column exists on chat_messages table';
  END IF;
END $$;

-- 5. Force a schema change that PostgREST will definitely notice
-- Add a comment to trigger schema detection
COMMENT ON COLUMN chat_messages.artifact_ids IS 'Array of artifact IDs referenced in this message';

-- 6. One more reload after the comment
SELECT reload_postgrest_schema_cache();
