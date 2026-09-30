"use client";
import { navigateAfterAuth } from "@/lib/account-store";
import { useState } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/provider";
import { accountRequest } from "@/lib/account-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export type AuthMode = "lookup" | "sign-up" | "sign-in" | "verify-email" | "forgot-password" | "reset-password" | "change-password";
export function AuthFlowForm({ mode, initialEmail = "", token = "" }: { mode: AuthMode; initialEmail?: string; token?: string }) {
  const t = useT();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const emailField = ["lookup", "sign-up", "sign-in", "forgot-password"].includes(mode) || (mode === "verify-email" && !token);
  const passwordField = ["sign-up", "sign-in", "reset-password", "change-password"].includes(mode);
  const titles = { lookup: "auth.continue", "sign-up": "auth.signUp", "sign-in": "auth.signIn", "verify-email": "auth.verifyEmail", "forgot-password": "auth.reset_password", "reset-password": "auth.reset_password", "change-password": "auth.changePassword" };
  const labels = { ...titles, "forgot-password": "auth.send_reset_link" };
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    let action: string = mode;
    let body: Record<string, string> = {};
    if (mode === "lookup" || mode === "forgot-password") body = { email };
    if (mode === "sign-up" || mode === "sign-in") body = { email, password };
    if (mode === "verify-email") { action = token ? mode : "resend-verification"; body = token ? { token } : { email }; }
    if (mode === "reset-password") body = { token, password };
    if (mode === "change-password") body = { currentPassword, password };
    try {
      const result = await accountRequest<{ nextStep?: string }>(`/api/auth/${action}`, "POST", body);
      const next = new URLSearchParams(window.location.search).get("next");
      const adminReturn = next && /^\/admin(?:\/[a-z-]+(?:\/[a-f0-9-]+)?)?(?:\?[^\\\r\n]*)?$/.test(next) ? next : null;
      if (mode === "lookup") navigateAfterAuth(`/${result.nextStep}?email=${encodeURIComponent(email)}${adminReturn ? `&next=${encodeURIComponent(adminReturn)}` : ""}`);
      else if (mode === "sign-up") navigateAfterAuth(`/verify-email?email=${encodeURIComponent(email)}`);
      else if (mode === "sign-in" && adminReturn && result.nextStep === "/projects") navigateAfterAuth(adminReturn);
      else if (result.nextStep) navigateAfterAuth(result.nextStep);
      else setSent(true);
    } catch (e) { setError(e instanceof Error ? e.message : t("auth.requestFailed")); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="flex flex-col gap-5">
    {mode !== "lookup" && <h2 className="text-center text-2xl font-bold">{t(titles[mode])}</h2>}
    {mode === "verify-email" && <p className="text-sm text-muted-foreground">{t(token ? "auth.verifyInstructions" : "auth.checkInbox")}</p>}
    {sent && <p role="status" className="text-sm">{t("auth.mailAccepted")}</p>}
    {emailField && <div className="space-y-2"><Label htmlFor="email">{t("auth.email")}</Label><Input id="email" name="email" type="email" autoComplete="email" required maxLength={320} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" /></div>}
    {mode === "change-password" && <div className="space-y-2"><Label htmlFor="current-password">{t("auth.currentPassword")}</Label><Input id="current-password" type="password" autoComplete="current-password" required minLength={8} maxLength={128} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} /></div>}
    {passwordField && <div className="space-y-2"><Label htmlFor="password">{t("auth.password")}</Label><Input id="password" name="password" type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} required minLength={8} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} /><p className="text-xs text-muted-foreground">{t("auth.passwordPolicy")}</p></div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button type="submit" className="h-11" disabled={busy || (emailField && !email.trim()) || (mode === "reset-password" && !token)}>{t(mode === "verify-email" && !token ? "auth.send_again" : labels[mode])}</Button>
    {mode === "sign-in" && <><Link href="/forgot-password" className="text-sm underline">{t("auth.forgot_your_password")}</Link><Link href={`/verify-email?email=${encodeURIComponent(email)}`} className="text-sm underline">{t("auth.resendVerification")}</Link></>}
    {mode !== "lookup" && <Link href="/login" className="text-sm underline">{t("auth.backToLogin")}</Link>}
  </form>;
}
