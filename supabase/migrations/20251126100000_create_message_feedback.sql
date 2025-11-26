-- Migration: Create Message Feedback System
-- Description: Stores user feedback on AI responses to measure satisfaction
--              and identify poor responses for continuous improvement.
-- Date: 2025-11-26
-- Related to: Issue #131 - User Feedback Loop for Continuous Improvement

-- Create message_feedback table
CREATE TABLE IF NOT EXISTS message_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Feedback data
  rating TEXT NOT NULL CHECK (rating IN ('positive', 'negative')),
  category TEXT CHECK (category IN ('inaccurate', 'unhelpful', 'incomplete', 'off_topic') OR category IS NULL),
  comment TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints: One feedback per user per message
  CONSTRAINT unique_user_message_feedback UNIQUE (message_id, user_id)
);

-- Indexes for efficient querying
CREATE INDEX idx_feedback_message ON message_feedback(message_id);
CREATE INDEX idx_feedback_session ON message_feedback(session_id);
CREATE INDEX idx_feedback_user ON message_feedback(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_feedback_rating ON message_feedback(rating);
CREATE INDEX idx_feedback_category ON message_feedback(category) WHERE category IS NOT NULL;
CREATE INDEX idx_feedback_created ON message_feedback(created_at DESC);

-- Row-Level Security (RLS)
ALTER TABLE message_feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view their own feedback
CREATE POLICY "Users can view own feedback"
  ON message_feedback
  FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    (auth.uid() IS NULL AND user_id IS NULL)
  );

-- Policy: Authenticated users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
  ON message_feedback
  FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    (auth.uid() IS NULL AND user_id IS NULL)
  );

-- Policy: Authenticated users can update their own feedback
CREATE POLICY "Users can update own feedback"
  ON message_feedback
  FOR UPDATE
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    (auth.uid() IS NULL AND user_id IS NULL)
  );

-- Policy: Service role can view all feedback (analytics)
CREATE POLICY "Service role can view all feedback"
  ON message_feedback
  FOR SELECT
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Comments for documentation
COMMENT ON TABLE message_feedback IS 'User feedback on AI responses for quality tracking and improvement';
COMMENT ON COLUMN message_feedback.message_id IS 'Reference to the chat message being rated';
COMMENT ON COLUMN message_feedback.session_id IS 'Reference to the chat session';
COMMENT ON COLUMN message_feedback.user_id IS 'User who submitted feedback (NULL for guests)';
COMMENT ON COLUMN message_feedback.rating IS 'Thumbs up (positive) or thumbs down (negative)';
COMMENT ON COLUMN message_feedback.category IS 'Category of negative feedback (only for rating=negative)';
COMMENT ON COLUMN message_feedback.comment IS 'Optional text comment from user';

-- Create analytics view for feedback summary
CREATE OR REPLACE VIEW feedback_summary AS
SELECT
  DATE(created_at) as date,
  COUNT(*) FILTER (WHERE rating = 'positive') as positive,
  COUNT(*) FILTER (WHERE rating = 'negative') as negative,
  COUNT(*) as total,
  ROUND(
    (COUNT(*) FILTER (WHERE rating = 'positive')::numeric / COUNT(*)::numeric * 100),
    1
  ) as positive_percentage,
  COUNT(*) FILTER (WHERE category = 'inaccurate') as inaccurate_count,
  COUNT(*) FILTER (WHERE category = 'unhelpful') as unhelpful_count,
  COUNT(*) FILTER (WHERE category = 'incomplete') as incomplete_count,
  COUNT(*) FILTER (WHERE category = 'off_topic') as off_topic_count
FROM message_feedback
GROUP BY DATE(created_at)
ORDER BY date DESC;

COMMENT ON VIEW feedback_summary IS 'Daily aggregated user feedback metrics for monitoring satisfaction trends';

-- Grant permissions
GRANT SELECT ON feedback_summary TO authenticated;
GRANT SELECT ON feedback_summary TO service_role;
