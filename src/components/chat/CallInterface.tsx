import { useEffect, useRef, useState } from "react";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
import { ZEGO_APP_ID, ZEGO_SERVER_SECRET } from "@/lib/zego";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface CallInterfaceProps {
  roomId: string;
  userId: string;
  userName: string;
  isVideo: boolean;
  onClose: () => void;
  messageId?: string;
  isGroup?: boolean;
}

export function CallInterface({ roomId, userId, userName, isVideo, onClose, messageId, isGroup }: CallInterfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  const strictModeRef = useRef<{ timeout: NodeJS.Timeout | null }>({ timeout: null });
  const participantCountRef = useRef(0);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (strictModeRef.current.timeout) {
      clearTimeout(strictModeRef.current.timeout);
      strictModeRef.current.timeout = null;
    }

    const topic = `presence:call_${roomId}`;
    
    // Clean up any existing channel with the same topic to avoid React Strict Mode errors
    const existingChannel = supabase.getChannels().find(c => c.topic === topic);
    if (existingChannel) {
      supabase.removeChannel(existingChannel);
    }

    const channel = supabase.channel(topic, {
      config: { presence: { key: userId } }
    });

    let currentCount = 0;

    try {
      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        participantCountRef.current = Object.keys(state).length;
      });
      channelRef.current = channel;
    } catch (err) {
      // Ignore React Strict Mode double-subscribe errors
      console.warn("Supabase channel .on() warning:", err);
    }

    try {
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });
    } catch (err) {
      console.warn("Supabase channel .subscribe() warning:", err);
    }

    return () => {
      // Use a timeout to survive React Strict Mode's unmount/remount cycle
      strictModeRef.current.timeout = setTimeout(() => {
        // We no longer delete messages here to preserve call history
      }, 1000);
      
      channel.untrack().catch(() => {}).finally(() => supabase.removeChannel(channel));
    };
  }, [roomId, userId, messageId, isGroup, isVideo]);

  useEffect(() => {
    let zp: any = null;

    const initCall = async () => {
      if (!containerRef.current) return;

      // Sanitize userId (ZegoCloud only accepts alphanumeric and '_')
      const safeUserId = userId.replace(/[^a-zA-Z0-9_]/g, '_');

      // Generate kit token
      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
        ZEGO_APP_ID,
        ZEGO_SERVER_SECRET,
        roomId,
        safeUserId,
        userName
      );

      // Create instance
      zp = ZegoUIKitPrebuilt.create(kitToken);

      // Start call
      zp.joinRoom({
        container: containerRef.current,
        scenario: {
          mode: isGroup ? ZegoUIKitPrebuilt.GroupCall : ZegoUIKitPrebuilt.OneONoneCall,
        },
        showScreenSharingButton: true,
        showPreJoinView: true, // Hiện màn hình kiểm tra Mic/Camera trước khi vào
        turnOnCameraWhenJoining: isVideo,
        turnOnMicrophoneWhenJoining: true,
        showMyCameraToggleButton: isVideo, // Chỉ hiện nút Camera nếu là cuộc gọi Video
        showMyMicrophoneToggleButton: true,
        showAudioVideoSettingsButton: true,
        useFrontFacingCamera: true, // Ưu tiên camera trước (nếu là mobile/laptop)
        onJoinRoom: () => {
          setIsLoading(false); // Ẩn loading ngay khi vừa kết nối thành công
        },
        onLeaveRoom: async () => {
          if (messageId) {
            const isLastPerson = participantCountRef.current <= 1;
            
            // Chỉ cập nhật "Đã kết thúc" nếu bạn là người cuối cùng rời khỏi phòng
            if (isLastPerson) {
              const table = isGroup ? "messages" : "direct_messages";
              await supabase
                .from(table as any)
                .update({ content: `CALL_ENDED:${isVideo ? "video" : "voice"}` } as any)
                .eq("id", messageId);
            }
          }
          onClose();
        },
      });

      // Zego UIKit renders synchronously but might take a moment to load network assets.
      // We hide loading overlay in onJoinRoom OR after a 5s timeout as a fallback.
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
    }, 5000);

    initCall();

    return () => {
      clearTimeout(timeoutId);
      if (zp) {
        zp.destroy();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, userId, userName, isVideo]);

  return (
    <div className="fixed inset-0 z-[100] bg-black">
      {/* Nút thoát nổi ở góc */}
      <div className="absolute top-4 right-4 z-[110]">
        <Button 
          variant="secondary" 
          size="icon" 
          onClick={onClose} 
          className="rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-md border-none"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="h-full w-full relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/90 text-white backdrop-blur-sm">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="font-medium animate-pulse">Đang thiết lập kết nối an toàn...</p>
          </div>
        )}
        <div className="h-full w-full" ref={containerRef} />
      </div>
    </div>
  );
}
