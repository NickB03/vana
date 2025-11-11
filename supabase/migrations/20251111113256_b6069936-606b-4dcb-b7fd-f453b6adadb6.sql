-- ============================================================================
-- ARTIFACT VERSIONING SYSTEM
-- ============================================================================
-- Create artifact_versions table for tracking artifact changes over time
-- Includes RLS policies for user-owned artifacts

-- Create table
CREATE TABLE IF NOT EXISTS public.artifact_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  artifact_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  artifact_type TEXT NOT NULL,
  artifact_title TEXT NOT NULL,
  artifact_content TEXT NOT NULL,
  artifact_language TEXT,
  content_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Composite unique constraint: one version number per artifact
  UNIQUE(artifact_id, version_number)
);

-- Add foreign key to chat_messages
ALTER TABLE public.artifact_versions 
ADD CONSTRAINT artifact_versions_message_id_fkey 
FOREIGN KEY (message_id) 
REFERENCES public.chat_messages(id) 
ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX idx_artifact_versions_artifact_id ON public.artifact_versions(artifact_id);
CREATE INDEX idx_artifact_versions_message_id ON public.artifact_versions(message_id);
CREATE INDEX idx_artifact_versions_content_hash ON public.artifact_versions(content_hash);

-- Enable RLS
ALTER TABLE public.artifact_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view versions from their own messages
CREATE POLICY "Users can view their own artifact versions"
ON public.artifact_versions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chat_messages cm
    JOIN chat_sessions cs ON cm.session_id = cs.id
    WHERE cm.id = artifact_versions.message_id
    AND cs.user_id = auth.uid()
  )
);

-- Users can create versions in their own sessions
CREATE POLICY "Users can create artifact versions in their sessions"
ON public.artifact_versions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_messages cm
    JOIN chat_sessions cs ON cm.session_id = cs.id
    WHERE cm.id = artifact_versions.message_id
    AND cs.user_id = auth.uid()
  )
);

-- Versions are immutable - no updates or deletes
CREATE POLICY "Artifact versions are immutable - no updates"
ON public.artifact_versions
FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "Artifact versions are immutable - no deletes"
ON public.artifact_versions
FOR DELETE
TO authenticated
USING (false);

-- ============================================================================
-- ATOMIC VERSION CREATION FUNCTION
-- ============================================================================
-- Creates new version with automatic deduplication
-- Returns existing version if content hash matches

CREATE OR REPLACE FUNCTION public.create_artifact_version_atomic(
  p_message_id UUID,
  p_artifact_id TEXT,
  p_artifact_type TEXT,
  p_artifact_title TEXT,
  p_artifact_content TEXT,
  p_artifact_language TEXT,
  p_content_hash TEXT
)
RETURNS TABLE (
  id UUID,
  message_id UUID,
  artifact_id TEXT,
  version_number INTEGER,
  artifact_type TEXT,
  artifact_title TEXT,
  artifact_content TEXT,
  artifact_language TEXT,
  content_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_version RECORD;
  v_next_version_number INTEGER;
  v_new_version RECORD;
BEGIN
  -- Check for existing version with same content hash
  SELECT * INTO v_existing_version
  FROM artifact_versions av
  WHERE av.artifact_id = p_artifact_id
  AND av.content_hash = p_content_hash
  ORDER BY av.version_number DESC
  LIMIT 1;

  -- If duplicate found, return existing version
  IF FOUND THEN
    RETURN QUERY
    SELECT 
      v_existing_version.id,
      v_existing_version.message_id,
      v_existing_version.artifact_id,
      v_existing_version.version_number,
      v_existing_version.artifact_type,
      v_existing_version.artifact_title,
      v_existing_version.artifact_content,
      v_existing_version.artifact_language,
      v_existing_version.content_hash,
      v_existing_version.created_at;
    RETURN;
  END IF;

  -- Calculate next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next_version_number
  FROM artifact_versions av
  WHERE av.artifact_id = p_artifact_id;

  -- Insert new version
  INSERT INTO artifact_versions (
    message_id,
    artifact_id,
    version_number,
    artifact_type,
    artifact_title,
    artifact_content,
    artifact_language,
    content_hash
  ) VALUES (
    p_message_id,
    p_artifact_id,
    v_next_version_number,
    p_artifact_type,
    p_artifact_title,
    p_artifact_content,
    p_artifact_language,
    p_content_hash
  )
  RETURNING * INTO v_new_version;

  -- Return new version
  RETURN QUERY
  SELECT 
    v_new_version.id,
    v_new_version.message_id,
    v_new_version.artifact_id,
    v_new_version.version_number,
    v_new_version.artifact_type,
    v_new_version.artifact_title,
    v_new_version.artifact_content,
    v_new_version.artifact_language,
    v_new_version.content_hash,
    v_new_version.created_at;
END;
$$;

-- ============================================================================
-- RATE LIMITING SYSTEM
-- ============================================================================
-- Track user rate limits with automatic reset

-- Create rate_limits table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reset_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Create index
CREATE INDEX idx_rate_limits_user_id ON public.rate_limits(user_id);
CREATE INDEX idx_rate_limits_reset_at ON public.rate_limits(reset_at);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own rate limits"
ON public.rate_limits
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own rate limits"
ON public.rate_limits
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rate limits"
ON public.rate_limits
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- RATE LIMIT STATUS FUNCTION
-- ============================================================================
-- Returns current rate limit status for authenticated user

CREATE OR REPLACE FUNCTION public.get_user_rate_limit_status()
RETURNS TABLE (
  used INTEGER,
  remaining INTEGER,
  total INTEGER,
  reset_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_limit_record RECORD;
  v_total_limit INTEGER := 100; -- Default: 100 requests per window
  v_window_duration INTERVAL := '5 hours';
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get or create rate limit record
  SELECT * INTO v_limit_record
  FROM rate_limits
  WHERE user_id = v_user_id;

  -- If no record exists or window expired, create/reset
  IF NOT FOUND OR v_limit_record.reset_at < now() THEN
    INSERT INTO rate_limits (user_id, request_count, window_start, reset_at)
    VALUES (
      v_user_id,
      0,
      now(),
      now() + v_window_duration
    )
    ON CONFLICT (user_id) DO UPDATE
    SET 
      request_count = 0,
      window_start = now(),
      reset_at = now() + v_window_duration,
      updated_at = now()
    RETURNING * INTO v_limit_record;
  END IF;

  -- Return status
  RETURN QUERY
  SELECT 
    v_limit_record.request_count AS used,
    GREATEST(0, v_total_limit - v_limit_record.request_count) AS remaining,
    v_total_limit AS total,
    v_limit_record.reset_at AS reset_at;
END;
$$;