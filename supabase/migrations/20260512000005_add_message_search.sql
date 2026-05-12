-- Message Search Table with Full-Text Search
CREATE TABLE public.message_search (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL UNIQUE REFERENCES public.messages(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  content_search tsvector,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.message_search ENABLE ROW LEVEL SECURITY;

-- Allow users to search only in groups they're members of
CREATE POLICY "Users can search messages in their groups" ON public.message_search
  FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM public.group_members
      WHERE user_id = auth.uid()
    )
  );

-- Create index for full-text search
CREATE INDEX message_search_content_idx ON public.message_search USING GIN(content_search);
CREATE INDEX message_search_group_idx ON public.message_search(group_id);

-- Function to update full-text search index
CREATE OR REPLACE FUNCTION update_message_search()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.message_search (message_id, group_id, content_search)
  VALUES (
    NEW.id,
    NEW.group_id,
    CASE WHEN NEW.content IS NOT NULL
         THEN to_tsvector('vietnamese', NEW.content)
         ELSE to_tsvector('')
    END
  )
  ON CONFLICT (message_id) DO UPDATE SET
    content_search = CASE WHEN NEW.content IS NOT NULL
                          THEN to_tsvector('vietnamese', NEW.content)
                          ELSE to_tsvector('')
                     END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update search index
CREATE TRIGGER update_search_index_on_message
  AFTER INSERT OR UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_message_search();

-- Function to search messages
CREATE OR REPLACE FUNCTION search_messages(search_query text, group_id_input uuid)
RETURNS TABLE(
  id uuid,
  content text,
  sender_id uuid,
  created_at timestamp with time zone,
  relevance float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.content,
    m.sender_id,
    m.created_at,
    ts_rank(ms.content_search, plainto_tsquery('vietnamese', search_query))::float as relevance
  FROM public.messages m
  JOIN public.message_search ms ON m.id = ms.message_id
  WHERE ms.group_id = group_id_input
    AND ms.content_search @@ plainto_tsquery('vietnamese', search_query)
  ORDER BY relevance DESC, m.created_at DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
