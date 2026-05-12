-- Sửa RLS cho phép CẢ hai phía xóa friendship (từ chối / hủy kết bạn)
-- Xóa policy cũ nếu tồn tại
DROP POLICY IF EXISTS "Users can delete own friendship" ON public.friendships;
DROP POLICY IF EXISTS "Addressee can update status" ON public.friendships;

-- Tạo lại policy cho phép cả requester và addressee xóa
CREATE POLICY "Both users can delete friendship"
ON public.friendships FOR DELETE TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Tạo lại policy cho phép cả requester và addressee update (để chấp nhận/từ chối)
CREATE POLICY "Both users can update friendship status"
ON public.friendships FOR UPDATE TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = addressee_id)
WITH CHECK (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Quyền xóa tin nhắn riêng (cho phép chủ tin nhắn xóa)
DROP POLICY IF EXISTS "Users can delete own direct messages" ON public.direct_messages;
CREATE POLICY "Users can delete own direct messages"
ON public.direct_messages FOR DELETE TO authenticated
USING (auth.uid() = sender_id);
