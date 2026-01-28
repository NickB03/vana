-- Migration: Add reasoning_steps JSONB column to chat_messages
-- Purpose: Store structured AI reasoning steps for Chain of Thought UI
-- Date: 2025-11-14

BEGIN;

-- Add JSONB column for structured reasoning
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS reasoning_steps JSONB DEFAULT NULL;

-- Add constraint to validate JSON structure
-- Ensures data integrity at database level before Zod validation
ALTER TABLE public.chat_messages
ADD CONSTRAINT valid_reasoning_steps CHECK (
  reasoning_steps IS NULL OR (
    jsonb_typeof(reasoning_steps) = 'object' AND
    reasoning_steps ? 'steps' AND
    jsonb_typeof(reasoning_steps->'steps') = 'array'
  )
);

-- Add GIN index for fast JSONB queries
-- Uses jsonb_path_ops for optimal query performance on nested paths
-- Note: CONCURRENTLY cannot be used inside transaction blocks
CREATE INDEX IF NOT EXISTS idx_chat_messages_reasoning_steps
ON public.chat_messages USING GIN (reasoning_steps jsonb_path_ops);

-- Add documentation comment for future developers
COMMENT ON COLUMN public.chat_messages.reasoning_steps IS
'Structured AI reasoning steps in JSON format:
{
  "steps": [
    {
      "phase": "research|analysis|solution|custom",
      "title": "Brief step description (10-80 chars)",
      "icon": "search|lightbulb|target|sparkles",
      "items": ["Detailed point 1 (20-200 chars)", ...]
    }
  ],
  "summary": "Overall summary (optional, max 200 chars)"
}
Validated with Zod schemas on frontend/backend.
Used by ReasoningIndicator component.';

-- Grant permissions
-- RLS policies already handle row-level access control
-- Users can read/write their own reasoning steps via existing policies

COMMIT;
