import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

interface TypingUser {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

export function useTypingIndicators(groupId: string) {
  const { user, profile } = useAuth();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);

  // Initialize Presence Channel
  useEffect(() => {
    if (!user || !groupId) return;

    const channelId = `presence:${groupId}-${Math.random().toString(36).slice(2, 9)}`;
    const channel = supabase.channel(channelId, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const typingList: TypingUser[] = [];
        
        Object.keys(state).forEach((key) => {
          if (key === user.id) return;
          const presences = state[key] as any[];
          const latest = presences[presences.length - 1];
          if (latest?.isTyping) {
            typingList.push({
              id: key,
              display_name: latest.display_name || "Unknown",
              avatar_url: latest.avatar_url || null,
            });
          }
        });
        
        setTypingUsers(typingList);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            isTyping: false,
            display_name: profile?.display_name,
            avatar_url: profile?.avatar_url,
          });
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [groupId, user, profile]);

  // Mark user as typing
  const markAsTyping = useCallback(async () => {
    if (!user || !groupId || !channelRef.current || isTyping) return;

    try {
      await channelRef.current.track({
        isTyping: true,
        display_name: profile?.display_name,
        avatar_url: profile?.avatar_url,
      });
      setIsTyping(true);

      // Auto-clear typing status after 3 seconds
      if (typingTimeout) clearTimeout(typingTimeout);
      const timeout = setTimeout(() => {
        clearTyping();
      }, 3000);
      setTypingTimeout(timeout);
    } catch (error) {
      console.error("Error marking as typing:", error);
    }
  }, [user, profile, groupId, isTyping, typingTimeout]);

  // Clear typing status
  const clearTyping = useCallback(async () => {
    if (!user || !groupId || !channelRef.current) return;

    try {
      await channelRef.current.track({
        isTyping: false,
        display_name: profile?.display_name,
        avatar_url: profile?.avatar_url,
      });
      setIsTyping(false);

      if (typingTimeout) clearTimeout(typingTimeout);
      setTypingTimeout(null);
    } catch (error) {
      console.error("Error clearing typing:", error);
    }
  }, [user, profile, groupId, typingTimeout]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeout) clearTimeout(typingTimeout);
    };
  }, [typingTimeout]);

  return {
    typingUsers,
    markAsTyping,
    clearTyping,
    isTyping,
  };
}
