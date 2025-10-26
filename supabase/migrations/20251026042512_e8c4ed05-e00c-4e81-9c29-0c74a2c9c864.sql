-- Create storage bucket for user file uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('user-uploads', 'user-uploads', true);

-- RLS: Users can upload their own files
CREATE POLICY "Users can upload files"
  ON storage.objects 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    bucket_id = 'user-uploads' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS: Users can read their own files
CREATE POLICY "Users can read own files"
  ON storage.objects 
  FOR SELECT 
  TO authenticated
  USING (
    bucket_id = 'user-uploads' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS: Anyone can read public files (since bucket is public)
CREATE POLICY "Public files are readable"
  ON storage.objects 
  FOR SELECT 
  TO public
  USING (bucket_id = 'user-uploads');

-- RLS: Users can delete their own files
CREATE POLICY "Users can delete own files"
  ON storage.objects 
  FOR DELETE 
  TO authenticated
  USING (
    bucket_id = 'user-uploads' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );