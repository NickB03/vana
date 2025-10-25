-- Create storage bucket for generated images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('generated-images', 'generated-images', true);

-- Allow authenticated users to upload images to their own folder
CREATE POLICY "Users can upload their own images"
  ON storage.objects 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    bucket_id = 'generated-images' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow public read access to all images
CREATE POLICY "Public can view generated images"
  ON storage.objects 
  FOR SELECT 
  TO public
  USING (bucket_id = 'generated-images');

-- Allow users to delete their own images
CREATE POLICY "Users can delete their own images"
  ON storage.objects 
  FOR DELETE 
  TO authenticated
  USING (
    bucket_id = 'generated-images' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );