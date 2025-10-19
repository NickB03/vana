-- ===== MEMORY ENHANCEMENT MIGRATION v1.0 =====
-- This migration supports Phases 1-3 of the memory enhancement plan
-- Phase 1: Token tracking for context window management
-- Phase 2: Redis cache support (metadata)
-- Phase 3: Conversation summarization

-- Add token counting to chat_messages (Phase 1)
ALTER TABLE public.chat_messages 
  ADD COLUMN IF NOT EXISTS token_count INTEGER DEFAULT 0;

-- Add conversation summary support to chat_sessions (Phase 3)
ALTER TABLE public.chat_sessions 
  ADD COLUMN IF NOT EXISTS conversation_summary TEXT,
  ADD COLUMN IF NOT EXISTS summary_checkpoint INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_summarized_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficient recent message queries (Phase 1)
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created 
  ON public.chat_messages(session_id, created_at DESC);

-- Add comment documenting the changes
COMMENT ON COLUMN public.chat_messages.token_count IS 'Phase 1: Tracks token count for context window management';
COMMENT ON COLUMN public.chat_sessions.conversation_summary IS 'Phase 3: Stores condensed summary of conversation history';
COMMENT ON COLUMN public.chat_sessions.summary_checkpoint IS 'Phase 3: Message number at last summarization';
COMMENT ON COLUMN public.chat_sessions.last_summarized_at IS 'Phase 3: Timestamp of last summarization';