-- ============================================================================
-- Clear and Prepare Intent Examples Table
-- ============================================================================
-- This script clears the old intent examples (from setup-intent-examples)
-- so the new intent-examples function can populate with updated examples
-- including 40 image examples.
--
-- INSTRUCTIONS:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Then invoke the intent-examples function via curl (see below)
-- ============================================================================

-- Clear all old examples
DELETE FROM intent_examples;

-- Reset the sequence
ALTER SEQUENCE IF EXISTS intent_examples_id_seq RESTART WITH 1;

-- Verify table is empty
SELECT COUNT(*) as remaining_rows FROM intent_examples;

-- ============================================================================
-- After running this SQL, invoke the function with:
-- ============================================================================
-- curl -X POST "https://vznhbocnuykdmjvujaka.supabase.co/functions/v1/intent-examples" \
--   -H "Authorization: Bearer YOUR_ANON_KEY_HERE" \
--   -H "Content-Type: application/json"
-- ============================================================================

