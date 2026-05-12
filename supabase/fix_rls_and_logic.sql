-- ===== SỬA LỖI INFINITE RECURSION TRONG GROUP_MEMBERS =====

-- Xóa policy bị lỗi
DROP POLICY IF EXISTS "Members can view members" ON public.group_members;
DROP POLICY IF EXISTS "User joins via insert self" ON public.group_members;

-- Chỉ cho phép user xem record của chính họ (không self-reference)
CREATE POLICY "Members can view own membership"
ON public.group_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Cho phép trigger (SECURITY DEFINER) thêm bất kỳ thành viên nào
-- Policy này chỉ cho phép user tự thêm chính họ
CREATE POLICY "User joins via insert self"
ON public.group_members
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
