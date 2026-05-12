import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { MessageCircleHeart, Zap, Users, Shield, Sparkles, Languages, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/hooks/use-theme";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const { t, lang, setLang } = useI18n();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/app" });
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Header */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-primary shadow-soft">
            <MessageCircleHeart className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold">{t("app.name")}</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setLang(lang === "vi" ? "en" : "vi")} aria-label="Language">
            <Languages className="h-4 w-4" />
            <span className="ml-1 text-xs font-semibold uppercase">{lang}</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Theme">
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
          <Link to="/auth">
            <Button variant="ghost">{t("nav.login")}</Button>
          </Link>
          <Link to="/auth">
            <Button className="rounded-full bg-gradient-primary text-primary-foreground shadow-soft hover:opacity-90">
              {t("nav.signup")}
            </Button>
          </Link>
        </div>
      </header>

      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-gradient-aurora opacity-30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-gradient-mint opacity-40 blur-3xl" />

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-6 pt-12 pb-20 md:pt-20">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-sm font-medium text-secondary-foreground">
              <Sparkles className="h-4 w-4" />
              {t("app.tagline")}
            </div>
            <h1 className="font-display text-5xl font-bold leading-tight md:text-6xl">
              {t("landing.hero.title")}{" "}
              <span className="bg-gradient-primary bg-clip-text text-transparent">💬</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">{t("landing.hero.subtitle")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth">
                <Button size="lg" className="rounded-full bg-gradient-primary px-8 text-primary-foreground shadow-glow hover:opacity-90">
                  {t("landing.cta")}
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="rounded-full">
                  {t("nav.login")}
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="animate-float rounded-3xl bg-card p-6 shadow-card">
              <div className="space-y-3">
                <ChatBubble side="left" name="Linh" color="bg-secondary text-secondary-foreground">
                  Hôm nay đi cafe nha! ☕
                </ChatBubble>
                <ChatBubble side="right" name="Bạn" color="bg-gradient-primary text-primary-foreground">
                  Đi luôn 🎉
                </ChatBubble>
                <ChatBubble side="left" name="Nam" color="bg-accent text-accent-foreground">
                  Tớ join với 🙋‍♂️
                </ChatBubble>
                <ChatBubble side="right" name="Bạn" color="bg-gradient-primary text-primary-foreground">
                  Đặt bàn 4 người nhé 🪑
                </ChatBubble>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-6 hidden rounded-2xl bg-card p-4 shadow-card md:block">
              <div className="flex items-center gap-2 text-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                </span>
                3 {t("permissions.membersCount")}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-3">
          <FeatureCard icon={<Zap />} title={t("landing.feat1.title")} desc={t("landing.feat1.desc")} gradient="bg-gradient-sunset" />
          <FeatureCard icon={<Users />} title={t("landing.feat2.title")} desc={t("landing.feat2.desc")} gradient="bg-gradient-mint" />
          <FeatureCard icon={<Shield />} title={t("landing.feat3.title")} desc={t("landing.feat3.desc")} gradient="bg-gradient-aurora" />
        </div>
      </section>
    </div>
  );
}

function ChatBubble({ side, name, color, children }: { side: "left" | "right"; name: string; color: string; children: React.ReactNode }) {
  return (
    <div className={`flex ${side === "right" ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${color} ${side === "right" ? "rounded-br-md" : "rounded-bl-md"}`}>
        {side === "left" && <div className="text-xs font-semibold opacity-70">{name}</div>}
        <div>{children}</div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc, gradient }: { icon: React.ReactNode; title: string; desc: string; gradient: string }) {
  return (
    <div className="group rounded-3xl border bg-card p-6 shadow-card transition hover:-translate-y-1 hover:shadow-glow">
      <div className={`mb-4 inline-grid h-12 w-12 place-items-center rounded-2xl ${gradient} text-primary-foreground shadow-soft`}>
        {icon}
      </div>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
