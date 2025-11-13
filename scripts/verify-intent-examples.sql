-- Verify Intent Examples Database
-- Run this in Supabase SQL Editor to check the populated examples

-- 1. Count by intent type
SELECT 
  intent,
  COUNT(*) as count
FROM intent_examples
GROUP BY intent
ORDER BY count DESC;

-- Expected results:
-- image: 40
-- react: 34
-- code: 20
-- mermaid: 15
-- markdown: 15
-- chat: 15
-- svg: 8
-- TOTAL: 147

-- 2. Sample image examples (should include "generate an image of a sunset")
SELECT text
FROM intent_examples
WHERE intent = 'image'
ORDER BY text
LIMIT 10;

-- 3. Check embedding dimensions (should be 1024)
SELECT 
  intent,
  array_length(embedding, 1) as embedding_dimensions
FROM intent_examples
LIMIT 5;

