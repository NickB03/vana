-- Baseline Migration: Create guest_rate_limits table
-- This table was created on remote before migrations were tracked locally
-- Required for subsequent migrations that reference this table

CREATE TABLE IF NOT EXISTS public.guest_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL UNIQUE,
  request_count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_request TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_guest_rate_limits_identifier ON public.guest_rate_limits(identifier);
CREATE INDEX IF NOT EXISTS idx_guest_rate_limits_window_start ON public.guest_rate_limits(window_start);

-- Enable Row Level Security (RLS)
ALTER TABLE public.guest_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only service_role can manage guest rate limits
CREATE POLICY "Service role can manage guest rate limits"
  ON public.guest_rate_limits FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.guest_rate_limits IS 'Tracks rate limits for guest/unauthenticated users';
