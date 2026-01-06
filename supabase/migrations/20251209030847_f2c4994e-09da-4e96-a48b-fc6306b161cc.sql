-- Create storage bucket for report attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'report-attachments', 
  'report-attachments', 
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for report attachments
CREATE POLICY "Users can upload attachments to their department folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'report-attachments' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view attachments from reports they can access"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'report-attachments' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their own attachments"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'report-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);