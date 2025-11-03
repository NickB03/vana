-- Migration: Artifact Versions with Row Level Security
-- Description: Add version control system for artifacts with proper RLS policies
-- Date: November 2, 2025

-- Create artifact_versions table
CREATE TABLE IF NOT EXISTS artifact_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  artifact_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  artifact_type TEXT NOT NULL,
  artifact_title TEXT NOT NULL,
  artifact_content TEXT NOT NULL,
  artifact_language TEXT,
  content_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_artifact_version UNIQUE(artifact_id, version_number)
);

-- Indexes for performance
CREATE INDEX idx_artifact_versions_artifact ON artifact_versions(artifact_id);
CREATE INDEX idx_artifact_versions_message ON artifact_versions(message_id);
CREATE INDEX idx_artifact_versions_hash ON artifact_versions(content_hash);
CREATE INDEX idx_artifact_versions_created ON artifact_versions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE artifact_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view versions from their own messages
CREATE POLICY "Users can view versions from own messages"
  ON artifact_versions FOR SELECT
  USING (
    message_id IN (
      SELECT cm.id
      FROM chat_messages cm
      JOIN chat_sessions cs ON cm.session_id = cs.id
      WHERE cs.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can only create versions in their own messages
CREATE POLICY "Users can create versions in own messages"
  ON artifact_versions FOR INSERT
  WITH CHECK (
    message_id IN (
      SELECT cm.id
      FROM chat_messages cm
      JOIN chat_sessions cs ON cm.session_id = cs.id
      WHERE cs.user_id = auth.uid()
    )
  );

-- Function: Create artifact version atomically (prevents race conditions)
CREATE OR REPLACE FUNCTION create_artifact_version_atomic(
  p_message_id UUID,
  p_artifact_id TEXT,
  p_artifact_type TEXT,
  p_artifact_title TEXT,
  p_artifact_content TEXT,
  p_artifact_language TEXT,
  p_content_hash TEXT
)
RETURNS artifact_versions AS $$
DECLARE
  v_new_version artifact_versions;
  v_latest_hash TEXT;
BEGIN
  -- Check for duplicate content (skip if hash matches latest)
  SELECT content_hash INTO v_latest_hash
  FROM artifact_versions
  WHERE artifact_id = p_artifact_id
  ORDER BY version_number DESC
  LIMIT 1;

  IF v_latest_hash = p_content_hash THEN
    -- Return existing version (no duplicate needed)
    SELECT * INTO v_new_version
    FROM artifact_versions
    WHERE artifact_id = p_artifact_id
    ORDER BY version_number DESC
    LIMIT 1;

    RETURN v_new_version;
  END IF;

  -- Insert new version with atomic version numbering
  INSERT INTO artifact_versions (
    message_id,
    artifact_id,
    version_number,
    artifact_type,
    artifact_title,
    artifact_content,
    artifact_language,
    content_hash
  )
  VALUES (
    p_message_id,
    p_artifact_id,
    COALESCE(
      (SELECT MAX(version_number) + 1
       FROM artifact_versions
       WHERE artifact_id = p_artifact_id),
      1
    ),
    p_artifact_type,
    p_artifact_title,
    p_artifact_content,
    p_artifact_language,
    p_content_hash
  )
  RETURNING * INTO v_new_version;

  RETURN v_new_version;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get version history for an artifact
CREATE OR REPLACE FUNCTION get_artifact_version_history(p_artifact_id TEXT)
RETURNS SETOF artifact_versions AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM artifact_versions
  WHERE artifact_id = p_artifact_id
  ORDER BY version_number DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Cleanup old versions (retention policy: keep last 20)
CREATE OR REPLACE FUNCTION cleanup_old_artifact_versions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH versions_to_keep AS (
    SELECT id
    FROM (
      SELECT id,
             ROW_NUMBER() OVER (
               PARTITION BY artifact_id
               ORDER BY version_number DESC
             ) as rn
      FROM artifact_versions
    ) t
    WHERE rn <= 20
  )
  DELETE FROM artifact_versions
  WHERE id NOT IN (SELECT id FROM versions_to_keep);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add artifact_ids column to chat_messages (for tracking artifacts in messages)
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS artifact_ids TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_chat_messages_artifact_ids
ON chat_messages USING GIN(artifact_ids);

-- Comments for documentation
COMMENT ON TABLE artifact_versions IS 'Stores version history for artifacts with content deduplication via hashing';
COMMENT ON COLUMN artifact_versions.content_hash IS 'SHA-256 hash of artifact_content for detecting duplicate versions';
COMMENT ON COLUMN artifact_versions.artifact_id IS 'Stable identifier linking versions of the same artifact';
COMMENT ON FUNCTION create_artifact_version_atomic IS 'Atomically creates new version with deduplication check';
COMMENT ON FUNCTION cleanup_old_artifact_versions IS 'Retention policy: keeps last 20 versions per artifact';
