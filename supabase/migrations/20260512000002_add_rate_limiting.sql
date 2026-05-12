-- Rate Limiting Tables
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  count integer DEFAULT 1,
  reset_at timestamp with time zone DEFAULT now() + interval '1 minute',
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, action)
);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own rate limits
CREATE POLICY "Users can view their own rate limits" ON public.rate_limits
  FOR SELECT
  USING (user_id = auth.uid());

-- Create policy to allow users to insert rate limits
CREATE POLICY "Users can insert rate limits" ON public.rate_limits
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Create policy to allow users to update their own rate limits
CREATE POLICY "Users can update their own rate limits" ON public.rate_limits
  FOR UPDATE
  USING (user_id = auth.uid());

-- Create index for efficient lookups
CREATE INDEX rate_limits_user_action ON public.rate_limits(user_id, action);
CREATE INDEX rate_limits_reset_at ON public.rate_limits(reset_at);

-- Message Rate Limiting: Allow max 10 messages per minute
CREATE OR REPLACE FUNCTION check_message_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  message_count integer;
  one_minute_ago timestamp with time zone;
BEGIN
  one_minute_ago := now() - interval '1 minute';
  
  SELECT COUNT(*) INTO message_count
  FROM public.messages
  WHERE sender_id = NEW.sender_id
    AND group_id = NEW.group_id
    AND created_at > one_minute_ago;
  
  IF message_count >= 10 THEN
    RAISE EXCEPTION 'Rate limit exceeded. Maximum 10 messages per minute.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER message_rate_limit_trigger
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION check_message_rate_limit();

-- Login Rate Limiting: Allow max 5 failed attempts per 15 minutes
CREATE OR REPLACE FUNCTION check_login_rate_limit(email_input text)
RETURNS boolean AS $$
DECLARE
  failed_attempts integer;
  fifteen_min_ago timestamp with time zone;
BEGIN
  fifteen_min_ago := now() - interval '15 minutes';
  
  -- You would need to implement failed login tracking in your auth system
  -- This is just an example of the logic
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- File Upload Rate Limiting: Allow max 100MB per hour
CREATE OR REPLACE FUNCTION check_upload_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  upload_total bigint;
  one_hour_ago timestamp with time zone;
BEGIN
  one_hour_ago := now() - interval '1 hour';
  
  SELECT COALESCE(SUM(size_bytes), 0) INTO upload_total
  FROM public.attachments
  JOIN public.messages ON messages.id = attachments.message_id
  WHERE messages.sender_id = auth.uid()
    AND messages.created_at > one_hour_ago;
  
  IF (upload_total + NEW.size_bytes) > (100 * 1024 * 1024) THEN
    RAISE EXCEPTION 'Upload rate limit exceeded. Maximum 100MB per hour.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER upload_rate_limit_trigger
  BEFORE INSERT ON public.attachments
  FOR EACH ROW
  EXECUTE FUNCTION check_upload_rate_limit();
