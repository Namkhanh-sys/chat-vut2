import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { Send, Paperclip, X, Reply, MoreHorizontal, Pencil, Trash2, Users, Loader2, Smile, Menu, ShieldAlert, ShieldCheck, Shield, Phone, Video, MessageSquare, PhoneCall, UserMinus, UserPlus, Search, Mic } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { useTypingIndicators } from "@/hooks/use-typing";
import { useTheme } from "@/hooks/use-theme";
import { uploadFile, isImageFile, isVideoFile } from "@/lib/file-upload";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EmojiPickerComponent } from "@/components/ui/emoji-picker";
import { TypingIndicatorsList } from "./TypingIndicators";
import { cn } from "@/lib/utils";
import { CallInterface } from "./CallInterface";
import { generateRoomId } from "@/lib/zego";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useSidebar } from "@/hooks/use-sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { InviteMembersDialog } from "./InviteMembersDialog";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { VoiceRecorder } from "./VoiceRecorder";
import { CustomAudioPlayer } from "./CustomAudioPlayer";

interface Message {
  id: string;
  group_id: string;
  sender_id: string;
  content: string | null;
  type: "text" | "image" | "file" | "system" | "video" | "audio";
  reply_to: string | null;
  is_edited: boolean;
  is_pinned: boolean;
  deleted_at: string | null;
  created_at: string;
  sender?: { display_name: string; avatar_url: string | null; username: string };
}

interface GroupInfo {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  owner_id: string;
  is_chat_locked: boolean;
}

const EMOJIS = ["❤️", "😂", "👍", "🎉", "🔥", "😮", "😢", "🙏"];
const QUICK_EMOJIS = ["😀","😂","🥰","😎","😭","😡","🤔","👍","👏","🙌","🔥","✨","🎉","💯","❤️","💖","🌹","☕","🍕","🚀"];

const MESSAGE_PAGE_SIZE = 50;

export function ChatRoom({ groupId }: { groupId: string }) {
  const { user, profile } = useAuth();
  const { t, lang } = useI18n();
  const { theme } = useTheme();
  const qc = useQueryClient();
  const { toggle } = useSidebar();
  const { typingUsers, markAsTyping, clearTyping } = useTypingIndicators(groupId);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [callConfig, setCallConfig] = useState<{ isVideo: boolean, messageId?: string, isGroup?: boolean } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const groupAvatarInputRef = useRef<HTMLInputElement>(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [openGroupNameEdit, setOpenGroupNameEdit] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [isUpdatingGroupName, setIsUpdatingGroupName] = useState(false);

  // Group info
  const { data: group } = useQuery({
    queryKey: ["group", groupId],
    queryFn: async (): Promise<GroupInfo | null> => {
      const { data, error } = await (supabase.from("groups") as any).select("id, name, description, avatar_url, owner_id, is_chat_locked").eq("id", groupId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Member count
  const { data: memberCount = 0 } = useQuery({
    queryKey: ["member-count", groupId],
    queryFn: async () => {
      const { count } = await supabase.from("group_members").select("*", { count: "exact", head: true }).eq("group_id", groupId);
      return count ?? 0;
    },
  });

  // Current user's membership
  const { data: myMembership, isLoading: isLoadingMembership } = useQuery({
    queryKey: ["my-membership", groupId, user?.id],
    enabled: !!user && !!groupId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("group_members") as any)
        .select("role, can_message, can_call")
        .eq("group_id", groupId)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Messages with infinite pagination
  const { 
    data: infiniteData, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage,
    isLoading: isLoadingMessages 
  } = useInfiniteQuery({
    queryKey: ["messages", groupId],
    queryFn: async ({ pageParam = 0 }): Promise<Message[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select("*, sender:profiles!messages_sender_id_fkey(display_name, avatar_url, username)")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false })
        .range(pageParam, pageParam + MESSAGE_PAGE_SIZE - 1);
      if (error) throw error;
      return (data ?? []) as Message[];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === MESSAGE_PAGE_SIZE ? allPages.length * MESSAGE_PAGE_SIZE : undefined;
    },
  });

  const messages = useMemo(() => {
    return infiniteData?.pages.flat().reverse() ?? [];
  }, [infiniteData]);

  const isOwner = group?.owner_id === user?.id;
  const isAdmin = myMembership?.role === 'admin' || isOwner;
  const isChatLocked = group?.is_chat_locked ?? false;
  const canChat = !isChatLocked || isAdmin;

  // Group members (Needed for InviteDialog and Sheet)
  const { data: members, isLoading: isLoadingMembers } = useQuery({
    queryKey: ["group-members", groupId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("group_members") as any)
        .select("role, can_message, can_call, user:profiles(id, display_name, avatar_url, bio, status)")
        .eq("group_id", groupId);
      if (error) throw error;
      return data;
    },
    enabled: !!groupId,
  });

  const isLoading = isLoadingMessages && messages.length === 0;

  // Reactions
  const { data: reactions = [] } = useQuery({
    queryKey: ["reactions", groupId, messages.length],
    queryFn: async () => {
      const ids = messages.map((m) => m.id);
      if (ids.length === 0) return [];
      const { data } = await supabase.from("message_reactions").select("*").in("message_id", ids);
      return data ?? [];
    },
    enabled: messages.length > 0,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channelId = `room-${groupId}-${Math.random().toString(36).slice(2, 9)}`;
    const ch = supabase
      .channel(channelId)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `group_id=eq.${groupId}` }, () => {
        qc.refetchQueries({ queryKey: ["messages", groupId], exact: true });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, () => {
        qc.refetchQueries({ queryKey: ["reactions", groupId], exact: true });
      })
      .subscribe();

    // Mark as read
    supabase
      .from("group_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .then();

    return () => { supabase.removeChannel(ch); };
  }, [groupId, user, qc]);

  // Auto-scroll to bottom on initial load and new messages
  const lastMsgId = messages[messages.length - 1]?.id;
  useEffect(() => {
    if (!lastMsgId) return;
    // Only scroll if we are near bottom or it's our message
    const node = scrollRef.current;
    if (node) {
      const isNearBottom = node.scrollHeight - node.scrollTop - node.clientHeight < 200;
      if (isNearBottom) {
        node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
      }
    }
  }, [lastMsgId]);

  const messagesById = useMemo(() => Object.fromEntries(messages.map((m) => [m.id, m])), [messages]);
  const reactionsByMsg = useMemo(() => {
    const map: Record<string, { emoji: string; count: number; mine: boolean }[]> = {};
    for (const r of reactions as any[]) {
      const arr = (map[r.message_id] ??= []);
      const found = arr.find((x) => x.emoji === r.emoji);
      if (found) { found.count++; if (r.user_id === user?.id) found.mine = true; }
      else arr.push({ emoji: r.emoji, count: 1, mine: r.user_id === user?.id });
    }
    return map;
  }, [reactions, user]);

  const handleSend = async () => {
    if (!user || sending) return;
    const trimmed = text.trim();
    if (!trimmed && !editingId) return;
    setSending(true);
    if (editingId) {
      const { error } = await supabase.from("messages").update({ content: trimmed, is_edited: true }).eq("id", editingId);
      if (error) toast.error(error.message);
      setEditingId(null);
    } else {
      const { error } = await supabase.from("messages").insert({
        group_id: groupId,
        sender_id: user.id,
        content: trimmed,
        type: "text",
        reply_to: replyTo?.id ?? null,
      });
      if (error) toast.error(error.message);
    }
    setText("");
    setReplyTo(null);
    setSending(false);
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    const msg = messagesById[id];
    if (!msg) return;

    if (msg.sender_id === user.id) {
      // Tin nhắn của mình -> Xóa thật (Everyone)
      const { error } = await supabase.from("messages").delete().eq("id", id);
      if (error) toast.error(error.message);
    } else {
      // Tin nhắn người khác -> Chỉ xóa ở phía mình (For Me)
      const { error } = await (supabase
        .from("message_deletions" as any))
        .upsert({ user_id: user.id, message_id: id });
      
      if (error) {
        toast.error(error.message);
      } else {
        // Cập nhật UI ngay lập tức cho Infinite Query
        qc.setQueryData(["messages", groupId], (old: any) => {
          if (!old || !old.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page: any) => 
              page.filter((m: any) => m.id !== id)
            ),
          };
        });
        toast.success(t("chat.deleteSuccess"));
      }
    }
  };

  const handleEdit = (m: Message) => {
    setEditingId(m.id);
    setText(m.content ?? "");
    setReplyTo(null);
  };

  const handleReact = async (messageId: string, emoji: string) => {
    if (!user) return;
    const existing = (reactions as any[]).find((r) => r.message_id === messageId && r.user_id === user.id && r.emoji === emoji);
    if (existing) {
      await supabase.from("message_reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("message_reactions").insert({ message_id: messageId, user_id: user.id, emoji });
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setSending(true);
    const result = await uploadFile(file, user.id, (progress) => {
      if (progress.status === "error") {
        toast.error(progress.error || "Upload failed");
      }
    });

    if (!result) {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Create message record
    const isImage = isImageFile(result.mimeType);
    const isVideo = isVideoFile(result.mimeType);
    const { data: msg, error: msgErr } = await supabase
      .from("messages")
      .insert({
        group_id: groupId,
        sender_id: user.id,
        content: (isImage || isVideo) ? null : result.filename,
        type: isImage ? "image" : isVideo ? "video" : "file",
      })
      .select()
      .single();

    if (msgErr || !msg) {
      toast.error(msgErr?.message ?? t("common.error"));
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Create attachment record
    const { error: attachErr } = await supabase.from("attachments").insert({
      message_id: msg.id,
      url: result.publicUrl,
      file_name: result.filename,
      mime_type: result.mimeType,
      size_bytes: result.sizeBytes,
    });

    if (attachErr) {
      toast.error(t("common.error"));
    } else {
      toast.success(t("common.success"));
    }

    setSending(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleVoiceRecording = async (blob: Blob) => {
    if (!user) return;
    setSending(true);

    // Force simple MIME type so Supabase serves correct Content-Type for playback
    const file = new File([blob], `voice-message-${Date.now()}.webm`, { type: "audio/webm" });
    
    const result = await uploadFile(file, user.id, (progress) => {
      if (progress.status === "error") {
        toast.error(progress.error || "Upload failed");
      }
    });

    if (!result) {
      setSending(false);
      return;
    }

    const { data: msg, error: msgErr } = await supabase
      .from("messages")
      .insert({
        group_id: groupId,
        sender_id: user.id,
        content: null,
        type: "file",
      })
      .select()
      .single();

    if (msgErr || !msg) {
      toast.error(msgErr?.message ?? t("common.error"));
      setSending(false);
      return;
    }

    const { error: attachErr } = await supabase.from("attachments").insert({
      message_id: msg.id,
      url: result.publicUrl,
      file_name: result.filename,
      mime_type: result.mimeType,
      size_bytes: result.sizeBytes,
    });

    if (attachErr) {
      toast.error(t("common.error"));
    } else {
      toast.success(t("common.success"));
    }

    setSending(false);
    setShowVoiceRecorder(false);
  };

  const handleUpdateGroupName = async () => {
    if (!newGroupName.trim() || !groupId) return;
    try {
      setIsUpdatingGroupName(true);
      const { error } = await supabase
        .from("groups")
        .update({ name: newGroupName.trim() } as any)
        .eq("id", groupId);
      if (error) throw error;
      toast.success(t("common.success"));
      qc.invalidateQueries({ queryKey: ["group", groupId] });
      qc.invalidateQueries({ queryKey: ["groups"] });
      setOpenGroupNameEdit(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsUpdatingGroupName(false);
    }
  };

  const handleGroupAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !group) return;

    setSending(true);
    const result = await uploadFile(file, user.id, (progress) => {
      if (progress.status === "error") {
        toast.error(progress.error || "Upload failed");
      }
    });

    if (result) {
      const { error } = await (supabase
        .from("groups") as any)
        .update({ avatar_url: result.publicUrl })
        .eq("id", groupId);
      
      if (error) {
        toast.error(error.message);
      } else {
        qc.invalidateQueries({ queryKey: ["group", groupId] });
        toast.success(t("common.success"));
      }
    }

    setSending(false);
    if (groupAvatarInputRef.current) groupAvatarInputRef.current.value = "";
  };

  const handleLeaveGroup = async () => {
    if (!user || !group) return;
    if (isOwner) {
      toast.error("Vui lòng chuyển chủ nhóm trước khi rời!");
      return;
    }
    if (!confirm(t("group.leaveConfirm"))) return;

    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", user.id);
    
    if (error) {
      toast.error(error.message);
    } else {
      window.location.href = "/";
    }
  };

  const handleDeleteGroup = async () => {
    if (!isOwner) return;
    if (!confirm(t("group.deleteConfirm"))) return;

    const { error } = await supabase
      .from("groups")
      .delete()
      .eq("id", groupId);
    
    if (error) {
      toast.error(error.message);
    } else {
      window.location.href = "/";
    }
  };

  if (!group) {
    return (
      <div className="grid h-full place-items-center">
        {isLoading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <p className="text-muted-foreground">{t("common.error")}</p>}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b bg-card px-4 py-3 shadow-card md:px-5">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 md:hidden"
          onClick={toggle}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="relative group/avatar hidden md:block">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={group.avatar_url ?? undefined} />
            <AvatarFallback className="bg-gradient-mint">{group.name[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          {isAdmin && (
            <button 
              onClick={() => groupAvatarInputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity"
              title={t("group.changeAvatar")}
            >
              <Pencil className="h-3 w-3" />
            </button>
          )}
          <input ref={groupAvatarInputRef} type="file" hidden accept="image/*" onChange={handleGroupAvatar} />
        </div>
        <div className="flex-1 min-w-0 ml-1 md:ml-0">
          <div className="truncate font-display text-base md:text-lg font-bold leading-tight">{group.name}</div>
          <div className="flex items-center gap-1 text-[10px] md:text-xs text-muted-foreground opacity-70">
            <Users className="h-2.5 w-2.5" />
            {memberCount} {t("group.members")}
            {myMembership?.can_message === false && (
              <Badge variant="destructive" className="ml-1 text-[7px] px-1 py-0 h-2.5">{t("permissions.readOnly")}</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-xl h-9 w-9 text-muted-foreground hover:text-primary shrink-0 transition-all"
            disabled={isLoadingMembership || !user || myMembership?.can_call === false}
            onClick={async () => {
              if (!user) return;
              const { data } = await supabase.from("messages").insert({
                group_id: groupId,
                sender_id: user.id,
                content: "CALL_INVITE:voice",
                type: "system",
              }).select().single();
              setCallConfig({ isVideo: false, messageId: data?.id, isGroup: true });
            }}
          >
            {isLoadingMembership ? (
              <Loader2 className="h-4 w-4 animate-spin opacity-20" />
            ) : (
              <Phone className={cn("h-5 w-5", myMembership?.can_call === false && "opacity-50")} />
            )}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-xl h-9 w-9 text-muted-foreground hover:text-primary shrink-0 transition-all"
            disabled={isLoadingMembership || !user || myMembership?.can_call === false}
            onClick={async () => {
              if (!user) return;
              const { data } = await supabase.from("messages").insert({
                group_id: groupId,
                sender_id: user.id,
                content: "CALL_INVITE:video",
                type: "system",
              }).select().single();
              setCallConfig({ isVideo: true, messageId: data?.id, isGroup: true });
            }}
          >
            {isLoadingMembership ? (
              <Loader2 className="h-4 w-4 animate-spin opacity-20" />
            ) : (
              <Video className={cn("h-5 w-5", myMembership?.can_call === false && "opacity-50")} />
            )}
          </Button>
          {(isLoadingMembership || isAdmin) && (
            <div className="w-9 h-9 flex items-center justify-center shrink-0">
              {isLoadingMembership ? (
                <div className="h-5 w-5 rounded-full bg-muted animate-pulse" />
              ) : (
                <InviteMembersDialog 
                  groupId={groupId} 
                  existingMemberIds={members?.map((m: any) => m.user.id) || []} 
                />
              )}
            </div>
          )}
          <GroupMembersSheet 
            groupId={groupId} 
            members={members}
            isLoading={isLoadingMembers}
            currentUserId={user?.id} 
            isAdmin={isAdmin}
            isOwner={isOwner}
            isChatLocked={isChatLocked}
            ownerId={group?.owner_id || ''}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9 text-muted-foreground hover:text-primary shrink-0">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleLeaveGroup} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                {t("group.leave")}
              </DropdownMenuItem>
              {isOwner && (
                <>
                  <DropdownMenuItem onClick={() => { setNewGroupName(group?.name || ""); setOpenGroupNameEdit(true); }}>
                    <Pencil className="mr-2 h-4 w-4" />
                    {t("group.changeName")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDeleteGroup} className="text-destructive focus:text-destructive font-bold">
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("group.delete")}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
        {isLoading ? (
          <div className="grid h-full place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : messages.length === 0 ? (
          <div className="grid h-full place-items-center text-center text-muted-foreground">
            <div>
              <div className="mb-2 text-5xl">👋</div>
              <p>{t("chat.empty.desc")}</p>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-1">
            {hasNextPage && (
              <div className="flex justify-center py-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" /> : t("chat.loadMore")}
                </Button>
              </div>
            )}
            {messages.map((m, i) => {
              const prev = messages[i - 1];
              const isMine = m.sender_id === user?.id;
              const showDateSep = !prev || !sameDay(prev.created_at, m.created_at);
              const grouped = prev && prev.sender_id === m.sender_id && sameMinute(prev.created_at, m.created_at);
              return (
                <div key={m.id}>
                  {showDateSep && (
                    <div className="my-4 flex items-center gap-3">
                      <div className="h-px flex-1 bg-border" />
                      <span className="rounded-full bg-muted px-3 py-0.5 text-xs text-muted-foreground">{formatDate(m.created_at, t, lang)}</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  )}
                  <MessageBubble
                    message={m}
                    isMine={isMine}
                    grouped={grouped}
                    replyTo={m.reply_to ? messagesById[m.reply_to] : undefined}
                    reactions={reactionsByMsg[m.id] ?? []}
                    onReply={() => setReplyTo(m)}
                    onEdit={() => handleEdit(m)}
                    onDelete={() => handleDelete(m.id)}
                    onReact={(e) => handleReact(m.id, e)}
                    onJoinCall={(isVideo) => {
                      setCallConfig({ isVideo, messageId: m.id, isGroup: true });
                    }}
                    t={t}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reply / Edit banner */}
      {(replyTo || editingId) && (
        <div className="border-t bg-muted/40 px-5 py-2">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <div className="min-w-0 text-sm">
              <div className="font-medium text-primary">
                {editingId ? t("chat.edit") : `${t("chat.replyingTo")} ${replyTo?.sender?.display_name ?? ""}`}
              </div>
              <div className="truncate text-muted-foreground">
                {editingId 
                  ? messagesById[editingId]?.content 
                  : (replyTo?.type === "system" && replyTo?.content?.startsWith("CALL_INVITE:") 
                      ? t("call.calling") 
                      : replyTo?.type === "system" && replyTo?.content?.startsWith("CALL_ENDED:")
                        ? t("call.ended")
                        : replyTo?.type === "image"
                          ? `[${t("chat.image") || "Image"}]`
                          : replyTo?.type === "video"
                            ? `[${t("chat.video") || "Video"}]`
                            : replyTo?.type === "audio"
                              ? `[${t("chat.audio") || "Voice message"}]`
                              : replyTo?.type === "file"
                                ? `[${t("chat.file") || "File"}]`
                                : replyTo?.content) ?? ""}
              </div>
            </div>
            <Button size="icon" variant="ghost" onClick={() => { setReplyTo(null); setEditingId(null); setText(""); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Typing Indicators */}
      <TypingIndicatorsList users={typingUsers.map((u) => ({
        id: u.id,
        display_name: u.display_name,
        avatar_url: u.avatar_url,
      }))} />

      {/* Input */}
      <div className="p-4 border-t bg-card/30 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl flex gap-2 items-end">
          <input ref={fileInputRef} type="file" hidden onChange={handleFile} />
          <Button size="icon" variant="ghost" className="h-10 w-10 shrink-0" onClick={() => fileInputRef.current?.click()} disabled={sending}>
            <Paperclip className="h-5 w-5" />
          </Button>
          <EmojiPickerComponent
            onEmojiClick={(emoji) => setText((p) => p + emoji)}
            theme={theme === "dark" ? "dark" : "light"}
          />

          {showVoiceRecorder ? (
            <div className="flex-1 min-h-[42px] flex items-center">
              <VoiceRecorder
                onRecordingComplete={handleVoiceRecording}
                onCancel={() => setShowVoiceRecorder(false)}
                isUploading={sending}
              />
            </div>
          ) : (
            <>
              <Textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  if (e.target.value.trim()) {
                    markAsTyping();
                  } else {
                    clearTyping();
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (myMembership?.can_message !== false && canChat) {
                      handleSend();
                      clearTyping();
                    }
                  }
                }}
                placeholder={
                  myMembership?.can_message === false 
                    ? t("permissions.denied") 
                    : isChatLocked && !isAdmin 
                      ? t("permissions.lockChat") 
                      : t("chat.placeholder")
                }
                rows={1}
                disabled={sending || myMembership?.can_message === false || (isChatLocked && !isAdmin)}
                className="min-h-[42px] max-h-32 flex-1 resize-none rounded-2xl border-none bg-muted/50 px-4 py-2.5 text-sm focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
              />
              {!text.trim() && !editingId && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 shrink-0 text-muted-foreground hover:text-primary"
                  onClick={() => setShowVoiceRecorder(true)}
                  disabled={sending || myMembership?.can_message === false || (isChatLocked && !isAdmin)}
                >
                  <Mic className="h-5 w-5" />
                </Button>
              )}
            </>
          )}

          {(text.trim() || editingId) && (
            <Button
              size="icon"
              className="h-10 w-10 shrink-0 rounded-full bg-gradient-primary shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
              onClick={handleSend}
              disabled={(!text.trim() && !editingId) || sending || myMembership?.can_message === false || (isChatLocked && !isAdmin)}
            >
              {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          )}
        </div>
      </div>

      {callConfig && user && (
        <CallInterface
          roomId={generateRoomId(groupId)}
          userId={user.id}
          userName={profile?.display_name || "User"}
          isVideo={callConfig.isVideo}
          messageId={callConfig.messageId}
          isGroup={true}
          onClose={() => setCallConfig(null)}
        />
      )}

      <Dialog open={openGroupNameEdit} onOpenChange={setOpenGroupNameEdit}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{t("group.changeName")}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder={t("group.name")}
              className="rounded-xl bg-muted/50 border-none h-11"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleUpdateGroupName()}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setOpenGroupNameEdit(false)} className="rounded-xl">
              {t("common.cancel")}
            </Button>
            <Button onClick={handleUpdateGroupName} disabled={isUpdatingGroupName} className="rounded-xl bg-gradient-primary text-white shadow-soft">
              {isUpdatingGroupName && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MessageBubble({
  message, isMine, grouped, replyTo, reactions, onReply, onEdit, onDelete, onReact, onJoinCall, t,
}: {
  message: Message;
  isMine: boolean;
  grouped: boolean;
  replyTo?: Message;
  reactions: { emoji: string; count: number; mine: boolean }[];
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
  onJoinCall?: (isVideo: boolean) => void;
  t: (k: any) => string;
}) {
   const [hovered, setHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [attachments, setAttachments] = useState<{ url: string; file_name: string; mime_type: string | null }[]>([]);

  useEffect(() => {
    if (message.type === "image" || message.type === "file" || message.type === "video" || message.type === "audio") {
      supabase.from("attachments").select("url, file_name, mime_type").eq("message_id", message.id).then(({ data }) => {
        setAttachments(data ?? []);
      });
    }
  }, [message.id, message.type]);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group flex gap-2 ${isMine ? "justify-end" : "justify-start"} ${grouped ? "mt-0.5" : "mt-3"}`}
    >
      {!isMine && (
        <div className="w-8 shrink-0">
          {!grouped && (
            <Avatar className="h-8 w-8">
              <AvatarImage src={message.sender?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-gradient-mint text-xs">{message.sender?.display_name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
            </Avatar>
          )}
        </div>
      )}

      <div className={`flex max-w-[75%] flex-col ${isMine ? "items-end" : "items-start"}`}>
        {!grouped && !isMine && (
          <div className="mb-0.5 px-2 text-xs font-semibold text-muted-foreground">{message.sender?.display_name}</div>
        )}

        <div className="relative flex items-center gap-1">
          {isMine && (hovered || isMenuOpen) && (
            <div className="absolute right-full mr-2 z-10 top-1/2 -translate-y-1/2">
              <MessageActions 
                onReply={onReply} 
                onEdit={onEdit} 
                onDelete={onDelete} 
                onReact={onReact} 
                onOpenChange={setIsMenuOpen}
                canEdit={message.type === "text"} 
                t={t} 
              />
            </div>
          )}
          <div
            className={`relative animate-bubble-in rounded-2xl px-3.5 py-2 ${
              isMine 
                ? message.type === "file" && attachments[0]?.file_name?.startsWith("voice-message")
                  ? "rounded-br-md bg-[#E3F2FD] text-[#0D47A1] dark:bg-[#1E3A8A]/40 dark:text-blue-100"
                  : "rounded-br-md bg-gradient-primary text-primary-foreground" 
                : message.type === "file" && attachments[0]?.file_name?.startsWith("voice-message")
                  ? "rounded-bl-md bg-[#E3F2FD] text-[#0D47A1] dark:bg-[#1E3A8A]/40 dark:text-blue-100"
                  : "rounded-bl-md bg-muted text-foreground"
            } ${message.deleted_at ? "italic opacity-60" : ""}`}
          >
            {replyTo && (
              <div className={`mb-1 rounded-lg border-l-2 px-2 py-1 text-xs ${isMine ? "border-primary-foreground/60 bg-primary-foreground/10" : "border-primary bg-background/60"}`}>
                <div className="font-semibold opacity-80">
                  {replyTo.type === "image" ? t("chat.image") : 
                   replyTo.type === "video" ? t("chat.video") : 
                   replyTo.type === "audio" ? t("chat.audio") : 
                   replyTo.type === "file" ? t("chat.file") : 
                   replyTo.sender?.display_name}
                </div>
                <div className="truncate opacity-70">
                  {replyTo.type === "text" 
                    ? replyTo.content 
                    : replyTo.type === "system" && replyTo.content?.startsWith("CALL_INVITE:") 
                      ? t("call.calling") 
                      : replyTo.type === "system" && replyTo.content?.startsWith("CALL_ENDED:") 
                        ? t("call.ended")
                        : ""}
                </div>
              </div>
            )}
            
            {message.type === "system" && message.content?.startsWith("CALL_ENDED:") ? (
              <div className="flex flex-col gap-3 p-1 min-w-[200px] opacity-70">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-background/30 flex items-center justify-center shrink-0 shadow-sm">
                    {message.content.includes("video") ? <Video className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold leading-tight">
                      {message.sender?.display_name}
                    </div>
                     <div className="text-xs font-medium mt-0.5">
                      {t("call.ended")}
                    </div>
                  </div>
                </div>
              </div>
            ) : message.type === "system" && message.content?.startsWith("CALL_INVITE:") ? (
              <div className="flex flex-col gap-3 p-1 min-w-[200px]">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-background/30 flex items-center justify-center shrink-0 shadow-sm">
                    {message.content.includes("video") ? <Video className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold leading-tight">
                      {message.sender?.display_name}
                    </div>
                    <div className="text-xs opacity-90 font-medium mt-0.5">
                      {t("call.calling")} {message.content.includes("video") ? t("call.video_call") : t("call.voice_call")}...
                    </div>
                  </div>
                </div>
                {!isMine && onJoinCall && (
                  <Button 
                    size="sm" 
                    className="w-full h-8 text-xs bg-white text-black hover:bg-white/90 font-bold shadow-md hover:scale-[1.02] transition-transform" 
                    onClick={() => onJoinCall(message.content!.includes("video"))}
                  >
                    {t("call.join")}
                  </Button>
                )}
              </div>
            ) : (
              <>
                {message.type === "image" && attachments[0] && (
                  <a href={attachments[0].url} target="_blank" rel="noreferrer">
                    <img src={attachments[0].url} alt={attachments[0].file_name} className="max-h-64 rounded-xl" />
                  </a>
                )}
                {message.type === "video" && attachments[0] && (
                  <div className="max-w-full overflow-hidden rounded-xl bg-black/5">
                    <video 
                      src={attachments[0].url} 
                      controls 
                      className="max-h-80 w-full"
                      poster={attachments[0].url + "#t=0.1"}
                    >
                    </video>
                  </div>
                )}
                {message.type === "file" && !attachments[0] && (
                  <div className="flex items-center gap-2 py-2 px-1">
                    <Loader2 className="h-4 w-4 animate-spin opacity-50" />
                    <span className="text-xs opacity-50 italic">{t("chat.voice.loading")}</span>
                  </div>
                )}
                {message.type === "file" && attachments[0] && (
                  (() => {
                    const att = attachments[0];
                    const isAudio = att.mime_type?.startsWith("audio/") ||
                                    att.file_name?.startsWith("voice-message") ||
                                    att.file_name?.endsWith(".webm") ||
                                    att.file_name?.endsWith(".ogg") ||
                                    att.file_name?.endsWith(".mp3");
                    return isAudio ? (
                      <div className="py-1">
                        <CustomAudioPlayer src={att.url} isMine={isMine} />
                      </div>
                    ) : (
                      <a href={att.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 underline">
                        <Paperclip className="h-4 w-4" />
                        {att.file_name}
                      </a>
                    );
                  })()
                )}
                {message.content && (message.type === "text" || message.content !== attachments[0]?.file_name) && (
                  <div className="whitespace-pre-wrap break-words">{message.content}</div>
                )}
              </>
            )}
            
            {message.is_edited && <span className="ml-1 text-[10px] opacity-60">({t("chat.edited")})</span>}
          </div>
          {!isMine && (hovered || isMenuOpen) && (
            <div className="absolute left-full ml-2 z-10 top-1/2 -translate-y-1/2">
              <MessageActions 
                onReply={onReply} 
                onEdit={onEdit} 
                onDelete={onDelete} 
                onReact={onReact} 
                onOpenChange={setIsMenuOpen}
                t={t} 
              />
            </div>
          )}
        </div>

        {reactions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => onReact(r.emoji)}
                className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${
                  r.mine ? "border-primary bg-primary/10" : "border-border bg-card"
                }`}
              >
                <span>{r.emoji}</span>
                <span className="font-medium">{r.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MessageActions({ onReply, onEdit, onDelete, onReact, onOpenChange, canEdit, t }: {
  onReply: () => void; onEdit: () => void; onDelete: () => void; onReact: (e: string) => void; onOpenChange?: (open: boolean) => void; canEdit?: boolean; t: (k: any) => string;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-full border bg-card p-0.5 shadow-card">
      <Popover>
        <PopoverTrigger asChild>
          <Button size="icon" variant="ghost" className="h-7 w-7"><Smile className="h-3.5 w-3.5" /></Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" side="top">
          <div className="flex gap-1 p-1">
            {EMOJIS.map((e) => (
              <button key={e} onClick={() => onReact(e)} className="rounded-md p-1 text-lg hover:bg-muted">{e}</button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onReply}><Reply className="h-3.5 w-3.5" /></Button>
      <DropdownMenu onOpenChange={onOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canEdit && <DropdownMenuItem onClick={onEdit}><Pencil className="mr-2 h-4 w-4" />{t("chat.edit")}</DropdownMenuItem>}
          <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />{t("chat.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function GroupMembersSheet({ 
  groupId, 
  members,
  isLoading,
  currentUserId, 
  isAdmin, 
  isOwner,
  isChatLocked,
  ownerId
}: { 
  groupId: string, 
  members: any[] | undefined,
  isLoading: boolean,
  currentUserId?: string, 
  isAdmin?: boolean,
  isOwner?: boolean,
  isChatLocked?: boolean,
  ownerId?: string
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { t } = useI18n();
  const qc = useQueryClient();

  const removeAccents = (str: string) => {
    return str.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D");
  };

  const filteredMembers = useMemo(() => {
    return members?.filter((m: any) => {
      const name = m.user.display_name.toLowerCase();
      const searchLower = search.toLowerCase();
      return name.includes(searchLower) || removeAccents(name).includes(removeAccents(searchLower));
    });
  }, [members, search]);

  const handleTogglePermission = async (userId: string, field: 'can_message' | 'can_call', value: boolean) => {
    const { error } = await (supabase
      .from("group_members") as any)
      .update({ [field]: value })
      .eq("group_id", groupId)
      .eq("user_id", userId);
    
    if (error) {
      toast.error(error.message);
    } else {
      qc.invalidateQueries({ queryKey: ["group-members", groupId] });
      if (userId === currentUserId) {
        qc.invalidateQueries({ queryKey: ["my-membership", groupId, currentUserId] });
      }
      toast.success(t("common.success"));
    }
  };

  const handleToggleChatLock = async (locked: boolean) => {
    const { error } = await (supabase
      .from("groups") as any)
      .update({ is_chat_locked: locked })
      .eq("id", groupId);
    
    if (error) {
      toast.error(error.message);
    } else {
      qc.invalidateQueries({ queryKey: ["group", groupId] });
      toast.success(t("common.success"));
    }
  };

  const handleChangeRole = async (userId: string, newRole: 'admin' | 'member') => {
    const { error } = await (supabase
      .from("group_members") as any)
      .update({ role: newRole })
      .eq("group_id", groupId)
      .eq("user_id", userId);
    
    if (error) {
      toast.error(error.message);
    } else {
      qc.invalidateQueries({ queryKey: ["group-members", groupId] });
      if (userId === currentUserId) {
        qc.invalidateQueries({ queryKey: ["my-membership", groupId, currentUserId] });
      }
      toast.success(t("common.success"));
    }
  };
  const handleTransferOwnership = async (userId: string) => {
    if (!isOwner) return;
    if (!confirm(t("group.transferConfirm"))) return;

    const { error } = await (supabase
      .from("groups") as any)
      .update({ owner_id: userId })
      .eq("id", groupId);
    
    if (error) {
      toast.error(error.message);
    } else {
      // Also make the new owner an admin if they weren't already
      await (supabase.from("group_members") as any).update({ role: 'admin' }).eq("group_id", groupId).eq("user_id", userId);
      
      qc.invalidateQueries({ queryKey: ["group", groupId] });
      qc.invalidateQueries({ queryKey: ["group-members", groupId] });
      if (userId === currentUserId || currentUserId) {
        qc.invalidateQueries({ queryKey: ["my-membership", groupId, currentUserId] });
      }
      toast.success(t("common.success"));
    }
  };

  const handleKickMember = async (userId: string) => {
    if (!isAdmin && !isOwner) return;
    if (!confirm(t("permissions.kickConfirm") || "Are you sure you want to kick this member?")) return;

    const { error } = await (supabase
      .from("group_members") as any)
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId);
    
    if (error) {
      toast.error(error.message);
    } else {
      qc.invalidateQueries({ queryKey: ["group-members", groupId] });
      toast.success(t("common.success"));
    }
  };

  const isMobile = useIsMobile();

  const Content = (
    <div className="flex flex-col h-full overflow-hidden">
      <div className={cn("bg-gradient-primary p-5 pb-6 text-primary-foreground shadow-lg relative overflow-hidden", isMobile ? "rounded-t-none" : "rounded-t-3xl")}>
        {/* Subtle decorative circle */}
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="p-3 bg-white/20 rounded-2xl shadow-inner shrink-0">
            <Users className="h-6 w-6 text-white" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-lg font-black tracking-tight text-white leading-tight truncate">
              {t("permissions.title")}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
              </span>
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                {members?.length ?? 0} {t("permissions.membersCount")}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className={cn("overflow-y-auto p-2 bg-card scrollbar-thin", isMobile ? "max-h-[70vh]" : "max-h-[450px]")}>
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary opacity-50" />
          </div>
        ) : (
          <div className="space-y-1">
            {isAdmin && (
              <div className="px-4 py-5 border-b border-border/40 mb-4 bg-muted/10">
                <div className="flex items-center justify-between gap-4 p-5 rounded-[28px] bg-card border border-border/50 shadow-sm transition-all hover:shadow-md">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-primary/10 rounded-2xl shadow-inner">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[13px] font-black uppercase tracking-tight text-foreground leading-none">{t("permissions.lockChat")}</span>
                      <span className="text-[10px] opacity-50 font-bold uppercase tracking-widest">{t("permissions.admin")}</span>
                    </div>
                  </div>
                  <Switch 
                    checked={isChatLocked}
                    onCheckedChange={handleToggleChatLock}
                    className="data-[state=checked]:bg-primary shadow-sm"
                  />
                </div>
              </div>
            )}

            <div className="px-4 mb-5">
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none transition-colors group-focus-within:text-primary text-muted-foreground/60">
                  <Search className="h-5 w-5" />
                </div>
                <Input 
                  placeholder={t("friends.search")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-12 h-12 rounded-[22px] bg-muted/40 border-border/50 focus:bg-background focus:ring-2 focus:ring-primary/10 transition-all shadow-inner text-sm font-medium"
                />
              </div>
            </div>

            <div className="px-3 space-y-3 pb-4">
              {filteredMembers?.map((m: any) => (
                <div key={m.user.id} className="group relative flex flex-col gap-4 rounded-[32px] p-5 bg-card border border-border/40 hover:border-primary/20 hover:bg-muted/30 transition-all duration-300 hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="h-14 w-14 ring-4 ring-background shadow-xl">
                        <AvatarImage src={m.user.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-gradient-mint text-base font-black">
                          {m.user.display_name[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        "absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full border-4 border-background shadow-sm",
                        m.user.status === 'online' ? "bg-green-500" : "bg-gray-400"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-base font-black truncate text-foreground tracking-tight">{m.user.display_name}</p>
                        {m.user.id === ownerId ? (
                           <span className="text-[9px] font-black uppercase tracking-tighter bg-amber-500/10 text-amber-500 px-2 py-1 rounded-lg border border-amber-500/20 shadow-sm">{t("permissions.owner")}</span>
                        ) : m.role === 'admin' ? (
                          <span className="text-[9px] font-black uppercase tracking-tighter bg-primary/10 text-primary px-2 py-1 rounded-lg border border-primary/20 shadow-sm">{t("permissions.admin")}</span>
                        ) : (
                          <span className="text-[9px] font-bold uppercase tracking-tighter bg-muted/80 text-muted-foreground px-2 py-1 rounded-lg border border-border/50">{t("permissions.member")}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate italic opacity-60 font-medium">{m.user.bio || "No status set"}</p>
                    </div>
                  </div>
                  
                  {(isOwner || (isAdmin && m.role === 'member')) && m.user.id !== currentUserId && (
                    <div className="grid grid-cols-2 gap-2.5">
                      {isOwner && (
                        <>
                          {m.role === 'admin' ? (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-10 text-[10px] font-black uppercase tracking-tight text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-2xl justify-start gap-2.5 px-4 border border-border/50 hover:border-destructive/20 transition-all bg-muted/20"
                              onClick={() => handleChangeRole(m.user.id, 'member')}
                            >
                              <Shield className="h-4 w-4" />
                              {t("permissions.demote")}
                            </Button>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-10 text-[10px] font-black uppercase tracking-tight text-primary hover:bg-primary/5 rounded-2xl justify-start gap-2.5 px-4 border border-border/50 hover:border-primary/20 transition-all bg-muted/20"
                              onClick={() => handleChangeRole(m.user.id, 'admin')}
                            >
                              <ShieldCheck className="h-4 w-4" />
                              {t("permissions.promote")}
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-10 text-[10px] font-black uppercase tracking-tight text-amber-500 hover:bg-amber-500/5 rounded-2xl justify-start gap-2.5 px-4 border border-border/50 hover:border-amber-500/20 transition-all bg-muted/20"
                            onClick={() => handleTransferOwnership(m.user.id)}
                          >
                            <ShieldAlert className="h-4 w-4" />
                            {t("group.transfer")}
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                  
                  {isAdmin && m.user.id !== currentUserId && (
                    <div className="flex items-center justify-between gap-4 rounded-2xl bg-muted/30 p-3.5 border border-border/40 shadow-inner">
                      <div className="flex items-center gap-6">
                        <label className="flex flex-col items-center gap-2 cursor-pointer group/perm">
                          <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest group-hover/perm:text-primary transition-colors">{t("permissions.chat")}</span>
                          <Switch 
                            checked={m.can_message !== false}
                            onCheckedChange={(val) => handleTogglePermission(m.user.id, 'can_message', val)}
                            className="data-[state=checked]:bg-green-500 scale-100 shadow-sm"
                          />
                        </label>
                        <div className="w-px h-8 bg-border/50" />
                        <label className="flex flex-col items-center gap-2 cursor-pointer group/perm">
                          <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest group-hover/perm:text-primary transition-colors">{t("permissions.call")}</span>
                          <Switch 
                            checked={m.can_call !== false}
                            onCheckedChange={(val) => handleTogglePermission(m.user.id, 'can_call', val)}
                            className="data-[state=checked]:bg-blue-500 scale-100 shadow-sm"
                          />
                        </label>
                        {((isOwner) || (isAdmin && m.role === 'member')) && (
                          <>
                            <div className="w-px h-8 bg-border/50" />
                            <label className="flex flex-col items-center gap-2 cursor-pointer group/perm">
                              <span className="text-[9px] font-black text-destructive/60 uppercase tracking-widest group-hover/perm:text-destructive transition-colors">{t("permissions.kick")}</span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-10 w-10 text-destructive hover:bg-destructive/10 rounded-full transition-all"
                                onClick={() => handleKickMember(m.user.id)}
                              >
                                <UserMinus className="h-5 w-5" />
                              </Button>
                            </label>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9 text-muted-foreground hover:text-primary">
            <Users className="h-5 w-5" />
          </Button>
        </DrawerTrigger>
        <DrawerContent className="px-0 pb-6 border-none rounded-t-[32px]">
          <DrawerHeader className="hidden">
            <DrawerTitle>{t("permissions.title")}</DrawerTitle>
          </DrawerHeader>
          {Content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9 text-muted-foreground hover:text-primary">
          <Users className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0 rounded-[40px] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.2)] dark:shadow-[0_30px_60px_rgba(0,0,0,0.5)] border-none bg-background/95 backdrop-blur-xl" align="end" sideOffset={12}>
        {Content}
      </PopoverContent>
    </Popover>
  );
}

function sameDay(a: string, b: string) {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}
function sameMinute(a: string, b: string) {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) < 2 * 60 * 1000;
}
function formatDate(iso: string, t: (k: any) => string, lang: string) {
  const d = new Date(iso);
  if (isToday(d)) return t("chat.today");
  if (isYesterday(d)) return t("chat.yesterday");
  return format(d, lang === "vi" ? "dd/MM/yyyy" : "MMM d, yyyy");
}
