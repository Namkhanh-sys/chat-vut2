-- Group Permissions and Roles
CREATE TABLE public.group_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  permissions jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(group_id, name)
);

-- Member permissions with role assignment
ALTER TABLE public.group_members
ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES public.group_roles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Enable RLS
ALTER TABLE public.group_roles ENABLE ROW LEVEL SECURITY;

-- Allow group members to view roles
CREATE POLICY "Users can view group roles" ON public.group_roles
  FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM public.group_members
      WHERE user_id = auth.uid()
    )
  );

-- Allow admins to modify roles
CREATE POLICY "Admins can modify group roles" ON public.group_roles
  FOR UPDATE
  USING (
    group_id IN (
      SELECT g.id FROM public.groups g
      JOIN public.group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = auth.uid() AND gm.is_admin = true
    )
  );

-- Default roles for new groups
CREATE OR REPLACE FUNCTION create_default_group_roles(group_id_input uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO public.group_roles (group_id, name, permissions) VALUES
    (group_id_input, 'Owner', '{"manage_members": true, "manage_roles": true, "delete_group": true, "pin_messages": true}'::jsonb),
    (group_id_input, 'Moderator', '{"manage_members": true, "pin_messages": true, "delete_messages": true}'::jsonb),
    (group_id_input, 'Member', '{"send_messages": true, "react_messages": true}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default roles when group is created
CREATE TRIGGER create_group_roles_trigger
  AFTER INSERT ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION create_default_group_roles(NEW.id);

-- Create index
CREATE INDEX group_roles_group_id ON public.group_roles(group_id);
