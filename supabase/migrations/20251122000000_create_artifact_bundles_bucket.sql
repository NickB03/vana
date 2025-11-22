-- Migration: Create artifact-bundles storage bucket with RLS policies
-- Created: 2025-11-22
-- Purpose: Enable server-side bundling of React artifacts with npm dependencies

-- ============================================================================
-- STORAGE BUCKET CREATION
-- ============================================================================

-- Create storage bucket for artifact bundles
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'artifact-bundles',
  'artifact-bundles',
  false, -- Private bucket (requires authentication)
  10485760, -- 10MB limit (10 * 1024 * 1024 bytes)
  ARRAY['text/html'] -- Only allow HTML files
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on storage.objects table (should already be enabled, but ensure it)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Policy 1: SELECT - Users can view bundles for their own sessions
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view their own artifact bundles"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'artifact-bundles'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text
    FROM chat_sessions
    WHERE user_id = auth.uid()
  )
);

-- ----------------------------------------------------------------------------
-- Policy 2: INSERT - Users can upload bundles for their own sessions
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can upload artifact bundles for their sessions"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'artifact-bundles'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text
    FROM chat_sessions
    WHERE user_id = auth.uid()
  )
);

-- ----------------------------------------------------------------------------
-- Policy 3: UPDATE - Users can update bundles for their own sessions
-- ----------------------------------------------------------------------------
-- This enables re-bundling by allowing overwrites of existing bundles
CREATE POLICY "Users can update their own artifact bundles"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'artifact-bundles'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text
    FROM chat_sessions
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'artifact-bundles'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text
    FROM chat_sessions
    WHERE user_id = auth.uid()
  )
);

-- ----------------------------------------------------------------------------
-- Policy 4: DELETE - Users can delete bundles for their own sessions
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can delete their own artifact bundles"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'artifact-bundles'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text
    FROM chat_sessions
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Create index on chat_sessions(user_id, id) for efficient RLS policy checks
-- This index may already exist from previous migrations, so use IF NOT EXISTS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'chat_sessions'
    AND indexname = 'idx_chat_sessions_user_id_id'
  ) THEN
    CREATE INDEX idx_chat_sessions_user_id_id
    ON chat_sessions(user_id, id);
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES (for manual testing)
-- ============================================================================

-- These queries are commented out but can be used to verify the migration:

-- 1. Verify bucket was created:
-- SELECT * FROM storage.buckets WHERE id = 'artifact-bundles';

-- 2. Verify RLS policies were created:
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'storage'
-- AND tablename = 'objects'
-- AND policyname LIKE '%artifact bundles%';

-- 3. Verify index was created:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- AND tablename = 'chat_sessions'
-- AND indexname = 'idx_chat_sessions_user_id_id';

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================

/*
Path Structure:
  artifact-bundles/{sessionId}/{artifactId}/bundle.html

Example:
  artifact-bundles/123e4567-e89b-12d3-a456-426614174000/456f7890-e89b-12d3-a456-426614174111/bundle.html

Security:
  - RLS policies ensure users can only access bundles for sessions they own
  - Path validation enforces sessionId ownership via chat_sessions table
  - Private bucket requires authentication for all access
  - Signed URLs provide temporary access (1-hour expiry)

Performance:
  - Index on chat_sessions(user_id, id) optimizes RLS policy checks
  - Folder-based path structure enables efficient listing by session

Limits:
  - Max file size: 10MB per bundle
  - Only HTML files allowed (MIME type restriction)
  - Rate limiting: 50 bundles per 5 hours (enforced at Edge Function level)

Cleanup:
  - Bundles are automatically deleted when parent session is deleted (cascade)
  - Manual cleanup: Users can delete bundles via Storage API
  - Consider implementing TTL (time-to-live) for automatic cleanup of old bundles
*/
