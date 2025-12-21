-- Migration: Create generated-images storage bucket
-- This bucket stores AI-generated images with signed URL access
-- Created to fix missing bucket in local dev (Issue: localStorage quota exceeded due to base64 fallback)

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'generated-images', 
  'generated-images', 
  true,  -- Public bucket for signed URL access
  10485760,  -- 10MB file size limit
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for generated-images bucket
-- Note: Using DO $$ block to handle "policy already exists" errors gracefully

DO $$
BEGIN
  -- Allow anyone to read (public bucket with signed URLs)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'generated_images_public_read'
  ) THEN
    CREATE POLICY "generated_images_public_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'generated-images');
  END IF;

  -- Allow service role and authenticated users to insert
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'generated_images_insert'
  ) THEN
    CREATE POLICY "generated_images_insert" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'generated-images');
  END IF;

  -- Allow updates (for upsert operations)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'generated_images_update'
  ) THEN
    CREATE POLICY "generated_images_update" ON storage.objects
    FOR UPDATE USING (bucket_id = 'generated-images');
  END IF;

  -- Allow deletes (for cleanup)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'generated_images_delete'
  ) THEN
    CREATE POLICY "generated_images_delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'generated-images');
  END IF;
END $$;
