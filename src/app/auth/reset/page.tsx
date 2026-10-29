"use client";

import { useState, type FormEvent } from "react";
import { MailCheck } from "lucide-react";
import { AppBar } from "@/components/app-bar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TextField } from "@/components/ui/field";
import { SITE_URL } from "@/lib/env";
import { supabaseBrowser } from "@/lib/supabase/client";
import { usePrefs } from "@/lib/i18n/prefs";

export default function ResetPage() {
  const { t } = usePrefs();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError(t("lg.validEmail"));
    setBusy(true);
    setError(undefined);
    const { error } = await supabaseBrowser().auth.resetPasswordForEmail(email, {
      redirectTo: `${SITE_URL}/auth/callback?next=/auth/update-password`,
    });
    setBusy(false);
    // Same answer whether or not the account exists, so the form can't be used to discover accounts.
    if (error && /rate limit/i.test(error.message)) return setError(t("lg.tooMany"));
    setSent(true);
  }

  return (
    <>
      <AppBar title={t("rs.title")} backHref="/login" />
      <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 py-8">
        {sent ? (
          <EmptyState icon={<MailCheck size={40} />} title={t("lg.checkEmail")} body={t("rs.sentBody")} />
        ) : (
          <form method="post" onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-lg border border-border bg-surface-raised p-4 shadow-card">
            <TextField name="email" type="email" label={t("lg.email")} autoComplete="email" error={error} />
            <Button type="submit" size="lg" loading={busy}>
              {t("rs.send")}
            </Button>
          </form>
        )}
      </main>
    </>
  );
}
