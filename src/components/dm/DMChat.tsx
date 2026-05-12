import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send, Loader2, Phone, Video, Paperclip, Smile, MoreHorizontal, Trash2, Reply, X, Menu } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useDM, getOrCreateConversation, DirectMessage } from "@/hooks/use-dm";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { uploadFile, isImageFile, isVideoFile } from "@/lib/file-upload";
import { EmojiPickerComponent } from "@/components/ui/emoji-picker";
import { useTheme } from "@/hooks/use-theme";
import { toast } from "sonner";
import { CallInterface } from "@/components/chat/CallInterface";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { generateRoomId } from "@/lib/zego";
import { useI18n } from "@/lib/i18n";
import { useSidebar } from "@/hooks/use-sidebar";

interface OtherUserProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
}

const QUICK_EMOJIS = ["😀","😂","🥰","😎","😭","😡","🤔","👍","👏","🙌","🔥","✨","🎉","💯","❤️","💖","🌹","☕","🍕","🚀"];

export function DMChat() {
  const { userId } = useParams({ from: "/app/dm/$userId" });
  const { user, profile } = useAuth();
  const { theme } = useTheme();
  const { t } = useI18n();
  const { toggle } = useSidebar();
  const navigate = useNavigate();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<OtherUserProfile | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [callConfig, setCallConfig] = useState<{ isVideo: boolean, messageId?: string } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<DirectMessage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isFirstLoad = useRef(true);

  const qc = useQueryClient();
  const { 
    messages, 
    reactions,
    isLoading, 
    hasNextPage, 
    isFetchingNextPage, 
    fetchNextPage, 
    sendMessage, 
    deleteMessage, 
    updateMessage,
    toggleReaction
  } = useDM(conversationId);
  
  const messagesById = useMemo(() => Object.fromEntries(messages.map((m) => [m.id, m])), [messages]);

  const reactionsByMsg = useMemo(() => {
    const map: Record<string, { emoji: string; count: number; mine: boolean }[]> = {};
    for (const r of (reactions as any[])) {
      const arr = (map[r.message_id] ??= []);
      const found = arr.find((x) => x.emoji === r.emoji);
      if (found) {
        found.count++;
        if (r.user_id === user?.id) found.mine = true;
      } else {
        arr.push({ emoji: r.emoji, count: 1, mine: r.user_id === user?.id });
      }
    }
    return map;
  }, [reactions, user]);

  // Load other user profile & conversation
  useEffect(() => {
    if (!user || !userId) return;

    (async () => {
      try {
        const [profileRes, convId] = await Promise.all([
          supabase.from("profiles").select("id, display_name, avatar_url, bio").eq("id", userId).single(),
          getOrCreateConversation(user.id, userId),
        ]);

        if (profileRes.data) setOtherUser(profileRes.data);
        setConversationId(convId);
      } catch (err: any) {
        toast.error(err.message);
      }
    })();
  }, [userId, user]);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    if (!scrollRef.current) return;
    if (isFirstLoad.current && messages.length > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      isFirstLoad.current = false;
    } else if (!isFetchingNextPage) {
      const el = scrollRef.current;
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 400;
      if (nearBottom) {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      }
    }
  }, [messages, isFetchingNextPage]);

  const handleSend = async () => {
    if (!message.trim() || sendMessage.isPending || sending) return;
    const content = message.trim();
    const reply_to = replyTo?.id;
    setMessage("");
    setReplyTo(null);
    await sendMessage.mutateAsync({ content, reply_to });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !conversationId) return;

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

    const isImage = isImageFile(result.mimeType);
    const isVideo = isVideoFile(result.mimeType);
    const type = isImage ? "image" : isVideo ? "video" : "file";

    try {
      const msg = await sendMessage.mutateAsync({
        content: (isImage || isVideo) ? null : result.filename,
        type,
        reply_to: replyTo?.id
      });
      setReplyTo(null);

      if (msg) {
        await supabase.from("direct_attachments").insert({
          message_id: msg.id,
          url: result.publicUrl,
          file_name: result.filename,
          mime_type: result.mimeType,
          size_bytes: result.sizeBytes,
        });
      }
      toast.success(t("common.success"));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    const msg = messagesById[msgId];
    if (!msg || !user) return;

    if (msg.sender_id === user.id) {
      // Tin nhắn của mình -> Xóa thật (Everyone)
      await deleteMessage.mutateAsync(msgId);
    } else {
      // Tin nhắn người khác -> Chỉ xóa ở phía mình (For Me)
      const { error } = await (supabase
        .from("dm_message_deletions" as any))
        .upsert({ user_id: user.id, dm_message_id: msgId });
      
      if (error) {
        toast.error(error.message);
      } else {
        // Cập nhật UI ngay lập tức
        qc.setQueryData(["dm-messages", conversationId], (old: any) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page: any) => page.filter((m: any) => m.id !== msgId)),
          };
        });
        toast.success(t("chat.deleteSuccess"));
      }
    }
  };

  const handleReply = (msg: DirectMessage) => {
    setReplyTo(msg);
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b bg-card/50 backdrop-blur-md px-4 py-3 sticky top-0 z-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 md:hidden"
          onClick={toggle}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="hidden md:flex rounded-xl h-9 w-9" onClick={() => navigate({ to: "/app" })}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        {otherUser ? (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="h-10 w-10 ring-2 ring-primary/10">
              <AvatarImage src={otherUser.avatar_url ?? undefined} />
              <AvatarFallback className="bg-gradient-primary text-white font-bold">
                {otherUser.display_name[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate text-base">{otherUser.display_name}</p>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Online</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-1">
            <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-3 w-16 bg-muted animate-pulse rounded" />
            </div>
          </div>
        )}
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl h-9 w-9 text-muted-foreground hover:text-primary"
            title={t("call.voice")}
            disabled={!conversationId}
            onClick={async () => {
              const msg = await sendMessage.mutateAsync({ content: "CALL_INVITE:voice", type: "system" });
              if (msg) setCallConfig({ isVideo: false, messageId: msg.id, isGroup: false });
            }}
          >
            {conversationId ? <Phone className="h-5 w-5" /> : <Loader2 className="h-4 w-4 animate-spin opacity-50" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl h-9 w-9 text-muted-foreground hover:text-primary"
            title={t("call.video")}
            disabled={!conversationId}
            onClick={async () => {
              const msg = await sendMessage.mutateAsync({ content: "CALL_INVITE:video", type: "system" });
              if (msg) setCallConfig({ isVideo: true, messageId: msg.id, isGroup: false });
            }}
          >
            {conversationId ? <Video className="h-5 w-5" /> : <Loader2 className="h-4 w-4 animate-spin opacity-50" />}
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 py-6">
        {isLoading ? (
          <div className="grid h-full place-items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6">
            {hasNextPage && (
              <div className="flex justify-center pb-4">
                <Button variant="ghost" size="sm" className="text-xs rounded-full" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                  {isFetchingNextPage ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
                  {t("chat.loadMore")}
                </Button>
              </div>
            )}

            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center mb-4">
                  <Smile className="h-10 w-10 text-primary/30" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">{t("chat.empty.title")}<br />{t("chat.empty.desc")}</p>
              </div>
            )}

            {messages.map((msg, idx) => {
              const isOwn = msg.sender_id === user?.id;
              const prevMsg = messages[idx - 1];
              const isSameSender = prevMsg?.sender_id === msg.sender_id;

              return (
                <div key={msg.id} className={cn("group flex flex-col", isOwn ? "items-end" : "items-start", isSameSender ? "mt-1" : "mt-4")}>
                  <div className={cn("flex items-end gap-2 max-w-[85%]", isOwn && "flex-row-reverse")}>
                    {!isOwn && !isSameSender && (
                      <Avatar className="h-8 w-8 shrink-0 mb-1">
                        <AvatarImage src={msg.sender.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-gradient-primary text-white text-xs">
                          {msg.sender.display_name[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    {!isOwn && isSameSender && <div className="w-8 shrink-0" />}

                    <div className="flex flex-col">
                      <div className={cn("flex items-center gap-1", isOwn ? "flex-row-reverse" : "flex-row")}>
                        <div
                          className={cn(
                            "relative rounded-2xl px-4 py-2.5 text-sm shadow-sm transition-all hover:shadow-md",
                            isOwn
                              ? "bg-gradient-primary text-white rounded-tr-sm"
                              : "bg-card border border-border/50 text-card-foreground rounded-tl-sm"
                          )}
                        >
                          {msg.reply_to && messagesById[msg.reply_to] && (
                            <div className={cn(
                              "mb-2 rounded-lg border-l-2 px-2 py-1 text-xs",
                              isOwn ? "border-white/60 bg-white/10" : "border-primary bg-muted/60"
                            )}>
                              <div className="font-bold opacity-80">
                                {messagesById[msg.reply_to].type === "image" ? t("chat.image") : 
                                 messagesById[msg.reply_to].type === "video" ? t("chat.video") : 
                                 messagesById[msg.reply_to].type === "file" ? t("chat.file") : 
                                 messagesById[msg.reply_to].sender.display_name}
                              </div>
                              <div className="truncate opacity-70 italic text-[11px]">
                                {messagesById[msg.reply_to].type === "text" ? messagesById[msg.reply_to].content : ""}
                              </div>
                            </div>
                          )}
                          <MessageContent
                            message={msg}
                            isOwn={isOwn}
                            onJoinCall={(isVideo) => {
                              setCallConfig({ isVideo, messageId: msg.id, isGroup: false });
                            }}
                          />
                        </div>

                        <div className={cn(
                          "flex items-center gap-0.5 rounded-full border bg-card p-0.5 shadow-sm transition-opacity duration-200",
                          openMenuId === msg.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-full text-muted-foreground hover:text-primary"
                              >
                                <Smile className="h-3.5 w-3.5" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent side="top" align="center" className="w-fit p-2 rounded-2xl shadow-xl border-primary/10">
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {QUICK_EMOJIS.map((emoji) => (
                                  <button
                                    key={emoji}
                                    className="hover:scale-125 transition-transform p-1 text-lg"
                                    onClick={() => toggleReaction.mutate({ messageId: msg.id, emoji })}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full text-muted-foreground hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReply(msg);
                            }}
                          >
                            <Reply className="h-3.5 w-3.5" />
                          </Button>
                          <DropdownMenu onOpenChange={(open) => setOpenMenuId(open ? msg.id : null)}>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-full text-muted-foreground hover:text-primary"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={isOwn ? "end" : "start"} className="z-[100]">
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteMessage(msg.id);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t("chat.delete")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Reactions display */}
                      {reactionsByMsg[msg.id] && (
                        <div className={cn("flex flex-wrap gap-1 mt-1", isOwn ? "justify-end" : "justify-start")}>
                          {reactionsByMsg[msg.id].map((r) => (
                            <button
                              key={r.emoji}
                              onClick={() => toggleReaction.mutate({ messageId: msg.id, emoji: r.emoji })}
                              className={cn(
                                "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-all",
                                r.mine 
                                  ? "bg-primary/20 text-primary border border-primary/20 ring-1 ring-primary/20" 
                                  : "bg-muted border border-border/50 text-muted-foreground hover:bg-muted/80"
                              )}
                            >
                              <span>{r.emoji}</span>
                              {r.count > 1 && <span>{r.count}</span>}
                            </button>
                          ))}
                        </div>
                      )}
                      {!isSameSender && (
                        <p className={cn("mt-1 text-[10px] font-medium opacity-50 px-1", isOwn ? "text-right" : "text-left")}>
                          {new Date(msg.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reply Banner */}
      {replyTo && (
        <div className="px-4 py-2 border-t bg-muted/30 flex items-center justify-between animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-1 h-8 bg-primary rounded-full shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-primary">{t("chat.replyingTo")} {replyTo.sender.display_name}</span>
              <span className="text-xs text-muted-foreground truncate italic">
                {replyTo.type === "image" ? `[${t("chat.image")}]` : 
                 replyTo.type === "video" ? `[${t("chat.video")}]` : 
                 replyTo.type === "file" ? `[${t("chat.file")}]` : 
                 replyTo.content}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setReplyTo(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t bg-card/30 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl flex gap-2 items-end">
          <input ref={fileInputRef} type="file" hidden onChange={handleFile} />

          <Button
            size="icon"
            variant="ghost"
            className="rounded-xl h-10 w-10 text-muted-foreground shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
          >
            <Paperclip className="h-5 w-5" />
          </Button>

          <EmojiPickerComponent
            onEmojiClick={(emoji) => setMessage((p) => p + emoji)}
            theme={theme === "dark" ? "dark" : "light"}
          />

          <Textarea
            className="min-h-[42px] max-h-32 flex-1 resize-none rounded-2xl text-sm border-none bg-muted/50 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
            placeholder={`${t("dm.start")} ${otherUser?.display_name ?? ""}...`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={sending}
          />

          <Button
            size="icon"
            className="rounded-full h-10 w-10 bg-gradient-primary shrink-0 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
            onClick={handleSend}
            disabled={(!message.trim() && !sending) || sendMessage.isPending || sending}
          >
            {sendMessage.isPending || sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {callConfig && user && conversationId && (
        <CallInterface
          roomId={generateRoomId(conversationId!)}
          userId={user.id}
          userName={profile?.display_name || "User"}
          isVideo={callConfig.isVideo}
          messageId={callConfig.messageId}
          isGroup={callConfig.isGroup ?? false}
          onClose={() => setCallConfig(null)}
        />
      )}
    </div>
  );
}

function MessageContent({ message, isOwn, onJoinCall }: { message: any, isOwn: boolean, onJoinCall?: (isVideo: boolean) => void }) {
  const [attachment, setAttachment] = useState<any>(null);
  const { t } = useI18n();

  useEffect(() => {
    if (message.type !== "text") {
      supabase.from("direct_attachments").select("*").eq("message_id", message.id).maybeSingle().then(({ data }) => {
        if (data) setAttachment(data);
      });
    }
  }, [message.id, message.type]);

  if (message.type === "system" && message.content?.startsWith("CALL_ENDED:")) {
    const isVideo = message.content.includes("video");
    return (
      <div className="flex flex-col gap-3 p-1 min-w-[200px] opacity-70">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-background/30 flex items-center justify-center shrink-0 shadow-sm text-foreground">
            {isVideo ? <Video className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
          </div>
          <div className="flex-1 text-foreground">
            <div className="text-sm font-bold leading-tight">
              {message.sender?.display_name || "System"}
            </div>
            <div className="text-xs font-medium mt-0.5">
              {t("call.ended")}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (message.type === "system" && message.content?.startsWith("CALL_INVITE:")) {
    const isVideo = message.content.includes("video");
    return (
      <div className="flex flex-col gap-3 p-1 min-w-[200px]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-background/30 flex items-center justify-center shrink-0 shadow-sm text-foreground">
            {isVideo ? <Video className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
          </div>
          <div className="flex-1 text-foreground">
            <div className="text-sm font-bold leading-tight">
              {message.sender?.display_name || "System"}
            </div>
            <div className="text-xs opacity-90 font-medium mt-0.5">
              {t("call.calling")} {isVideo ? t("call.video_call") : t("call.voice_call")}...
            </div>
          </div>
        </div>
        {!isOwn && onJoinCall && (
          <Button
            size="sm"
            className="w-full h-8 text-xs bg-white text-black hover:bg-white/90 font-bold shadow-md hover:scale-[1.02] transition-transform"
            onClick={() => onJoinCall(isVideo)}
          >
            {t("call.join")}
          </Button>
        )}
      </div>
    );
  }

  if (message.type === "image" && attachment) {
    return (
      <a href={attachment.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg">
        <img src={attachment.url} alt={attachment.file_name} className="max-h-64 w-full object-contain hover:scale-[1.02] transition-transform" />
      </a>
    );
  }

  if (message.type === "video" && attachment) {
    return (
      <div className="overflow-hidden rounded-lg bg-black/10">
        <video src={attachment.url} controls className="max-h-80 w-full" poster={attachment.url + "#t=0.1"}>
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }

  if (message.type === "file" && attachment) {
    return (
      <a href={attachment.url} target="_blank" rel="noreferrer" className={cn("flex items-center gap-2 p-1 font-medium underline underline-offset-4 decoration-2", isOwn ? "text-white decoration-white/30" : "text-primary decoration-primary/30")}>
        <Paperclip className="h-4 w-4" />
        <span className="truncate max-w-[200px]">{attachment.file_name}</span>
      </a>
    );
  }

  return <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>;
}
