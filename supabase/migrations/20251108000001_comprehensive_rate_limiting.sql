-- Migration: Comprehensive Rate Limiting System
-- Description: Production-ready rate limiting for guests, authenticated users, and API throttling
-- Date: November 8, 2025
-- Priority: HIGH - Production Enhancement

-- ============================================================================
-- OVERVIEW
-- ============================================================================
-- This migration implements a comprehensive rate limiting system:
-- 1. Guest users: 20 requests per 5 hours (updated from 10/24h)
-- 2. Authenticated users: 100 requests per 5 hours
-- 3. Gemini API throttling: 15 requests per minute (RPM)
-- 4. Proactive notifications at warning thresholds
-- 5. Countdown timers for reset times
-- ============================================================================

-- ============================================================================
-- 1. UPDATE GUEST RATE LIMITS (20 requests per 5 hours)
-- ============================================================================

-- Update the check_guest_rate_limit function with new defaults
CREATE OR REPLACE FUNCTION check_guest_rate_limit(
  p_identifier TEXT,
  p_max_requests INTEGER DEFAULT 20,  -- Updated from 10
  p_window_hours INTEGER DEFAULT 5    -- Updated from 24
)
RETURNS JSON AS $$
DECLARE
  v_record guest_rate_limits%ROWTYPE;
  v_window_start TIMESTAMP WITH TIME ZONE;
  v_now TIMESTAMP WITH TIME ZONE := NOW();
  v_allowed BOOLEAN;
  v_remaining INTEGER;
BEGIN
  -- Calculate window start time
  v_window_start := v_now - (p_window_hours || ' hours')::INTERVAL;

  -- Get or create rate limit record
  SELECT * INTO v_record
  FROM guest_rate_limits
  WHERE identifier = p_identifier;

  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO guest_rate_limits (identifier, request_count, window_start, last_request)
    VALUES (p_identifier, 1, v_now, v_now)
    RETURNING * INTO v_record;

    RETURN json_build_object(
      'allowed', true,
      'total', p_max_requests,
      'remaining', p_max_requests - 1,
      'reset_at', v_now + (p_window_hours || ' hours')::INTERVAL
    );
  END IF;

  -- Check if window has expired
  IF v_record.window_start < v_window_start THEN
    -- Reset the window
    UPDATE guest_rate_limits
    SET request_count = 1,
        window_start = v_now,
        last_request = v_now
    WHERE identifier = p_identifier
    RETURNING * INTO v_record;

    RETURN json_build_object(
      'allowed', true,
      'total', p_max_requests,
      'remaining', p_max_requests - 1,
      'reset_at', v_now + (p_window_hours || ' hours')::INTERVAL
    );
  END IF;

  -- Check if limit exceeded
  IF v_record.request_count >= p_max_requests THEN
    RETURN json_build_object(
      'allowed', false,
      'total', p_max_requests,
      'remaining', 0,
      'reset_at', v_record.window_start + (p_window_hours || ' hours')::INTERVAL
    );
  END IF;

  -- Increment counter
  UPDATE guest_rate_limits
  SET request_count = request_count + 1,
      last_request = v_now
  WHERE identifier = p_identifier
  RETURNING * INTO v_record;

  v_remaining := p_max_requests - v_record.request_count;

  RETURN json_build_object(
    'allowed', true,
    'total', p_max_requests,
    'remaining', v_remaining,
    'reset_at', v_record.window_start + (p_window_hours || ' hours')::INTERVAL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Update function comment
COMMENT ON FUNCTION check_guest_rate_limit IS 'Checks and updates rate limit for guest identifier (20 requests per 5 hours)';

-- ============================================================================
-- 2. CREATE USER RATE LIMITS TABLE (100 requests per 5 hours)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_request TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_rate_limits_user_id ON user_rate_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_rate_limits_window_start ON user_rate_limits(window_start);

-- Enable Row Level Security (RLS)
ALTER TABLE user_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own rate limit data
CREATE POLICY "Users can view own rate limits"
  ON user_rate_limits FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Service role can manage all rate limits
CREATE POLICY "Service role can manage user rate limits"
  ON user_rate_limits FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 3. CREATE USER RATE LIMIT CHECK FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION check_user_rate_limit(
  p_user_id UUID,
  p_max_requests INTEGER DEFAULT 100,
  p_window_hours INTEGER DEFAULT 5
)
RETURNS JSON AS $$
DECLARE
  v_record user_rate_limits%ROWTYPE;
  v_window_start TIMESTAMP WITH TIME ZONE;
  v_now TIMESTAMP WITH TIME ZONE := NOW();
  v_remaining INTEGER;
BEGIN
  -- Calculate window start time
  v_window_start := v_now - (p_window_hours || ' hours')::INTERVAL;

  -- Get or create rate limit record
  SELECT * INTO v_record
  FROM user_rate_limits
  WHERE user_id = p_user_id;

  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO user_rate_limits (user_id, request_count, window_start, last_request)
    VALUES (p_user_id, 1, v_now, v_now)
    RETURNING * INTO v_record;

    RETURN json_build_object(
      'allowed', true,
      'total', p_max_requests,
      'remaining', p_max_requests - 1,
      'reset_at', v_now + (p_window_hours || ' hours')::INTERVAL
    );
  END IF;

  -- Check if window has expired
  IF v_record.window_start < v_window_start THEN
    -- Reset the window
    UPDATE user_rate_limits
    SET request_count = 1,
        window_start = v_now,
        last_request = v_now
    WHERE user_id = p_user_id
    RETURNING * INTO v_record;

    RETURN json_build_object(
      'allowed', true,
      'total', p_max_requests,
      'remaining', p_max_requests - 1,
      'reset_at', v_now + (p_window_hours || ' hours')::INTERVAL
    );
  END IF;

  -- Check if limit exceeded
  IF v_record.request_count >= p_max_requests THEN
    RETURN json_build_object(
      'allowed', false,
      'total', p_max_requests,
      'remaining', 0,
      'reset_at', v_record.window_start + (p_window_hours || ' hours')::INTERVAL
    );
  END IF;

  -- Increment counter
  UPDATE user_rate_limits
  SET request_count = request_count + 1,
      last_request = v_now
  WHERE user_id = p_user_id
  RETURNING * INTO v_record;

  v_remaining := p_max_requests - v_record.request_count;

  RETURN json_build_object(
    'allowed', true,
    'total', p_max_requests,
    'remaining', v_remaining,
    'reset_at', v_record.window_start + (p_window_hours || ' hours')::INTERVAL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_user_rate_limit(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_rate_limit(UUID, INTEGER, INTEGER) TO service_role;

COMMENT ON FUNCTION check_user_rate_limit IS 'Checks and updates rate limit for authenticated user (100 requests per 5 hours)';

-- ============================================================================
-- 4. CREATE GET USER RATE LIMIT STATUS FUNCTION (read-only)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_rate_limit_status(
  p_user_id UUID,
  p_max_requests INTEGER DEFAULT 100,
  p_window_hours INTEGER DEFAULT 5
)
RETURNS JSON AS $$
DECLARE
  v_record user_rate_limits%ROWTYPE;
  v_window_start TIMESTAMP WITH TIME ZONE;
  v_now TIMESTAMP WITH TIME ZONE := NOW();
  v_remaining INTEGER;
BEGIN
  -- Calculate window start time
  v_window_start := v_now - (p_window_hours || ' hours')::INTERVAL;

  -- Get rate limit record
  SELECT * INTO v_record
  FROM user_rate_limits
  WHERE user_id = p_user_id;

  -- If no record exists, return full quota
  IF NOT FOUND THEN
    RETURN json_build_object(
      'total', p_max_requests,
      'remaining', p_max_requests,
      'used', 0,
      'reset_at', v_now + (p_window_hours || ' hours')::INTERVAL
    );
  END IF;

  -- Check if window has expired
  IF v_record.window_start < v_window_start THEN
    RETURN json_build_object(
      'total', p_max_requests,
      'remaining', p_max_requests,
      'used', 0,
      'reset_at', v_now + (p_window_hours || ' hours')::INTERVAL
    );
  END IF;

  v_remaining := GREATEST(0, p_max_requests - v_record.request_count);

  RETURN json_build_object(
    'total', p_max_requests,
    'remaining', v_remaining,
    'used', v_record.request_count,
    'reset_at', v_record.window_start + (p_window_hours || ' hours')::INTERVAL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_rate_limit_status(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_rate_limit_status(UUID, INTEGER, INTEGER) TO service_role;

COMMENT ON FUNCTION get_user_rate_limit_status IS 'Gets current rate limit status without incrementing counter';

-- ============================================================================
-- 5. CREATE API THROTTLE STATE TABLE (15 RPM for Gemini API)
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_throttle_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_name TEXT NOT NULL UNIQUE,  -- e.g., 'gemini'
  request_count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_request TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_throttle_state_api_name ON api_throttle_state(api_name);
CREATE INDEX IF NOT EXISTS idx_api_throttle_state_window_start ON api_throttle_state(window_start);

-- Enable Row Level Security (RLS)
ALTER TABLE api_throttle_state ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only service_role can access (no user access)
CREATE POLICY "Service role can manage API throttle state"
  ON api_throttle_state FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE api_throttle_state IS 'Tracks API request throttling state (e.g., Gemini 15 RPM limit)';

-- ============================================================================
-- 6. CREATE API THROTTLE CHECK FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION check_api_throttle(
  p_api_name TEXT,
  p_max_requests INTEGER DEFAULT 15,  -- 15 RPM for Gemini
  p_window_seconds INTEGER DEFAULT 60  -- 1 minute window
)
RETURNS JSON AS $$
DECLARE
  v_record api_throttle_state%ROWTYPE;
  v_window_start TIMESTAMP WITH TIME ZONE;
  v_now TIMESTAMP WITH TIME ZONE := NOW();
  v_remaining INTEGER;
BEGIN
  -- Calculate window start time
  v_window_start := v_now - (p_window_seconds || ' seconds')::INTERVAL;

  -- Get or create throttle state record
  SELECT * INTO v_record
  FROM api_throttle_state
  WHERE api_name = p_api_name;

  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO api_throttle_state (api_name, request_count, window_start, last_request)
    VALUES (p_api_name, 1, v_now, v_now)
    RETURNING * INTO v_record;

    RETURN json_build_object(
      'allowed', true,
      'total', p_max_requests,
      'remaining', p_max_requests - 1,
      'reset_at', v_now + (p_window_seconds || ' seconds')::INTERVAL
    );
  END IF;

  -- Check if window has expired
  IF v_record.window_start < v_window_start THEN
    -- Reset the window
    UPDATE api_throttle_state
    SET request_count = 1,
        window_start = v_now,
        last_request = v_now
    WHERE api_name = p_api_name
    RETURNING * INTO v_record;

    RETURN json_build_object(
      'allowed', true,
      'total', p_max_requests,
      'remaining', p_max_requests - 1,
      'reset_at', v_now + (p_window_seconds || ' seconds')::INTERVAL
    );
  END IF;

  -- Check if limit exceeded
  IF v_record.request_count >= p_max_requests THEN
    RETURN json_build_object(
      'allowed', false,
      'total', p_max_requests,
      'remaining', 0,
      'reset_at', v_record.window_start + (p_window_seconds || ' seconds')::INTERVAL,
      'retry_after', EXTRACT(EPOCH FROM (v_record.window_start + (p_window_seconds || ' seconds')::INTERVAL - v_now))::INTEGER
    );
  END IF;

  -- Increment counter
  UPDATE api_throttle_state
  SET request_count = request_count + 1,
      last_request = v_now
  WHERE api_name = p_api_name
  RETURNING * INTO v_record;

  v_remaining := p_max_requests - v_record.request_count;

  RETURN json_build_object(
    'allowed', true,
    'total', p_max_requests,
    'remaining', v_remaining,
    'reset_at', v_record.window_start + (p_window_seconds || ' seconds')::INTERVAL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_api_throttle(TEXT, INTEGER, INTEGER) TO service_role;

COMMENT ON FUNCTION check_api_throttle IS 'Checks and updates API throttle state (15 RPM for Gemini)';

-- ============================================================================
-- 7. CLEANUP FUNCTIONS
-- ============================================================================

-- Update cleanup function for user rate limits (7 day retention)
CREATE OR REPLACE FUNCTION cleanup_old_user_rate_limits()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_rate_limits
  WHERE created_at < NOW() - INTERVAL '7 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION cleanup_old_user_rate_limits() TO service_role;

COMMENT ON FUNCTION cleanup_old_user_rate_limits IS 'Removes user rate limit records older than 7 days';

-- Cleanup function for API throttle state (1 day retention)
CREATE OR REPLACE FUNCTION cleanup_old_api_throttle_state()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM api_throttle_state
  WHERE created_at < NOW() - INTERVAL '1 day';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION cleanup_old_api_throttle_state() TO service_role;

COMMENT ON FUNCTION cleanup_old_api_throttle_state IS 'Removes API throttle state records older than 1 day';

-- ============================================================================
-- 8. DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE user_rate_limits IS 'Tracks rate limits for authenticated users (100 requests per 5 hours)';
COMMENT ON COLUMN user_rate_limits.user_id IS 'User ID from auth.users';
COMMENT ON COLUMN user_rate_limits.request_count IS 'Number of requests in current window';
COMMENT ON COLUMN user_rate_limits.window_start IS 'Start time of current rate limit window';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Successfully created comprehensive rate limiting system';
  RAISE NOTICE 'Guest: 20 requests per 5 hours';
  RAISE NOTICE 'Authenticated: 100 requests per 5 hours';
  RAISE NOTICE 'Gemini API: 15 requests per minute';
END $$;

