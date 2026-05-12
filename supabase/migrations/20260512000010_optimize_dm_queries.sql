-- Tối ưu hóa và bổ sung cột cho bảng direct_messages
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'text';
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS reply_to UUID REFERENCES public.direct_messages(id) ON DELETE SET NULL;
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Tối ưu hóa truy vấn
CREATE INDEX IF NOT EXISTS idx_direct_conversations_users_composite ON public.direct_conversations (user_a, user_b);
CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation_created ON public.direct_messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_type ON public.direct_messages (type);
