import { supabase } from "@/integrations/supabase/client";

export type CallType = "voice" | "video";
export type CallStatus = "pending" | "ongoing" | "ended";

export interface CallSession {
  id: string;
  groupId: string;
  initiatorId: string;
  callType: CallType;
  status: CallStatus;
  startedAt: string;
  endedAt?: string;
  participantCount: number;
  callToken?: string;
}

export async function startCall(
  groupId: string,
  callType: CallType,
  initiatorId: string
): Promise<CallSession> {
  const { data, error } = await supabase
    .from("call_sessions")
    .insert({
      group_id: groupId,
      call_type: callType,
      initiator_id: initiatorId,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw error;
  return data as CallSession;
}

export async function joinCall(
  callSessionId: string,
  userId: string
): Promise<void> {
  const { error: participantError } = await supabase.from("call_participants").insert({
    call_session_id: callSessionId,
    user_id: userId,
  });

  if (participantError && participantError.code !== "23505") {
    throw participantError;
  }

  // Update participant count
  const { data: participants } = await supabase
    .from("call_participants")
    .select("id")
    .eq("call_session_id", callSessionId)
    .is("left_at", null);

  await supabase
    .from("call_sessions")
    .update({ participant_count: participants?.length || 1 })
    .eq("id", callSessionId);
}

export async function leaveCall(
  callSessionId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("call_participants")
    .update({ left_at: new Date().toISOString() })
    .eq("call_session_id", callSessionId)
    .eq("user_id", userId);

  if (error) throw error;

  // Update participant count
  const { data: participants } = await supabase
    .from("call_participants")
    .select("id")
    .eq("call_session_id", callSessionId)
    .is("left_at", null);

  if (!participants || participants.length === 0) {
    // End call if no participants left
    await endCall(callSessionId);
  } else {
    await supabase
      .from("call_sessions")
      .update({ participant_count: participants.length })
      .eq("id", callSessionId);
  }
}

export async function endCall(callSessionId: string): Promise<void> {
  const { error } = await supabase.rpc("end_call_session", {
    call_id: callSessionId,
  });

  if (error) throw error;
}

export async function getActiveCallsInGroup(
  groupId: string
): Promise<CallSession[]> {
  const { data, error } = await supabase.rpc("get_active_calls", {
    group_id_input: groupId,
  });

  if (error) throw error;
  return data || [];
}

export async function getCallParticipants(callSessionId: string) {
  const { data, error } = await supabase
    .from("call_participants")
    .select(
      "user_id, joined_at, left_at, profiles!call_participants_user_id_fkey(display_name, avatar_url)"
    )
    .eq("call_session_id", callSessionId);

  if (error) throw error;

  return (data || []).map((p: any) => ({
    userId: p.user_id,
    joinedAt: p.joined_at,
    leftAt: p.left_at,
    displayName: p.profiles?.display_name,
    avatarUrl: p.profiles?.avatar_url,
  }));
}
