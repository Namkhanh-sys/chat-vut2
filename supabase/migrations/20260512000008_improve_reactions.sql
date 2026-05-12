-- Improved Message Reactions
ALTER TABLE public.message_reactions
ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS emoji_name text, -- "❤️" -> "heart", for better organization
ADD COLUMN IF NOT EXISTS reaction_score integer DEFAULT 1; -- For future gamification

-- Reaction summary view
CREATE OR REPLACE VIEW message_reaction_summary AS
SELECT
  message_id,
  emoji,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as unique_users,
  ARRAY_AGG(DISTINCT user_id) as user_ids,
  MAX(created_at) as last_reacted_at
FROM public.message_reactions
GROUP BY message_id, emoji;

-- Function to get popular reactions
CREATE OR REPLACE FUNCTION get_popular_reactions_in_group(group_id_input uuid, limit_count integer DEFAULT 20)
RETURNS TABLE(
  emoji text,
  count bigint,
  unique_users bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mr.emoji,
    COUNT(*) as count,
    COUNT(DISTINCT mr.user_id) as unique_users
  FROM public.message_reactions mr
  JOIN public.messages m ON mr.message_id = m.id
  WHERE m.group_id = group_id_input
  GROUP BY mr.emoji
  ORDER BY count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to suggest reactions based on message context
CREATE OR REPLACE FUNCTION suggest_reactions_for_message(message_id_input uuid)
RETURNS TABLE(
  emoji text,
  count integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mr.emoji,
    COUNT(*) as count
  FROM public.message_reactions mr
  WHERE mr.message_id != message_id_input
  GROUP BY mr.emoji
  ORDER BY count DESC
  LIMIT 8;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index for performance
CREATE INDEX IF NOT EXISTS message_reactions_created_at ON public.message_reactions(created_at DESC);
CREATE INDEX IF NOT EXISTS message_reactions_emoji ON public.message_reactions(emoji);
