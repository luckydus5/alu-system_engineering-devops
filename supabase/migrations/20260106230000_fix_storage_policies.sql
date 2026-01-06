-- Fix storage policies for inventory-images bucket to allow authenticated uploads

-- First, drop existing policies if they exist (they may be blocking uploads)
DROP POLICY IF EXISTS "Anyone can view inventory images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload inventory images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own inventory images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own inventory images" ON storage.objects;

-- Create policies for inventory-images bucket

-- Allow anyone to view inventory images (public bucket)
CREATE POLICY "Anyone can view inventory images"
ON storage.objects FOR SELECT
USING (bucket_id = 'inventory-images');

-- Allow authenticated users to upload inventory images
CREATE POLICY "Authenticated users can upload inventory images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'inventory-images');

-- Allow authenticated users to update inventory images
CREATE POLICY "Authenticated users can update inventory images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'inventory-images');

-- Allow authenticated users to delete inventory images
CREATE POLICY "Authenticated users can delete inventory images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'inventory-images');

-- Ensure the bucket is public for viewing
UPDATE storage.buckets 
SET public = true 
WHERE id = 'inventory-images';
