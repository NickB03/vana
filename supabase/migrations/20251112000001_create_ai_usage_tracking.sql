-- AI Usage Tracking Table
-- Tracks all AI API calls (Kimi K2, Gemini) for cost monitoring and analytics

CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Request identification
  request_id text NOT NULL,
  function_name text NOT NULL, -- 'generate-artifact', 'generate-artifact-fix', 'chat', 'generate-image'

  -- AI provider details
  provider text NOT NULL, -- 'openrouter', 'gemini'
  model text NOT NULL, -- 'moonshotai/kimi-k2-thinking', 'gemini-2.5-flash', etc.

  -- User context
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_guest boolean NOT NULL DEFAULT false,

  -- Token usage
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,

  -- Performance metrics
  latency_ms integer, -- Time to complete request
  status_code integer NOT NULL, -- HTTP status (200, 429, 503, etc.)

  -- Cost tracking
  estimated_cost decimal(10, 6) NOT NULL DEFAULT 0, -- USD cost estimate

  -- Error tracking
  error_message text,
  retry_count integer NOT NULL DEFAULT 0,

  -- Metadata
  prompt_preview text, -- First 200 chars of prompt (for debugging)
  response_length integer, -- Length of generated content

  -- Indexes for fast queries
  CONSTRAINT valid_status_code CHECK (status_code >= 100 AND status_code < 600)
);

-- Indexes for fast analytics queries
CREATE INDEX idx_ai_usage_created_at ON ai_usage_logs(created_at DESC);
CREATE INDEX idx_ai_usage_function_name ON ai_usage_logs(function_name);
CREATE INDEX idx_ai_usage_provider ON ai_usage_logs(provider);
CREATE INDEX idx_ai_usage_model ON ai_usage_logs(model);
CREATE INDEX idx_ai_usage_user_id ON ai_usage_logs(user_id);
CREATE INDEX idx_ai_usage_status_code ON ai_usage_logs(status_code);

-- Composite index for common queries (date + function + provider)
CREATE INDEX idx_ai_usage_analytics ON ai_usage_logs(created_at DESC, function_name, provider);

-- Enable Row Level Security
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view usage logs
-- You'll need to set admin_role in auth.users metadata or create admin table
CREATE POLICY "Admins can view all usage logs"
  ON ai_usage_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role' = 'admin'
           OR auth.users.email IN (
             'your-admin-email@example.com' -- Replace with your admin email
           ))
    )
  );

-- Policy: Service role can insert (functions use service role)
CREATE POLICY "Service role can insert usage logs"
  ON ai_usage_logs
  FOR INSERT
  WITH CHECK (true); -- Service role bypasses RLS, but explicit policy for clarity

-- Comment for documentation
COMMENT ON TABLE ai_usage_logs IS 'Tracks all AI API usage for cost monitoring, performance analytics, and debugging';
COMMENT ON COLUMN ai_usage_logs.estimated_cost IS 'Estimated cost in USD based on provider pricing';
COMMENT ON COLUMN ai_usage_logs.latency_ms IS 'Time from request to response in milliseconds';
COMMENT ON COLUMN ai_usage_logs.prompt_preview IS 'First 200 characters of user prompt for debugging (PII-safe)';
