-- Voice/Video Calls Integration Table
CREATE TABLE public.call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  initiator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  call_type "enum_call_type" NOT NULL DEFAULT 'voice', -- 'voice' | 'video'
  status "enum_call_status" NOT NULL DEFAULT 'pending', -- 'pending' | 'ongoing' | 'ended'
  started_at timestamp with time zone DEFAULT now(),
  ended_at timestamp with time zone,
  participant_count integer DEFAULT 1,
  call_token text, -- For third-party call service (Agora, Daily.co, etc.)
  metadata jsonb, -- Additional call metadata
  created_at timestamp with time zone DEFAULT now()
);

-- Create enums if not exists
CREATE TYPE "enum_call_type" AS ENUM ('voice', 'video');
CREATE TYPE "enum_call_status" AS ENUM ('pending', 'ongoing', 'ended');

-- Call participants table
CREATE TABLE public.call_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_session_id uuid NOT NULL REFERENCES public.call_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamp with time zone DEFAULT now(),
  left_at timestamp with time zone,
  duration_seconds integer,
  UNIQUE(call_session_id, user_id)
);

-- Enable RLS
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_participants ENABLE ROW LEVEL SECURITY;

-- Allow group members to view call sessions
CREATE POLICY "Users can view call sessions in their groups" ON public.call_sessions
  FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM public.group_members
      WHERE user_id = auth.uid()
    )
  );

-- Allow users to start calls in their groups
CREATE POLICY "Users can start calls in their groups" ON public.call_sessions
  FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT group_id FROM public.group_members
      WHERE user_id = auth.uid()
    )
    AND initiator_id = auth.uid()
  );

-- Allow users to view their call participation
CREATE POLICY "Users can view their call participation" ON public.call_participants
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR call_session_id IN (
      SELECT id FROM public.call_sessions
      WHERE group_id IN (
        SELECT group_id FROM public.group_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Allow users to insert their participation
CREATE POLICY "Users can insert their call participation" ON public.call_participants
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Create indexes
CREATE INDEX call_sessions_group_id ON public.call_sessions(group_id);
CREATE INDEX call_sessions_status ON public.call_sessions(status);
CREATE INDEX call_participants_call_session_id ON public.call_participants(call_session_id);
CREATE INDEX call_participants_user_id ON public.call_participants(user_id);

-- Function to end call session
CREATE OR REPLACE FUNCTION end_call_session(call_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.call_sessions
  SET status = 'ended',
      ended_at = now()
  WHERE id = call_id;
  
  UPDATE public.call_participants
  SET left_at = now(),
      duration_seconds = EXTRACT(EPOCH FROM (now() - joined_at))::integer
  WHERE call_session_id = call_id
    AND left_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active calls in group
CREATE OR REPLACE FUNCTION get_active_calls(group_id_input uuid)
RETURNS TABLE(
  id uuid,
  call_type text,
  initiator_id uuid,
  participant_count integer,
  started_at timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cs.id,
    cs.call_type::text,
    cs.initiator_id,
    cs.participant_count,
    cs.started_at
  FROM public.call_sessions cs
  WHERE cs.group_id = group_id_input
    AND cs.status IN ('pending', 'ongoing')
  ORDER BY cs.started_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
