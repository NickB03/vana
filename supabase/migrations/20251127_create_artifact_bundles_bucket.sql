-- Create artifact-bundles storage bucket for server-side bundled artifacts
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'artifact-bundles',
  'artifact-bundles',
  false,
  10485760, -- 10MB max file size
  ARRAY['text/html']
)
ON CONFLICT (id) DO NOTHING;

-- Note: RLS is already enabled on storage.objects by Supabase

-- Policy: Allow authenticated users to upload to their session paths
DROP POLICY IF EXISTS "Users can upload artifact bundles to their sessions" ON storage.objects;
CREATE POLICY "Users can upload artifact bundles to their sessions"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'artifact-bundles'
  AND EXISTS (
    SELECT 1 FROM public.chat_sessions cs
    WHERE cs.id = (storage.foldername(name))[1]::uuid
    AND cs.user_id = auth.uid()
  )
);

-- Policy: Allow service role full access (for Edge Functions)
DROP POLICY IF EXISTS "Service role can manage artifact bundles" ON storage.objects;
CREATE POLICY "Service role can manage artifact bundles"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'artifact-bundles');

-- Policy: Allow users to read their own bundles via signed URLs
DROP POLICY IF EXISTS "Users can read their artifact bundles" ON storage.objects;
CREATE POLICY "Users can read their artifact bundles"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'artifact-bundles'
  AND EXISTS (
    SELECT 1 FROM public.chat_sessions cs
    WHERE cs.id = (storage.foldername(name))[1]::uuid
    AND cs.user_id = auth.uid()
  )
);

-- Policy: Allow public read access for guest bundles via signed URLs
-- (Guest bundles are managed by Edge Function with service_role)
DROP POLICY IF EXISTS "Public read access for artifact bundles" ON storage.objects;
CREATE POLICY "Public read access for artifact bundles"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'artifact-bundles');
