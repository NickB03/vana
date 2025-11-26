-- Migration: Add Response Quality Logging Table
-- Description: Stores quality metrics for AI responses to track factuality,
--              consistency, relevance, completeness, and safety scores over time.
-- Date: 2025-11-26
-- Related to: Issue #129 - Response Quality Validation and Ranking

-- Create response_quality_logs table
CREATE TABLE IF NOT EXISTS response_quality_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
  message_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,

  -- Quality metric scores (all 0-1 scale)
  factuality_score NUMERIC(3,2) NOT NULL,
  consistency_score NUMERIC(3,2) NOT NULL,
  relevance_score NUMERIC(3,2) NOT NULL,
  completeness_score NUMERIC(3,2) NOT NULL,
  safety_score NUMERIC(3,2) NOT NULL,
  overall_score NUMERIC(3,2) NOT NULL,

  -- Recommendation from validation system
  recommendation TEXT NOT NULL,

  -- Detailed issues found (JSONB for flexibility)
  issues JSONB DEFAULT '[]'::jsonb NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT valid_factuality_score CHECK (factuality_score >= 0 AND factuality_score <= 1),
  CONSTRAINT valid_consistency_score CHECK (consistency_score >= 0 AND consistency_score <= 1),
  CONSTRAINT valid_relevance_score CHECK (relevance_score >= 0 AND relevance_score <= 1),
  CONSTRAINT valid_completeness_score CHECK (completeness_score >= 0 AND completeness_score <= 1),
  CONSTRAINT valid_safety_score CHECK (safety_score >= 0 AND safety_score <= 1),
  CONSTRAINT valid_overall_score CHECK (overall_score >= 0 AND overall_score <= 1),
  CONSTRAINT valid_recommendation CHECK (recommendation IN ('serve', 'warn', 'regenerate'))
);

-- Indexes for efficient querying
CREATE INDEX idx_quality_logs_session ON response_quality_logs(session_id);
CREATE INDEX idx_quality_logs_message ON response_quality_logs(message_id);
CREATE INDEX idx_quality_logs_overall ON response_quality_logs(overall_score);
CREATE INDEX idx_quality_logs_recommendation ON response_quality_logs(recommendation);
CREATE INDEX idx_quality_logs_created ON response_quality_logs(created_at DESC);
CREATE INDEX idx_quality_logs_safety ON response_quality_logs(safety_score) WHERE safety_score < 1.0;

-- GIN index for searching issues JSONB
CREATE INDEX idx_quality_logs_issues ON response_quality_logs USING GIN (issues);

-- Row-Level Security (RLS)
ALTER TABLE response_quality_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view quality logs for their own sessions
CREATE POLICY "Users can view own quality logs"
  ON response_quality_logs
  FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM chat_sessions WHERE user_id = auth.uid()
    )
  );

-- Policy: Service role can insert quality logs (Edge Functions)
CREATE POLICY "Service role can insert quality logs"
  ON response_quality_logs
  FOR INSERT
  WITH CHECK (true);

-- Policy: Service role can view all quality logs (analytics)
CREATE POLICY "Service role can view all quality logs"
  ON response_quality_logs
  FOR SELECT
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Comments for documentation
COMMENT ON TABLE response_quality_logs IS 'Tracks quality validation metrics for AI responses';
COMMENT ON COLUMN response_quality_logs.factuality_score IS 'Score 0-1 for factual accuracy (hedging vs absolutes, citations)';
COMMENT ON COLUMN response_quality_logs.consistency_score IS 'Score 0-1 for consistency with conversation history';
COMMENT ON COLUMN response_quality_logs.relevance_score IS 'Score 0-1 for relevance to user query (term overlap)';
COMMENT ON COLUMN response_quality_logs.completeness_score IS 'Score 0-1 for completeness of answer';
COMMENT ON COLUMN response_quality_logs.safety_score IS 'Score 0-1 for safety (0 = dangerous content detected)';
COMMENT ON COLUMN response_quality_logs.overall_score IS 'Weighted average of all quality metrics';
COMMENT ON COLUMN response_quality_logs.recommendation IS 'Action recommendation: serve (>0.7), warn (0.4-0.7), regenerate (<0.4)';
COMMENT ON COLUMN response_quality_logs.issues IS 'Array of quality issues found: [{ type, severity, description, location }]';

-- Create view for quality analytics
CREATE OR REPLACE VIEW quality_analytics_daily AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_responses,
  ROUND(AVG(overall_score)::numeric, 3) as avg_overall_score,
  ROUND(AVG(factuality_score)::numeric, 3) as avg_factuality,
  ROUND(AVG(consistency_score)::numeric, 3) as avg_consistency,
  ROUND(AVG(relevance_score)::numeric, 3) as avg_relevance,
  ROUND(AVG(completeness_score)::numeric, 3) as avg_completeness,
  ROUND(AVG(safety_score)::numeric, 3) as avg_safety,
  COUNT(*) FILTER (WHERE recommendation = 'serve') as served_count,
  COUNT(*) FILTER (WHERE recommendation = 'warn') as warned_count,
  COUNT(*) FILTER (WHERE recommendation = 'regenerate') as regenerated_count,
  ROUND(
    (COUNT(*) FILTER (WHERE recommendation = 'serve')::numeric / COUNT(*)::numeric * 100),
    1
  ) as serve_percentage,
  ROUND(
    (COUNT(*) FILTER (WHERE recommendation = 'regenerate')::numeric / COUNT(*)::numeric * 100),
    1
  ) as regeneration_rate
FROM response_quality_logs
GROUP BY DATE(created_at)
ORDER BY date DESC;

COMMENT ON VIEW quality_analytics_daily IS 'Daily aggregated quality metrics for monitoring AI response quality trends';

-- Grant permissions
GRANT SELECT ON quality_analytics_daily TO authenticated;
GRANT SELECT ON quality_analytics_daily TO service_role;
