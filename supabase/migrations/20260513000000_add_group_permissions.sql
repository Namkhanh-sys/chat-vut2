-- Add is_chat_locked to groups
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS is_chat_locked BOOLEAN DEFAULT false;

-- Add helper function to check if user is admin or owner
CREATE OR REPLACE FUNCTION public.can_manage_group_settings(_group_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups g
    LEFT JOIN public.group_members gm ON g.id = gm.group_id
    WHERE g.id = _group_id 
    AND (g.owner_id = _user_id OR (gm.user_id = _user_id AND gm.role = 'admin'))
  )
$$;

-- Update RLS for messages to support chat lock
DROP POLICY IF EXISTS "Members send messages" ON public.messages;
CREATE POLICY "Members send messages" ON public.messages 
FOR INSERT TO authenticated 
WITH CHECK (
  auth.uid() = sender_id 
  AND public.is_group_member(group_id, auth.uid())
  AND (
    NOT (SELECT is_chat_locked FROM public.groups WHERE id = group_id) 
    OR public.can_manage_group_settings(group_id, auth.uid())
  )
);

-- Update RLS for groups to allow admins to lock chat
DROP POLICY IF EXISTS "Admins update group" ON public.groups;
CREATE POLICY "Admins update group" ON public.groups 
FOR UPDATE TO authenticated 
USING (public.can_manage_group_settings(id, auth.uid()));
