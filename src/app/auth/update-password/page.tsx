"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AppBar } from "@/components/app-bar";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { supabaseBrowser } from "@/lib/supabase/client";
import { usePrefs } from "@/lib/i18n/prefs";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const toast = useToast();
  const { t } = usePrefs();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password") ?? "");
    if (password.length < 10) return setError(t("pw.short"));
    if (password !== String(f.get("confirm") ?? "")) return setError(t("pw.mismatch"));
    setBusy(true);
    const { error } = await supabaseBrowser().auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(t("pw.expired"));
    toast(t("pw.updated"), "success");
    router.replace("/");
  }

  return (
    <>
      <AppBar title={t("pw.title")} />
      <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 py-8">
        <form method="post" onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-lg border border-border bg-surface-raised p-4 shadow-card">
          <TextField name="password" type="password" label={t("pw.title")} autoComplete="new-password" hint={t("lg.pwdHint")} />
          <TextField name="confirm" type="password" label={t("pw.again")} autoComplete="new-password" error={error} />
          <Button type="submit" size="lg" loading={busy}>
            {t("pw.save")}
          </Button>
        </form>
      </main>
    </>
  );
}
