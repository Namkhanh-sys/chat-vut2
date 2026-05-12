import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/reset-password")({
  component: ResetPage,
});

function ResetPage() {
  const { updatePassword } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    const valid = z.string().min(6).max(72).safeParse(password);
    if (!valid.success) { toast.error("Mật khẩu tối thiểu 6 ký tự"); return; }
    setSubmitting(true);
    const { error } = await updatePassword(password);
    setSubmitting(false);
    if (error) toast.error(error);
    else { toast.success("Đã cập nhật mật khẩu"); navigate({ to: "/app" }); }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 rounded-3xl border bg-card p-8 shadow-card">
        <h1 className="font-display text-2xl font-bold">{t("auth.resetTitle")}</h1>
        <div className="space-y-2">
          <Label htmlFor="new-pass">{t("auth.newPassword")}</Label>
          <Input id="new-pass" name="password" type="password" required minLength={6} />
        </div>
        <Button type="submit" disabled={submitting} className="w-full rounded-full bg-gradient-primary text-primary-foreground shadow-soft">
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("auth.update")}
        </Button>
      </form>
    </div>
  );
}
