import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { useSidebar } from "@/hooks/use-sidebar";
import { Button } from "@/components/ui/button";
import { Menu, MessageCircleHeart } from "lucide-react";

export const Route = createFileRoute("/app/")({
  component: EmptyState,
});

function EmptyState() {
  const { t } = useI18n();
  const { toggle } = useSidebar();

  return (
    <div className="relative h-full">
      {/* Mobile Menu Toggle */}
      <div className="absolute left-4 top-4 md:hidden">
        <Button variant="ghost" size="icon" onClick={toggle} className="h-10 w-10 rounded-xl">
          <Menu className="h-6 w-6" />
        </Button>
      </div>

      <div className="grid h-full place-items-center px-6">
        <div className="text-center">
          <div className="mx-auto mb-6 grid h-24 w-24 place-items-center rounded-3xl bg-gradient-aurora shadow-glow animate-float">
            <MessageCircleHeart className="h-12 w-12 text-primary-foreground" />
          </div>
          <h2 className="font-display text-2xl font-bold">{t("chat.empty.title")}</h2>
          <p className="mt-2 max-w-sm text-muted-foreground">{t("chat.empty.desc")}</p>
        </div>
      </div>
    </div>
  );
}
