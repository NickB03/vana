-- Migration: Guest Rate Limiting System
-- Description: Prevents API quota abuse with IP-based rate limiting
-- Date: November 7, 2025
-- Priority: HIGH Security Fix

-- ============================================================================
-- SECURITY CONTEXT
-- ============================================================================
-- Guest users can abuse the API by making unlimited requests, exhausting
-- API quotas and increasing costs. This migration implements a sliding window
-- rate limiting system that:
-- - Limits guests to 10 requests per 24-hour window
-- - Tracks requests by IP address (x-forwarded-for header)
-- - Automatically resets after window expiration
-- - Cleans up old records after 7 days
-- ============================================================================

-- 1. Create guest_rate_limits table
CREATE TABLE IF NOT EXISTS guest_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL UNIQUE,  -- IP address or client identifier
  request_count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_request TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_guest_rate_limits_identifier 
  ON guest_rate_limits(identifier);
CREATE INDEX IF NOT EXISTS idx_guest_rate_limits_window_start 
  ON guest_rate_limits(window_start);
CREATE INDEX IF NOT EXISTS idx_guest_rate_limits_created_at 
  ON guest_rate_limits(created_at);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE guest_rate_limits ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy: Only service_role can access (no user access)
CREATE POLICY "Service role can manage rate limits"
  ON guest_rate_limits FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. Create rate limit check function
CREATE OR REPLACE FUNCTION check_guest_rate_limit(
  p_identifier TEXT,
  p_max_requests INTEGER DEFAULT 10,
  p_window_hours INTEGER DEFAULT 24
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

-- 6. Grant execute permission to service_role
GRANT EXECUTE ON FUNCTION check_guest_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

-- 7. Create cleanup function for old records (7 day retention)
CREATE OR REPLACE FUNCTION cleanup_old_guest_rate_limits()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM guest_rate_limits
  WHERE created_at < NOW() - INTERVAL '7 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 8. Grant execute permission for cleanup function
GRANT EXECUTE ON FUNCTION cleanup_old_guest_rate_limits() TO service_role;

-- 9. Add comments for documentation
COMMENT ON TABLE guest_rate_limits IS 'Tracks rate limits for guest users by IP address';
COMMENT ON COLUMN guest_rate_limits.identifier IS 'IP address from x-forwarded-for header';
COMMENT ON COLUMN guest_rate_limits.request_count IS 'Number of requests in current window';
COMMENT ON COLUMN guest_rate_limits.window_start IS 'Start time of current rate limit window';
COMMENT ON FUNCTION check_guest_rate_limit IS 'Checks and updates rate limit for guest identifier';
COMMENT ON FUNCTION cleanup_old_guest_rate_limits IS 'Removes rate limit records older than 7 days';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Successfully created guest rate limiting system';
  RAISE NOTICE 'Configuration: 10 requests per 24 hours, 7-day retention';
END $$;

