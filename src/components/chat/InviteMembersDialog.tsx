import { useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Check, Users, UserPlus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { useFriends } from "@/hooks/use-friends";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function InviteMembersDialog({ groupId, existingMemberIds }: { groupId: string; existingMemberIds: string[] }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const { friends, loadingFriends } = useFriends();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const toggleFriend = (id: string) => {
    setSelectedFriends((prev) => 
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Lọc bạn bè chưa tham gia nhóm và khớp với tìm kiếm
  const inviteableFriends = friends.filter(f => 
    !existingMemberIds.includes(f.friend.id) &&
    (f.friend.display_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleInvite = async () => {
    if (!user || selectedFriends.length === 0) return;
    
    setSubmitting(true);
    try {
      const membersToInsert = selectedFriends.map(friendId => ({
        group_id: groupId,
        user_id: friendId,
        role: 'member' as const
      }));

      const { error } = await supabase
        .from("group_members")
        .insert(membersToInsert);
      
      if (error) throw error;

      toast.success(t("common.success"));
      qc.invalidateQueries({ queryKey: ["group-members", groupId] });
      setOpen(false);
      setSelectedFriends([]);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-xl h-9 w-9 text-muted-foreground hover:text-primary transition-all"
          title={t("permissions.invite")}
        >
          <UserPlus className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-[32px] sm:max-w-md border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            {t("permissions.invite")}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder={t("friends.search")} 
              className="pl-10 rounded-2xl bg-muted/50 border-none h-11 focus-visible:ring-1 focus-visible:ring-primary/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {t("sidebar.friends")} ({inviteableFriends.length})
              </span>
              {selectedFriends.length > 0 && (
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                  {selectedFriends.length} Đã chọn
                </span>
              )}
            </div>
            
            <ScrollArea className="h-64 rounded-[24px] bg-muted/30 p-2">
              {loadingFriends ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary opacity-50" />
                </div>
              ) : inviteableFriends.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4 opacity-50">
                  <Users className="h-8 w-8 mb-2" />
                  <p className="text-xs">{searchTerm ? "Không tìm thấy ai phù hợp." : "Tất cả bạn bè đã ở trong nhóm."}</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {inviteableFriends.map((f) => (
                    <button
                      key={f.friend.id}
                      type="button"
                      onClick={() => toggleFriend(f.friend.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-2xl p-2 transition-all hover:bg-background",
                        selectedFriends.includes(f.friend.id) && "bg-background ring-1 ring-primary/20 shadow-sm"
                      )}
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10 ring-1 ring-border/50">
                          <AvatarImage src={f.friend.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-gradient-mint text-xs">
                            {f.friend.display_name[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {selectedFriends.includes(f.friend.id) && (
                          <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] text-white shadow-sm border-2 border-background">
                            <Check className="h-2.5 w-2.5" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-bold truncate">{f.friend.display_name}</p>
                        {f.friend.bio && <p className="text-[10px] text-muted-foreground truncate opacity-70">{f.friend.bio}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button 
            onClick={handleInvite} 
            disabled={submitting || selectedFriends.length === 0} 
            className="w-full rounded-2xl bg-gradient-primary text-primary-foreground shadow-lg shadow-primary/20 h-11 font-bold transition-all hover:scale-[1.02] active:scale-95"
          >
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t("group.invite")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
