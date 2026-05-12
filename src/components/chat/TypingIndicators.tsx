import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TypingIndicatorProps {
  displayName: string;
  avatarUrl?: string | null;
}

export function TypingIndicator({ displayName, avatarUrl }: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
      <Avatar className="h-6 w-6">
        <AvatarImage src={avatarUrl ?? undefined} />
        <AvatarFallback className="text-xs">{displayName[0]?.toUpperCase()}</AvatarFallback>
      </Avatar>
      <span>{displayName}</span>
      <div className="flex gap-0.5">
        <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "0s" }} />
        <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "0.1s" }} />
        <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "0.2s" }} />
      </div>
      <span>đang nhập...</span>
    </div>
  );
}

interface TypingIndicatorsListProps {
  users: Array<{ id: string; display_name: string; avatar_url: string | null }>;
}

export function TypingIndicatorsList({ users }: TypingIndicatorsListProps) {
  if (users.length === 0) return null;

  return (
    <div className="border-t bg-muted/20 px-4 py-2">
      <div className="mx-auto max-w-3xl space-y-1">
        {users.map((user) => (
          <TypingIndicator key={user.id} displayName={user.display_name} avatarUrl={user.avatar_url} />
        ))}
      </div>
    </div>
  );
}
