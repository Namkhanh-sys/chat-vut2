-- Create attachments table
CREATE TABLE public.attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  url text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Allow users to view attachments from messages they can see
CREATE POLICY "Users can view attachments" ON public.attachments
  FOR SELECT
  USING (
    message_id IN (
      SELECT m.id FROM public.messages m
      JOIN public.group_members gm ON m.group_id = gm.group_id
      WHERE gm.user_id = auth.uid()
    )
  );

-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public) VALUES ('message-images', 'message-images', true)
ON CONFLICT DO NOTHING;

-- Create storage bucket for files
INSERT INTO storage.buckets (id, name, public) VALUES ('message-files', 'message-files', true)
ON CONFLICT DO NOTHING;

-- Allow authenticated users to upload images
CREATE POLICY "Allow user image uploads" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'message-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to upload files
CREATE POLICY "Allow user file uploads" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'message-files'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow public read access to images
CREATE POLICY "Allow public read images" ON storage.objects
  FOR SELECT USING (bucket_id = 'message-images');

-- Allow public read access to files
CREATE POLICY "Allow public read files" ON storage.objects
  FOR SELECT USING (bucket_id = 'message-files');
