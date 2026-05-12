-- Create typing_indicators table
CREATE TABLE public.typing_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Enable RLS
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

-- Allow users to view typing indicators for groups they are members of
CREATE POLICY "Users can view typing indicators" ON public.typing_indicators
  FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM public.group_members
      WHERE user_id = auth.uid()
    )
  );

-- Allow users to insert typing indicators for groups they are members of
CREATE POLICY "Users can insert typing indicators" ON public.typing_indicators
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND group_id IN (
      SELECT group_id FROM public.group_members
      WHERE user_id = auth.uid()
    )
  );

-- Allow users to delete their own typing indicators
CREATE POLICY "Users can delete their own typing indicators" ON public.typing_indicators
  FOR DELETE
  USING (user_id = auth.uid());

-- Create index for faster queries
CREATE INDEX typing_indicators_group_id ON public.typing_indicators(group_id);
CREATE INDEX typing_indicators_user_id ON public.typing_indicators(user_id);
