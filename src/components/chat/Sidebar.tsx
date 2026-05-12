import { useEffect, useState, useRef } from "react";
import { Link, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Settings, LogOut, MessageCircleHeart, Languages, Sun, Moon, Users, UserSearch, UserRound, Bell, Camera, Loader2 } from "lucide-react";
import { uploadFile } from "@/lib/file-upload";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CreateGroupDialog } from "./CreateGroupDialog";
import { SearchUsersDialog } from "@/components/friends/SearchUsersDialog";
import { FriendPanel } from "@/components/friends/FriendPanel";
import { useFriends } from "@/hooks/use-friends";
import { useSidebar } from "@/hooks/use-sidebar";
import { toast } from "sonner";

interface GroupRow {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  is_pinned: boolean;
  member_count: number;
}

export function Sidebar() {
  const { user, profile, signOut } = useAuth();
  const { t, lang, setLang } = useI18n();
  const { theme, toggle } = useTheme();
  const { setIsOpen } = useSidebar();
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { groupId?: string };
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [openSearch, setOpenSearch] = useState(false);
  const { pendingRequests } = useFriends();
  const incomingRequests = pendingRequests.filter(req => req.addressee_id === user?.id);

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["groups", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<GroupRow[]> => {
      const { data, error } = await supabase
        .from("group_members")
        .select("is_pinned, group:groups(id, name, description, avatar_url)")
        .eq("user_id", user!.id);
      if (error) throw error;
      const rows = (data ?? []).map((m: any) => ({
        id: m.group.id,
        name: m.group.name,
        description: m.group.description,
        avatar_url: m.group.avatar_url,
        is_pinned: m.is_pinned,
        member_count: 0,
      }));
      return rows.sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned) || a.name.localeCompare(b.name));
    },
  });

  useEffect(() => {
    if (!user) return;
    const channelId = `members-${user.id}-${Math.random().toString(36).slice(2, 9)}`;
    const ch = supabase
      .channel(channelId)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_members", filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["groups", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  const filtered = groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()));

  const [isUploading, setIsUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Tải trực tiếp lên bucket message-images
      const { error: uploadError } = await supabase.storage
        .from('message-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Lấy URL công khai
      const { data: { publicUrl } } = supabase.storage
        .from('message-images')
        .getPublicUrl(filePath);

      // Cập nhật Profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl } as any)
        .eq("id", user.id);

      if (updateError) throw updateError;
      
      toast.success("Đã cập nhật ảnh đại diện thành công!");
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      console.error("Avatar update error:", err);
      toast.error("Lỗi: " + (err.message || "Không thể tải ảnh lên"));
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast.success("Đã đăng xuất");
    navigate({ to: "/" });
  };

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:w-80">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-4">
        <Link to="/app" className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shadow-lg shadow-primary/20 bg-white">
            <img src="/logo.png" alt="Chat Vui Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="font-display text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Chat Vui</h1>
        </Link>
        <div className="flex items-center gap-1">
          {/* Find friends button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl relative"
            onClick={() => setOpenSearch(true)}
            title={t("sidebar.findFriends")}
          >
            <UserSearch className="h-4 w-4" />
          </Button>
          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full transition hover:opacity-80">
                <Avatar className="h-9 w-9 ring-2 ring-sidebar-primary/30">
                  <AvatarImage src={profile?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                    {profile?.display_name?.[0]?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5 text-sm">
                <p className="text-sm font-bold truncate leading-tight">{profile?.display_name || user?.email?.split('@')[0]}</p>
                <p className="text-[10px] text-primary font-mono font-bold">UID: {profile?.uid || '...'}</p>
                <div className="truncate text-xs text-muted-foreground">@{profile?.username}</div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLang(lang === "vi" ? "en" : "vi")}>
                <Languages className="mr-2 h-4 w-4" />
                {t("common.lang")}: {lang.toUpperCase()}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggle}>
                {theme === "light" ? <Moon className="mr-2 h-4 w-4" /> : <Sun className="mr-2 h-4 w-4" />}
                {theme === "light" ? t("common.theme.dark") : t("common.theme.light")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => avatarInputRef.current?.click()} disabled={isUploading}>
                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                {isUploading ? t("common.loading") : t("sidebar.changeAvatar")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                {t("sidebar.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Nút chọn file ẩn (đưa ra ngoài để không bị unmount) */}
          <input
            type="file"
            ref={avatarInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleAvatarChange}
          />
        </div>
      </div>

      {/* Tabs: Groups / Friends */}
      <Tabs defaultValue="groups" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mb-2 rounded-2xl">
          <TabsTrigger value="groups" className="flex-1 rounded-xl text-xs gap-1">
            <Users className="h-3.5 w-3.5" />
            {t("sidebar.groups")}
          </TabsTrigger>
          <TabsTrigger value="friends" className="flex-1 rounded-xl text-xs gap-1 relative">
            <UserRound className="h-3.5 w-3.5" />
            {t("sidebar.friends")}
            {incomingRequests.length > 0 && (
              <Badge className="ml-0.5 h-4 min-w-4 px-1 text-[10px] bg-red-500 text-white">
                {incomingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="flex-1 flex flex-col min-h-0 data-[state=active]:flex">
          {/* Search + create */}
          <div className="space-y-2 px-4 pb-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("sidebar.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-full bg-sidebar-accent pl-9"
              />
            </div>
            <Button onClick={() => setOpenCreate(true)} className="w-full rounded-full bg-gradient-primary text-primary-foreground shadow-soft hover:opacity-90">
              <Plus className="mr-2 h-4 w-4" />
              {t("sidebar.newGroup")}
            </Button>
          </div>

          {/* Group list */}
          <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-4">
            {isLoading ? (
              <div className="space-y-2 p-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-2xl bg-sidebar-accent" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                <Users className="mx-auto mb-2 h-8 w-8 opacity-40" />
                {t("sidebar.empty")}
              </div>
            ) : (
              <ul className="space-y-1">
                {filtered.map((g) => {
                  const active = params.groupId === g.id;
                  return (
                    <li key={g.id}>
                      <Link
                        to="/app/$groupId"
                        params={{ groupId: g.id }}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 transition ${
                          active ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-soft" : "hover:bg-sidebar-accent"
                        }`}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={g.avatar_url ?? undefined} />
                          <AvatarFallback className={active ? "bg-sidebar-primary-foreground/20 text-sidebar-primary-foreground" : "bg-gradient-mint"}>
                            {g.name[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 truncate font-medium">
                            {g.is_pinned && <span className="text-xs">📌</span>}
                            {g.name}
                          </div>
                          <div className={`truncate text-xs ${active ? "text-sidebar-primary-foreground/80" : "text-muted-foreground"}`}>
                            {g.description ?? ""}
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </TabsContent>

        {/* Friends Tab */}
        <TabsContent value="friends" className="flex-1 min-h-0 data-[state=active]:flex flex-col">
          <FriendPanel />
        </TabsContent>
      </Tabs>

      <CreateGroupDialog open={openCreate} onOpenChange={setOpenCreate} />
      <SearchUsersDialog open={openSearch} onOpenChange={setOpenSearch} />
    </aside>
  );
}
