import { useEffect, useCallback } from "react";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { toast } from "sonner";

export interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
  type: "text" | "image" | "file" | "video" | "system" | "audio";
  reply_to?: string;
}

const PAGE_SIZE = 50;

// Lấy hoặc tạo conversation giữa 2 người
export async function getOrCreateConversation(userId: string, otherUserId: string) {
  // Kiểm tra đã có conversation chưa
  const { data: existing } = await supabase
    .from("direct_conversations")
    .select("id")
    .or(`user_a.eq.${userId},user_a.eq.${otherUserId}`)
    .or(`user_b.eq.${userId},user_b.eq.${otherUserId}`)
    .maybeSingle();

  if (existing) return (existing as any).id;

  // Tạo mới
  const { data: created, error } = await supabase
    .from("direct_conversations")
    .insert({ user_a: userId, user_b: otherUserId })
    .select("id")
    .single();

  if (error) throw error;
  return (created as any).id;
}

export function useDM(conversationId: string | null) {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Lấy tin nhắn với infinite scroll
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["dm-messages", conversationId],
    enabled: !!conversationId && !!user,
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: DirectMessage[]) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return lastPage[lastPage.length - 1].created_at;
    },
    queryFn: async ({ pageParam }): Promise<DirectMessage[]> => {
      let q = supabase
        .from("direct_messages")
        .select(`
          id, conversation_id, sender_id, content, is_read, created_at, type, reply_to,
          sender:profiles!direct_messages_sender_id_fkey(id, display_name, avatar_url)
        `)
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (pageParam) {
        q = q.lt("created_at", pageParam);
      }

      const { data, error } = await q;
      if (error) throw error;
      return ((data ?? []) as any[]).map((m) => ({
        ...m,
        sender: m.sender,
      }));
    },
  });

  const messages = (data?.pages ?? []).flat().reverse();

  // Gửi tin nhắn
  const sendMessage = useMutation({
    mutationFn: async ({ content, type = "text", reply_to }: { content: string | null; type?: any; reply_to?: string }) => {
      const { data, error } = await (supabase
        .from("direct_messages") as any)
        .insert({ conversation_id: conversationId!, sender_id: user!.id, content, type, reply_to })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dm-messages", conversationId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Xóa tin nhắn (Optimistic Update)
  const deleteMessage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("direct_messages").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["dm-messages", conversationId] });
      const previousMessages = qc.getQueryData(["dm-messages", conversationId]);
      qc.setQueryData(["dm-messages", conversationId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => page.filter((m: any) => m.id !== id)),
        };
      });
      return { previousMessages };
    },
    onError: (err, id, context) => {
      qc.setQueryData(["dm-messages", conversationId], context?.previousMessages);
      toast.error(err.message);
    },
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ["dm-messages", conversationId], exact: true });
    },
  });

  // Chỉnh sửa tin nhắn
  const updateMessage = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await supabase
        .from("direct_messages")
        .update({ content, is_edited: true } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ["dm-messages", conversationId], exact: true });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Lấy cảm xúc tin nhắn
  const { data: reactions = [] } = (useQuery as any)({
    queryKey: ["dm-reactions", conversationId, messages.length],
    enabled: !!conversationId && messages.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("direct_message_reactions" as any)
        .select("*")
        .in("message_id", messages.map(m => m.id));
      if (error) throw error;
      return data;
    },
  });

  // Thả/Gỡ cảm xúc
  const toggleReaction = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      const existing = (reactions as any[]).find(
        (r) => r.message_id === messageId && r.user_id === user?.id && r.emoji === emoji
      );
      if (existing) {
        const { error } = await supabase.from("direct_message_reactions" as any).delete().eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("direct_message_reactions" as any).insert({ message_id: messageId, user_id: user?.id, emoji });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dm-reactions", conversationId] });
    },
  });

  // Real-time subscription
  useEffect(() => {
    if (!conversationId || !user) return;

    const channelId = `dm-realtime-${conversationId}`;
    const channel = supabase
      .channel(channelId)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "direct_messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, () => {
        qc.refetchQueries({ queryKey: ["dm-messages", conversationId], exact: true });
      })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "direct_message_reactions",
      }, () => {
        // Force refetch all reactions for this conversation
        qc.invalidateQueries({ queryKey: ["dm-reactions", conversationId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, user, qc]);

  return {
    messages,
    reactions,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    sendMessage,
    deleteMessage,
    updateMessage,
    toggleReaction,
  };
}
