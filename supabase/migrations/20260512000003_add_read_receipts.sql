-- Read Receipts Table
CREATE TABLE public.read_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamp with time zone DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Enable RLS
ALTER TABLE public.read_receipts ENABLE ROW LEVEL SECURITY;

-- Allow users to view read receipts for messages they sent or are in the group
CREATE POLICY "Users can view read receipts" ON public.read_receipts
  FOR SELECT
  USING (
    message_id IN (
      SELECT m.id FROM public.messages m
      JOIN public.group_members gm ON m.group_id = gm.group_id
      WHERE gm.user_id = auth.uid()
    )
  );

-- Allow users to insert their own read receipts
CREATE POLICY "Users can insert read receipts" ON public.read_receipts
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Create index for efficient lookups
CREATE INDEX read_receipts_message_id ON public.read_receipts(message_id);
CREATE INDEX read_receipts_user_id ON public.read_receipts(user_id);
