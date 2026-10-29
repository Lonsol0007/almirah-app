"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { MailCheck } from "lucide-react";
import { AppBar } from "@/components/app-bar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TextField } from "@/components/ui/field";
import { Tabs } from "@/components/ui/tabs";
import { BRAND } from "@/lib/brand";
import { SITE_URL, backendEnabled } from "@/lib/env";
import { safeNext } from "@/lib/safe-next";
import { supabaseBrowser } from "@/lib/supabase/client";
import { usePrefs, type T } from "@/lib/i18n/prefs";

type Mode = "signin" | "signup" | "link";

function friendly(t: T, message: string) {
  if (/invalid login credentials/i.test(message)) return t("lg.wrongPassword");
  if (/email not confirmed/i.test(message)) return t("lg.confirmFirst");
  if (/rate limit|too many/i.test(message)) return t("lg.tooMany");
  if (/already registered/i.test(message)) return t("lg.exists");
  return message;
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = usePrefs();
  const next = safeNext(params.get("next"));
  const [mode, setMode] = useState<Mode>("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(params.get("error") === "link" ? t("lg.linkExpired") : undefined);
  const [sentTo, setSentTo] = useState<string>();

  const callback = `${SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "").trim();
    const password = String(f.get("password") ?? "");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError(t("lg.validEmail"));
    if (mode !== "link" && password.length < (mode === "signup" ? 10 : 1)) {
      return setError(mode === "signup" ? t("lg.pwd10") : t("lg.enterPassword"));
    }
    setBusy(true);
    setError(undefined);
    const auth = supabaseBrowser().auth;
    try {
      if (mode === "signin") {
        const { error } = await auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace(next);
        router.refresh();
      } else if (mode === "signup") {
        const { error } = await auth.signUp({ email, password, options: { emailRedirectTo: callback } });
        if (error) throw error;
        setSentTo(email);
      } else {
        const { error } = await auth.signInWithOtp({ email, options: { emailRedirectTo: callback, shouldCreateUser: true } });
        if (error) throw error;
        setSentTo(email);
      }
    } catch (err) {
      setError(friendly(t, (err as Error).message));
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setError(undefined);
    const { error } = await supabaseBrowser().auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback } });
    if (error) setError(friendly(t, error.message));
  }

  if (!backendEnabled) {
    return (
      <EmptyState
        icon={<MailCheck size={40} />}
        title={t("lg.notOn")}
        body={t("lg.notOnBody")}
        action={<Link href="/" className="text-sm font-semibold text-accent hover:underline">{t("lg.backToApp")}</Link>}
      />
    );
  }

  if (sentTo) {
    return (
      <EmptyState
        icon={<MailCheck size={40} />}
        title={t("lg.checkEmail")}
        body={t("lg.sentTo", { email: sentTo })}
        action={<Button variant="secondary" onClick={() => setSentTo(undefined)}>{t("lg.differentEmail")}</Button>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Tabs
        label={t("lg.howTo")}
        value={mode}
        onChange={(m) => {
          setMode(m as Mode);
          setError(undefined);
        }}
        items={[
          { id: "signin", label: t("lg.signIn") },
          { id: "signup", label: t("lg.signUp") },
          { id: "link", label: t("lg.emailLink") },
        ]}
      >
        <form method="post" onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-lg border border-border bg-surface-raised p-4 shadow-card">
          <TextField name="email" type="email" label={t("lg.email")} autoComplete="email" required />
          {mode !== "link" && (
            <TextField
              name="password"
              type="password"
              label={t("lg.password")}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              hint={mode === "signup" ? t("lg.pwdHint") : undefined}
              required
            />
          )}
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" loading={busy}>
            {mode === "signin" ? t("lg.signIn") : mode === "signup" ? t("lg.signUp") : t("lg.sendLink")}
          </Button>
          {mode === "signin" && (
            <Link href="/auth/reset" className="self-start text-sm font-semibold text-accent hover:underline">
              {t("lg.forgot")}
            </Link>
          )}
        </form>
      </Tabs>

      <div className="flex items-center gap-3 text-xs text-text-muted">
        <span className="h-px flex-1 bg-border" />
        {t("lg.or")}
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button variant="secondary" size="lg" onClick={google}>
        {t("lg.google")}
      </Button>
      <p className="text-center text-xs text-text-muted">
        {t("lg.agree1")}{" "}
        <Link href="/terms" className="underline">{t("lg.terms")}</Link> {t("lg.agree2")}{" "}
        <Link href="/privacy" className="underline">{t("lg.privacyPolicy")}</Link>
        {t("lg.agree3") === "." ? "." : ` ${t("lg.agree3")}`}
      </p>
    </div>
  );
}

export default function LoginPage() {
  const { t } = usePrefs();
  return (
    <>
      <AppBar title={BRAND.name} />
      <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 py-8">
        <div>
          <h2 className="text-xl">{t("brand.tagline")}</h2>
          <p className="text-sm text-text-muted">{t("lg.subtitle")}</p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </main>
    </>
  );
}
