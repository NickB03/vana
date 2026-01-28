-- Migration: Add search_results JSONB column to chat_messages
-- Purpose: Store Tavily web search results for AI-assisted research
-- Date: 2025-11-23

BEGIN;

-- Add JSONB column for web search results
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS search_results JSONB DEFAULT NULL;

-- Add constraint to validate JSON structure
-- Ensures data integrity at database level before Zod validation
ALTER TABLE public.chat_messages
ADD CONSTRAINT valid_search_results CHECK (
  search_results IS NULL OR (
    jsonb_typeof(search_results) = 'object' AND
    search_results ? 'query' AND
    search_results ? 'sources' AND
    search_results ? 'timestamp' AND
    jsonb_typeof(search_results->'sources') = 'array'
  )
);

-- Add GIN index for fast JSONB queries
-- Uses jsonb_path_ops for optimal query performance on nested paths
-- Note: CONCURRENTLY cannot be used inside transaction blocks
CREATE INDEX IF NOT EXISTS idx_chat_messages_search_results
ON public.chat_messages USING GIN (search_results jsonb_path_ops);

-- Add documentation comment for future developers
COMMENT ON COLUMN public.chat_messages.search_results IS
'Tavily web search results in JSON format:
{
  "query": "User search query",
  "sources": [
    {
      "title": "Page title",
      "url": "https://example.com",
      "snippet": "Preview text...",
      "favicon": "https://example.com/favicon.ico",
      "relevanceScore": 0.95,
      "publishedDate": "2025-11-23"
    }
  ],
  "timestamp": 1700000000000,
  "searchTime": 500
}
Validated with Zod schemas on frontend/backend.
Used by WebSearchResults component.';

-- Grant permissions
-- RLS policies already handle row-level access control
-- Users can read/write their own search results via existing policies

COMMIT;
