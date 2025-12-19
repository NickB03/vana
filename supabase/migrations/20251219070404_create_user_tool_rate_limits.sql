-- Migration: Create user_tool_rate_limits table for tool-specific rate limiting
-- Issue: #340 - Unified Tool-Based Chat Architecture
-- Phase: 0 - Security Infrastructure
--
-- Purpose: Enables separate rate limits per tool type for authenticated users.
-- This prevents rate limit bypass attacks where users could route expensive
-- operations through the unified /chat endpoint.
--
-- Security: Uses SECURITY DEFINER with explicit search_path to prevent
-- schema injection attacks (CVE-compliant).

-- =============================================================================
-- Create the table for tool-specific user rate limits
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_tool_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  last_request TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Composite unique key: one rate limit record per (user, tool) pair
  UNIQUE(user_id, tool_name)
);

-- Index for fast lookups by user_id and tool_name
CREATE INDEX IF NOT EXISTS idx_user_tool_rate_limits_lookup
  ON user_tool_rate_limits(user_id, tool_name, window_start);

-- Enable Row Level Security
ALTER TABLE user_tool_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own rate limit records
CREATE POLICY "Users can view own tool rate limits"
  ON user_tool_rate_limits
  FOR SELECT
  USING (auth.uid() = user_id);

-- =============================================================================
-- Create the RPC function for checking/updating tool-specific rate limits
-- =============================================================================

CREATE OR REPLACE FUNCTION check_user_tool_rate_limit(
  p_user_id UUID,
  p_tool_name TEXT,
  p_max_requests INTEGER,
  p_window_hours INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
  v_window_interval INTERVAL;
BEGIN
  -- Calculate the window interval
  v_window_interval := (p_window_hours || ' hours')::INTERVAL;

  -- Upsert: Insert new record or update existing
  -- If window has expired, reset the counter to 1
  -- Otherwise increment the counter
  INSERT INTO user_tool_rate_limits (user_id, tool_name, request_count, window_start, last_request)
  VALUES (p_user_id, p_tool_name, 1, NOW(), NOW())
  ON CONFLICT (user_id, tool_name) DO UPDATE SET
    request_count = CASE
      WHEN user_tool_rate_limits.window_start < NOW() - v_window_interval
      THEN 1  -- Window expired, reset counter
      ELSE user_tool_rate_limits.request_count + 1  -- Increment counter
    END,
    window_start = CASE
      WHEN user_tool_rate_limits.window_start < NOW() - v_window_interval
      THEN NOW()  -- Window expired, reset window
      ELSE user_tool_rate_limits.window_start  -- Keep existing window
    END,
    last_request = NOW()
  RETURNING request_count, window_start INTO v_count, v_window_start;

  -- Return rate limit status
  RETURN jsonb_build_object(
    'allowed', v_count <= p_max_requests,
    'remaining', GREATEST(0, p_max_requests - v_count),
    'reset_at', v_window_start + v_window_interval,
    'current_count', v_count,
    'limit', p_max_requests
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_user_tool_rate_limit(UUID, TEXT, INTEGER, INTEGER) TO authenticated;
-- Grant to service role for edge function access
GRANT EXECUTE ON FUNCTION check_user_tool_rate_limit(UUID, TEXT, INTEGER, INTEGER) TO service_role;

-- =============================================================================
-- Add comment for documentation
-- =============================================================================

COMMENT ON TABLE user_tool_rate_limits IS
  'Tracks per-tool rate limits for authenticated users. Part of Issue #340 unified chat architecture.';

COMMENT ON FUNCTION check_user_tool_rate_limit IS
  'Atomically checks and updates tool-specific rate limits for a user. Returns JSON with allowed status, remaining requests, and reset time.';
