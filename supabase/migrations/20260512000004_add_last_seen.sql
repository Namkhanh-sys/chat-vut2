-- Update profiles table to include last_seen
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_seen_at timestamp with time zone DEFAULT now();

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS profiles_last_seen_at ON public.profiles(last_seen_at DESC);

-- Function to update last_seen_at
CREATE OR REPLACE FUNCTION update_user_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET last_seen_at = now()
  WHERE id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update last_seen on any message
CREATE TRIGGER update_last_seen_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  WHEN (NEW.sender_id IS NOT NULL)
  EXECUTE FUNCTION update_user_last_seen();

-- Function to get users online status
CREATE OR REPLACE FUNCTION get_user_status(user_id_input uuid, threshold_minutes integer DEFAULT 5)
RETURNS text AS $$
DECLARE
  last_seen timestamp with time zone;
BEGIN
  SELECT last_seen_at INTO last_seen
  FROM public.profiles
  WHERE id = user_id_input;
  
  IF last_seen IS NULL THEN
    RETURN 'offline';
  ELSIF (now() - last_seen) < make_interval(mins => threshold_minutes) THEN
    RETURN 'online';
  ELSE
    RETURN 'away';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
