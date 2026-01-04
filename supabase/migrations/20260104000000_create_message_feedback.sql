-- ============================================================================
-- Message Feedback Table
-- ============================================================================
-- Stores user feedback (thumbs up/down) for AI assistant messages.
-- Enables quality tracking and model improvement.

CREATE TABLE IF NOT EXISTS public.message_feedback (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
    session_id uuid NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    rating text NOT NULL CHECK (rating IN ('positive', 'negative')),
    category text CHECK (category IN ('inaccurate', 'unhelpful', 'incomplete', 'off_topic')),
    comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
    -- Note: We handle uniqueness with partial indexes below, not a table constraint
    -- because UNIQUE(message_id, user_id) allows multiple NULLs in SQL
);

-- Unique constraint for authenticated users (user_id IS NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_feedback_authenticated
    ON public.message_feedback(message_id, user_id)
    WHERE user_id IS NOT NULL;

-- Unique constraint for guest users (user_id IS NULL) - one feedback per session
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_feedback_guest
    ON public.message_feedback(message_id, session_id)
    WHERE user_id IS NULL;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_message_feedback_message_id ON public.message_feedback(message_id);
CREATE INDEX IF NOT EXISTS idx_message_feedback_session_id ON public.message_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_message_feedback_rating ON public.message_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_message_feedback_created_at ON public.message_feedback(created_at);

-- Enable RLS
ALTER TABLE public.message_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can manage their own feedback
CREATE POLICY "Users can insert own feedback"
    ON public.message_feedback FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view own feedback"
    ON public.message_feedback FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own feedback"
    ON public.message_feedback FOR UPDATE
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete own feedback"
    ON public.message_feedback FOR DELETE
    USING (auth.uid() = user_id OR user_id IS NULL);

-- Add comment for documentation
COMMENT ON TABLE public.message_feedback IS 'User feedback (thumbs up/down) on AI assistant messages';
COMMENT ON COLUMN public.message_feedback.rating IS 'Feedback rating: positive or negative';
COMMENT ON COLUMN public.message_feedback.category IS 'Optional category for negative feedback';
COMMENT ON COLUMN public.message_feedback.comment IS 'Optional text comment explaining the feedback';
