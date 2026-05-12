import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Check, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { useFriends } from "@/hooks/use-friends";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const schema = z.object({
  name: z.string().trim().min(2, "Tên ít nhất 2 ký tự").max(80),
  description: z.string().trim().max(300).optional(),
});

export function CreateGroupDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const { friends, loadingFriends } = useFriends();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

  const toggleFriend = (id: string) => {
    setSelectedFriends((prev) => 
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      name: fd.get("name"),
      description: fd.get("description") || undefined,
    });
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    
    setSubmitting(true);
    try {
      // 1. Tạo nhóm
      const { data: group, error: groupErr } = await supabase
        .from("groups")
        .insert({ 
          name: parsed.data.name, 
          description: parsed.data.description ?? null, 
          owner_id: user.id 
        })
        .select()
        .single();
      
      if (groupErr) throw groupErr;

      // 2. Thêm bạn bè vào nhóm (nếu có)
      if (selectedFriends.length > 0) {
        const membersToInsert = selectedFriends.map(friendId => ({
          group_id: group.id,
          user_id: friendId,
          role: 'member' as const
        }));

        const { error: memberErr } = await supabase
          .from("group_members")
          .insert(membersToInsert);
        
        if (memberErr) {
          console.error("Lỗi khi thêm thành viên:", memberErr);
          toast.error("Không thể thêm một số bạn bè vào nhóm");
        }
      }

      toast.success("Đã tạo nhóm 🎉");
      qc.invalidateQueries({ queryKey: ["groups", user.id] });
      onOpenChange(false);
      setSelectedFriends([]);
      navigate({ to: "/app/$groupId", params: { groupId: group.id } });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{t("group.create")} ✨</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="g-name" className="text-sm font-semibold">{t("group.name")}</Label>
              <Input id="g-name" name="name" required maxLength={80} placeholder="VD: Nhóm bạn thân 💖" className="rounded-xl border-border/50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="g-desc" className="text-sm font-semibold">{t("group.description")}</Label>
              <Textarea id="g-desc" name="description" maxLength={300} rows={2} placeholder="Vài lời giới thiệu..." className="rounded-xl border-border/50 resize-none" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Thêm bạn bè ({selectedFriends.length})</Label>
              {selectedFriends.length > 0 && (
                <button 
                  type="button" 
                  onClick={() => setSelectedFriends([])}
                  className="text-[10px] uppercase tracking-wider font-bold text-primary hover:underline"
                >
                  Bỏ chọn tất cả
                </button>
              )}
            </div>
            
            <ScrollArea className="h-48 rounded-2xl border border-border/50 bg-muted/30 p-2">
              {loadingFriends ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary opacity-50" />
                </div>
              ) : friends.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4 opacity-50">
                  <Users className="h-8 w-8 mb-2" />
                  <p className="text-xs">Bạn chưa có bạn bè nào để thêm.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {friends.map((f) => (
                    <button
                      key={f.friend.id}
                      type="button"
                      onClick={() => toggleFriend(f.friend.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl p-2 transition-all hover:bg-background",
                        selectedFriends.includes(f.friend.id) && "bg-background ring-1 ring-primary/20 shadow-sm"
                      )}
                    >
                      <div className="relative">
                        <Avatar className="h-9 w-9 ring-1 ring-border/50">
                          <AvatarImage src={f.friend.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-gradient-mint text-xs">
                            {f.friend.display_name[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {selectedFriends.includes(f.friend.id) && (
                          <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] text-white shadow-sm">
                            <Check className="h-2.5 w-2.5" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-semibold truncate">{f.friend.display_name}</p>
                        {f.friend.bio && <p className="text-[10px] text-muted-foreground truncate">{f.friend.bio}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full">{t("common.cancel")}</Button>
            <Button type="submit" disabled={submitting} className="rounded-full bg-gradient-primary text-primary-foreground shadow-soft px-8">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("group.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
