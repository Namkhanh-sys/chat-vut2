import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { MessageCircleHeart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { validatePasswordStrength, getPasswordStrengthColor, getPasswordStrengthLabel } from "@/lib/password-validator";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

const loginSchema = z.object({
  email: z.string().trim().email("Email không hợp lệ").max(255),
  password: z.string().min(6, "Tối thiểu 6 ký tự").max(72),
});
const signupSchema = loginSchema.extend({
  displayName: z.string().trim().min(2, "Tên tối thiểu 2 ký tự").max(50),
});

function AuthPage() {
  const { user, loading, signIn, signUp, resetPassword } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [submitting, setSubmitting] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState<any>(null);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/app" });
  }, [loading, user, navigate]);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pwd = e.target.value;
    setPassword(pwd);
    if (pwd) {
      setPasswordStrength(validatePasswordStrength(pwd));
    } else {
      setPasswordStrength(null);
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await signIn(parsed.data.email, parsed.data.password);
    setSubmitting(false);
    if (error) toast.error(error);
    else { toast.success(t("auth.welcome")); navigate({ to: "/app" }); }
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signupSchema.safeParse({
      email: fd.get("email"),
      password: fd.get("password"),
      displayName: fd.get("displayName"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }

    // Check password strength
    const passwordCheck = validatePasswordStrength(parsed.data.password);
    if (!passwordCheck.isValid) {
      toast.error(passwordCheck.message);
      return;
    }

    setSubmitting(true);
    const { error } = await signUp(parsed.data.email, parsed.data.password, parsed.data.displayName);
    setSubmitting(false);
    if (error) toast.error(error);
    else { toast.success(t("common.success")); navigate({ to: "/app" }); }
  };

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    const valid = z.string().email().safeParse(email);
    if (!valid.success) { toast.error(t("common.error")); return; }
    setSubmitting(true);
    const { error } = await resetPassword(email);
    setSubmitting(false);
    if (error) toast.error(error);
    else { toast.success(t("auth.resetSent")); setShowReset(false); }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-gradient-aurora opacity-30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-gradient-mint opacity-40 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-primary shadow-soft">
            <MessageCircleHeart className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold">{t("app.name")}</span>
        </Link>

        <div className="rounded-3xl border bg-card p-6 shadow-card md:p-8">
          {showReset ? (
            <form onSubmit={handleReset} className="space-y-4">
              <h2 className="font-display text-2xl font-bold">{t("auth.resetTitle")}</h2>
              <div className="space-y-2">
                <Label htmlFor="reset-email">{t("auth.email")}</Label>
                <Input id="reset-email" name="email" type="email" required />
              </div>
              <Button type="submit" disabled={submitting} className="w-full rounded-full bg-gradient-primary text-primary-foreground shadow-soft">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("auth.resetSubmit")}
              </Button>
              <button type="button" onClick={() => setShowReset(false)} className="block w-full text-center text-sm text-muted-foreground hover:text-foreground">
                {t("chat.cancel")}
              </button>
            </form>
          ) : (
            <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")}>
              <TabsList className="grid w-full grid-cols-2 rounded-full">
                <TabsTrigger value="login" className="rounded-full">{t("auth.login")}</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-full">{t("auth.signup")}</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-6">
                <h2 className="mb-4 font-display text-2xl font-bold">{t("auth.welcome")}</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">{t("auth.email")}</Label>
                    <Input id="login-email" name="email" type="email" required autoComplete="email" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-pass">{t("auth.password")}</Label>
                    <Input id="login-pass" name="password" type="password" required autoComplete="current-password" />
                  </div>
                  <button type="button" onClick={() => setShowReset(true)} className="block text-sm text-primary hover:underline">
                    {t("auth.forgot")}
                  </button>
                  <Button type="submit" disabled={submitting} className="w-full rounded-full bg-gradient-primary text-primary-foreground shadow-soft">
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t("auth.submit.login")}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-6">
                <h2 className="mb-4 font-display text-2xl font-bold">{t("auth.create")}</h2>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">{t("auth.displayName")}</Label>
                    <Input id="signup-name" name="displayName" required autoComplete="name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">{t("auth.email")}</Label>
                    <Input id="signup-email" name="email" type="email" required autoComplete="email" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-pass">{t("auth.password")}</Label>
                    <Input 
                      id="signup-pass" 
                      name="password" 
                      type="password" 
                      required 
                      autoComplete="new-password" 
                      minLength={6} 
                      onChange={handlePasswordChange}
                      value={password}
                    />
                    {passwordStrength && (
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Độ mạnh mật khẩu:</span>
                          <span className={passwordStrength.isValid ? "text-green-600" : "text-red-600"}>
                            {getPasswordStrengthLabel(passwordStrength.score)}
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${getPasswordStrengthColor(passwordStrength.score)}`}
                            style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                          />
                        </div>
                        {!passwordStrength.isValid && (
                          <div className="text-sm text-red-600 font-medium">{passwordStrength.message}</div>
                        )}
                        {passwordStrength.isValid && passwordStrength.issues.length > 0 && (
                          <div className="text-sm text-yellow-600">
                            <p className="font-medium">Có thể cải thiện:</p>
                            <ul className="list-disc list-inside">
                              {passwordStrength.issues.map((issue: string, i: number) => (
                                <li key={i}>{issue}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <Button type="submit" disabled={submitting || !passwordStrength?.isValid} className="w-full rounded-full bg-gradient-primary text-primary-foreground shadow-soft">
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t("auth.submit.signup")}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
