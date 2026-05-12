import { useState } from "react";
import { Search, UserPlus, Check, Clock, UserCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFriends, useSearchUsers, type FriendProfile } from "@/hooks/use-friends";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";

interface SearchUsersProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function SearchUsersDialog({ open, onOpenChange }: SearchUsersProps) {
  const [query, setQuery] = useState("");
  const { user } = useAuth();
  const { t } = useI18n();
  const { data: results = [], isLoading } = useSearchUsers(query);
  const { sendRequest, getFriendshipStatus, friends, pendingRequests, acceptRequest } = useFriends();
  const acceptFriend = (id: string) => acceptRequest.mutate(id);

  const getStatus = (targetId: string) => {
    const f = getFriendshipStatus(targetId);
    if (!f) return "none";
    if (f.status === "accepted") return "friends";
    if (f.status === "pending" && f.requester_id === user?.id) return "sent";
    if (f.status === "pending" && f.addressee_id === user?.id) return "received";
    return "none";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{t("sidebar.findFriends")} 🔍</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Tìm theo tên hoặc mã ID số..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className="mt-2 space-y-2 max-h-80 overflow-y-auto">
          {isLoading && (
            <p className="text-center text-sm text-muted-foreground py-4">{t("common.loading")}</p>
          )}
          {!isLoading && query.length >= 2 && results.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">{t("chat.empty.desc")} 😔</p>
          )}
          {results.map((profile) => {
            const status = getStatus(profile.id);
            return (
              <div key={profile.id} className="flex items-center gap-3 rounded-2xl p-3 hover:bg-muted/50 transition-colors">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={profile.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-gradient-primary text-white font-bold">
                    {profile.display_name[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{profile.display_name}</p>
                  <p className="text-[10px] text-primary font-mono font-bold">UID: {profile.uid}</p>
                  {profile.bio && (
                    <p className="text-xs text-muted-foreground truncate">{profile.bio}</p>
                  )}
                </div>
                {status === "none" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full shrink-0"
                    onClick={() => sendRequest.mutate(profile.id)}
                    disabled={sendRequest.isPending}
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-1" />
                    {t("friends.add")}
                  </Button>
                )}
                {status === "sent" && (
                  <Button size="sm" variant="ghost" disabled className="rounded-full shrink-0 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 mr-1" />
                    {t("friends.sent")}
                  </Button>
                )}
                {status === "received" && (
                  <Button
                    size="sm"
                    className="rounded-full shrink-0 bg-green-500 hover:bg-green-600 text-white"
                    onClick={() => {
                      const f = getFriendshipStatus(profile.id);
                      if (f) acceptFriend(f.id);
                    }}
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    {t("friends.accept")}
                  </Button>
                )}
                {status === "friends" && (
                  <Button size="sm" variant="ghost" disabled className="rounded-full shrink-0 text-green-500">
                    <UserCheck className="h-3.5 w-3.5 mr-1" />
                    {t("sidebar.friends")}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
