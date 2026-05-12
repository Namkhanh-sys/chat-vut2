import { supabase } from "@/integrations/supabase/client";

export async function searchMessages(
  groupId: string,
  query: string
): Promise<
  Array<{
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
    relevance: number;
  }>
> {
  const { data, error } = await supabase.rpc("search_messages", {
    search_query: query,
    group_id_input: groupId,
  });

  if (error) throw error;
  return data ?? [];
}

export async function markMessageAsRead(messageId: string, userId: string) {
  const { error } = await supabase.from("read_receipts").insert({
    message_id: messageId,
    user_id: userId,
  });

  if (error && error.code !== "23505") {
    // 23505 is unique constraint violation (already read)
    throw error;
  }
}

export async function getMessageReadReceipts(messageId: string) {
  const { data, error } = await supabase
    .from("read_receipts")
    .select("user_id, profiles!read_receipts_user_id_fkey(display_name, avatar_url)")
    .eq("message_id", messageId);

  if (error) throw error;

  return (data ?? []).map((receipt: any) => ({
    userId: receipt.user_id,
    displayName: receipt.profiles?.display_name,
    avatarUrl: receipt.profiles?.avatar_url,
  }));
}

export async function getUserStatus(
  userId: string,
  thresholdMinutes = 5
): Promise<"online" | "away" | "offline"> {
  const { data, error } = await supabase.rpc("get_user_status", {
    user_id_input: userId,
    threshold_minutes: thresholdMinutes,
  });

  if (error) return "offline";
  return (data as "online" | "away" | "offline") ?? "offline";
}

export async function getUserLastSeen(userId: string): Promise<Date | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("last_seen_at")
    .eq("id", userId)
    .single();

  if (error || !data?.last_seen_at) return null;
  return new Date(data.last_seen_at);
}
