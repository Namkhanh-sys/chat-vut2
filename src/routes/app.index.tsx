import { createFileRoute } from "@tanstack/react-router";
import { MessageCircleHeart } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/")({
  component: EmptyState,
});

function EmptyState() {
  const { t } = useI18n();
  return (
    <div className="grid h-full place-items-center px-6">
      <div className="text-center">
        <div className="mx-auto mb-6 grid h-24 w-24 place-items-center rounded-3xl bg-gradient-aurora shadow-glow animate-float">
          <MessageCircleHeart className="h-12 w-12 text-primary-foreground" />
        </div>
        <h2 className="font-display text-2xl font-bold">{t("chat.empty.title")}</h2>
        <p className="mt-2 max-w-sm text-muted-foreground">{t("chat.empty.desc")}</p>
      </div>
    </div>
  );
}
