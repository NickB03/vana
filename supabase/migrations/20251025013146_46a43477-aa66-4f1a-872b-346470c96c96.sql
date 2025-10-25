-- Add missing RLS policies to make chat_messages immutable
CREATE POLICY "Chat messages are immutable - no updates"
  ON public.chat_messages
  FOR UPDATE
  USING (false);

CREATE POLICY "Chat messages are immutable - no deletes"
  ON public.chat_messages
  FOR DELETE
  USING (false);

-- Add length constraints to chat_messages table for input validation
ALTER TABLE public.chat_messages 
  ADD CONSTRAINT content_length_check 
  CHECK (char_length(content) <= 50000);

ALTER TABLE public.chat_messages 
  ADD CONSTRAINT content_not_empty_check 
  CHECK (trim(content) != '');

-- Add length constraint to reasoning field
ALTER TABLE public.chat_messages 
  ADD CONSTRAINT reasoning_length_check 
  CHECK (reasoning IS NULL OR char_length(reasoning) <= 50000);