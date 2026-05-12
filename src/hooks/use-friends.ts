import { useEffect, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { toast } from "sonner";

export interface FriendProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  uid?: number;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "blocked";
  created_at: string;
  friend: FriendProfile;
}

export function useFriends() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Danh sách bạn bè đã chấp nhận
  const { data: friends = [], isLoading: loadingFriends } = useQuery({
    queryKey: ["friends", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Friendship[]> => {
      const { data, error } = await supabase
        .from("friendships")
        .select(`
          id, requester_id, addressee_id, status, created_at,
          requester:profiles!friendships_requester_id_fkey(id, display_name, avatar_url, bio),
          addressee:profiles!friendships_addressee_id_fkey(id, display_name, avatar_url, bio)
        `)
        .eq("status", "accepted")
        .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`);

      if (error) throw error;
      return (data ?? []).map((f: any) => ({
        ...f,
        friend: f.requester_id === user!.id ? f.addressee : f.requester,
      }));
    },
  });

  // Danh sách yêu cầu kết bạn (cả đến và đi)
  const { data: pendingRequests = [] } = useQuery({
    queryKey: ["friend-requests", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Friendship[]> => {
      const { data, error } = await supabase
        .from("friendships")
        .select(`
          id, requester_id, addressee_id, status, created_at,
          requester:profiles!friendships_requester_id_fkey(id, display_name, avatar_url, bio),
          addressee:profiles!friendships_addressee_id_fkey(id, display_name, avatar_url, bio)
        `)
        .eq("status", "pending")
        .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`);

      if (error) throw error;
      return (data ?? []).map((f: any) => ({
        ...f,
        friend: f.requester_id === user!.id ? f.addressee : f.requester,
      }));
    },
  });

  // Gửi yêu cầu kết bạn
  const sendRequest = useMutation({
    mutationFn: async (addresseeId: string) => {
      const { error } = await supabase
        .from("friendships")
        .insert({ requester_id: user!.id, addressee_id: addresseeId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã gửi yêu cầu kết bạn! 🎉");
      qc.invalidateQueries({ queryKey: ["friend-requests", user?.id] });
      qc.invalidateQueries({ queryKey: ["friends", user?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Chấp nhận yêu cầu
  const acceptRequest = useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", friendshipId);
      if (error) throw error;
    },
    onMutate: async (friendshipId) => {
      await qc.cancelQueries({ queryKey: ["friend-requests", user?.id] });
      await qc.cancelQueries({ queryKey: ["friends", user?.id] });
      const prevRequests = qc.getQueryData<Friendship[]>(["friend-requests", user?.id]);
      const prevFriends = qc.getQueryData<Friendship[]>(["friends", user?.id]);
      // Xóa khỏi pending, thêm vào friends
      const accepted = prevRequests?.find((r) => r.id === friendshipId);
      if (accepted) {
        qc.setQueryData(["friend-requests", user?.id], (old: Friendship[] = []) =>
          old.filter((r) => r.id !== friendshipId)
        );
        qc.setQueryData(["friends", user?.id], (old: Friendship[] = []) => [
          ...old,
          { ...accepted, status: "accepted" as const },
        ]);
      }
      return { prevRequests, prevFriends };
    },
    onError: (e: any, _, ctx) => {
      qc.setQueryData(["friend-requests", user?.id], ctx?.prevRequests);
      qc.setQueryData(["friends", user?.id], ctx?.prevFriends);
      toast.error(e.message || "Không thể chấp nhận kết bạn");
    },
    onSuccess: () => {
      toast.success("Đã chấp nhận kết bạn! 👋");
      qc.refetchQueries({ queryKey: ["friends", user?.id], exact: true });
      qc.refetchQueries({ queryKey: ["friend-requests", user?.id], exact: true });
    },
  });

  // Từ chối / Hủy kết bạn
  const removeFriend = useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendshipId);
      if (error) throw error;
    },
    onMutate: async (friendshipId) => {
      await qc.cancelQueries({ queryKey: ["friends", user?.id] });
      await qc.cancelQueries({ queryKey: ["friend-requests", user?.id] });
      const prevFriends = qc.getQueryData<Friendship[]>(["friends", user?.id]);
      const prevRequests = qc.getQueryData<Friendship[]>(["friend-requests", user?.id]);
      // Xóa ngay khỏi UI
      qc.setQueryData(["friends", user?.id], (old: Friendship[] = []) =>
        old.filter((f) => f.id !== friendshipId)
      );
      qc.setQueryData(["friend-requests", user?.id], (old: Friendship[] = []) =>
        old.filter((r) => r.id !== friendshipId)
      );
      return { prevFriends, prevRequests };
    },
    onError: (e: any, _, ctx) => {
      // Hoàn lại nếu lỗi
      qc.setQueryData(["friends", user?.id], ctx?.prevFriends);
      qc.setQueryData(["friend-requests", user?.id], ctx?.prevRequests);
      console.error("removeFriend error:", e);
      if (e.message?.includes("violates row-level security") || e.code === "42501") {
        toast.error("Không có quyền xóa. Vui lòng chạy SQL migration.");
      } else {
        toast.error(e.message || "Không thể xóa bạn bè");
      }
    },
    onSuccess: () => {
      toast.success("Đã xóa bạn bè ✅");
      qc.refetchQueries({ queryKey: ["friends", user?.id], exact: true });
      qc.refetchQueries({ queryKey: ["friend-requests", user?.id], exact: true });
    },
  });

  // Kiểm tra quan hệ bạn bè với một user
  const getFriendshipStatus = useCallback(
    (targetUserId: string) => {
      const all = [...friends, ...pendingRequests];
      return all.find(
        (f) => f.requester_id === targetUserId || f.addressee_id === targetUserId
      );
    },
    [friends, pendingRequests]
  );


  // Real-time cập nhật khi có yêu cầu mới (Sử dụng tên channel duy nhất để tránh lỗi)
  useEffect(() => {
    if (!user) return;
    const channelId = `friendships-${user.id}-${Math.random().toString(36).slice(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "friendships",
        filter: `addressee_id=eq.${user.id}`,
      }, () => {
        qc.refetchQueries({ queryKey: ["friend-requests", user.id], exact: true });
        qc.refetchQueries({ queryKey: ["friends", user.id], exact: true });
      })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "friendships",
        filter: `requester_id=eq.${user.id}`,
      }, () => {
        qc.refetchQueries({ queryKey: ["friend-requests", user.id], exact: true });
        qc.refetchQueries({ queryKey: ["friends", user.id], exact: true });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  return {
    friends,
    pendingRequests,
    loadingFriends,
    sendRequest,
    acceptRequest,
    removeFriend,
    getFriendshipStatus,
  };
}


// Hook tìm kiếm người dùng
export function useSearchUsers(query: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["search-users", query],
    enabled: query.trim().length >= 2,
    queryFn: async (): Promise<FriendProfile[]> => {
      const isNumeric = /^\d+$/.test(query);
      let supabaseQuery = supabase
        .from("profiles")
        .select("id, display_name, avatar_url, bio, uid" as any);

      if (isNumeric) {
        supabaseQuery = supabaseQuery.eq("uid", parseInt(query));
      } else {
        supabaseQuery = supabaseQuery.ilike("display_name", `%${query}%`);
      }

      const { data, error } = await supabaseQuery
        .neq("id", user!.id)
        .limit(20);

      if (error) throw error;
      return (data as unknown as FriendProfile[]) ?? [];
    },
  });
}
