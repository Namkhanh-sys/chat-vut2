import { useState } from "react";
import { Check, X, MessageCircle, UserMinus, Bell } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useFriends } from "@/hooks/use-friends";
import { useNavigate } from "@tanstack/react-router";
import { getOrCreateConversation } from "@/hooks/use-dm";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";

export function FriendPanel() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { friends, pendingRequests, acceptRequest, removeFriend, loadingFriends } = useFriends();
  const navigate = useNavigate();

  const openDM = async (friendId: string) => {
    if (!user) return;
    try {
      const convId = await getOrCreateConversation(user.id, friendId);
      navigate({ to: "/app/dm/$userId", params: { userId: friendId } });
    } catch (e) {
      console.error(e);
    }
  };

  const incomingRequests = pendingRequests.filter(req => req.addressee_id === user?.id);

  return (
    <div className="flex flex-col h-full">
      <Tabs defaultValue="friends" className="flex-1 flex flex-col">
        <TabsList className="mx-3 mt-2 rounded-2xl">
          <TabsTrigger value="friends" className="flex-1 rounded-xl text-xs">
            {t("sidebar.friends")} ({friends.length})
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex-1 rounded-xl text-xs relative">
            {t("friends.pending")}
            {incomingRequests.length > 0 && (
              <Badge className="ml-1 h-4 min-w-4 px-1 text-[10px] bg-red-500 text-white">
                {incomingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Danh sách bạn bè */}
        <TabsContent value="friends" className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {loadingFriends && (
            <p className="text-center text-xs text-muted-foreground py-8">{t("common.loading")}</p>
          )}
          {!loadingFriends && friends.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <div className="text-4xl mb-2">👋</div>
              <p className="text-sm">{t("friends.empty")}</p>
              <p className="text-xs mt-1">{t("sidebar.search")}</p>
            </div>
          )}
          {friends.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 rounded-2xl p-2.5 hover:bg-muted/50 transition-colors group cursor-pointer"
              onClick={() => openDM(f.friend.id)}
            >
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={f.friend.avatar_url ?? undefined} />
                <AvatarFallback className="bg-gradient-primary text-white text-xs font-bold">
                  {f.friend.display_name[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{f.friend.display_name}</p>
                {f.friend.bio && (
                  <p className="text-xs text-muted-foreground truncate">{f.friend.bio}</p>
                )}
              </div>
              <div className="hidden group-hover:flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 rounded-xl"
                  onClick={(e) => { e.stopPropagation(); openDM(f.friend.id); }}
                  title={t("dm.start")}
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 rounded-xl text-destructive hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); removeFriend.mutate(f.id); }}
                  title={t("chat.delete")}
                >
                  <UserMinus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </TabsContent>

        {/* Yêu cầu kết bạn */}
        <TabsContent value="requests" className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
          {incomingRequests.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">{t("chat.empty.title")}</p>
            </div>
          )}
          {incomingRequests.map((req) => (
            <div key={req.id} className="flex items-center gap-3 rounded-2xl p-2.5 bg-muted/30">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={req.friend.avatar_url ?? undefined} />
                <AvatarFallback className="bg-gradient-primary text-white text-xs font-bold">
                  {req.friend.display_name[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{req.friend.display_name}</p>
                <p className="text-xs text-muted-foreground">Muốn kết bạn với bạn</p>
              </div>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  className="h-7 w-7 rounded-xl bg-green-500 hover:bg-green-600 text-white"
                  onClick={() => acceptRequest.mutate(req.id)}
                  title={t("friends.accept")}
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-7 w-7 rounded-xl"
                  onClick={() => removeFriend.mutate(req.id)}
                  title={t("friends.decline")}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
