"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { Screen } from "@/components/screen";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TextField } from "@/components/ui/field";
import { SkeletonCard } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { formatInstant } from "@/lib/dates";
import { data as dataLayer, type PlanUsage } from "@/lib/data";
import { backendEnabled } from "@/lib/env";
import { supabaseBrowser } from "@/lib/supabase/client";
import { usePrefs } from "@/lib/i18n/prefs";

interface Sub {
  plan: "free" | "pro";
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

async function go(path: string, fallbackError: string) {
  const res = await fetch(path, { method: "POST" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.url) throw new Error(body.error ?? fallbackError);
  window.location.assign(body.url);
}

function Account() {
  const router = useRouter();
  const toast = useToast();
  const { t } = usePrefs();
  const [email, setEmail] = useState<string>();
  const [sub, setSub] = useState<Sub | null>(null);
  const [usage, setUsage] = useState<PlanUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    const sb = supabaseBrowser();
    (async () => {
      const { data } = await sb.auth.getUser();
      setEmail(data.user?.email);
      const { data: s } = await sb.from("subscriptions").select("plan, status, current_period_end, cancel_at_period_end").maybeSingle();
      setSub((s as Sub) ?? null);
      setUsage(await dataLayer.planUsage().catch(() => null));
      setLoading(false);
    })();
  }, []);

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    try {
      await fn();
    } catch (e) {
      toast((e as Error).message, "error");
      setBusy(null);
    }
  }

  async function signOut(scope: "local" | "global") {
    await run(scope, async () => {
      await supabaseBrowser().auth.signOut({ scope });
      router.replace("/login");
      router.refresh();
    });
  }

  async function deleteAccount() {
    await run("delete", async () => {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirm }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? t("ac.deleteFailed"));
      await supabaseBrowser().auth.signOut({ scope: "local" });
      router.replace("/login");
      router.refresh();
    });
  }

  if (loading) return <SkeletonCard />;
  const pro = sub?.plan === "pro";

  return (
    <>
      <section className="flex flex-col gap-2 rounded-lg border border-border bg-surface-raised p-4 shadow-card">
        <h2 className="text-lg">{t("ac.signedIn")}</h2>
        <p className="break-all text-sm text-text">{email}</p>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface-raised p-4 shadow-card">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg">{t("ac.plan")}</h2>
          <StatusBadge tone={pro ? "pending" : "disposed"}>{pro ? t("ac.advocate") : t("ac.free")}</StatusBadge>
        </div>
        {usage && usage.caseLimit !== null && (
          <p className="text-sm text-text-muted">
            {t("ac.usage", { cases: usage.cases, caseLimit: usage.caseLimit, orderFiles: usage.orderFiles, orderFileLimit: usage.orderFileLimit ?? "" })}
          </p>
        )}
        {pro && sub?.current_period_end && (
          <p className="text-sm text-text-muted">
            {t(sub.cancel_at_period_end ? "ac.ends" : "ac.renews", { date: formatInstant(sub.current_period_end) })}
            {sub.status === "past_due" && t("ac.pastDue")}
          </p>
        )}
        {pro ? (
          <Button variant="secondary" loading={busy === "portal"} onClick={() => run("portal", () => go("/api/billing/portal", t("ac.billingDown")))} className="self-start">
            {t("ac.manage")}
          </Button>
        ) : (
          <Button loading={busy === "checkout"} onClick={() => run("checkout", () => go("/api/billing/checkout", t("ac.billingDown")))} className="self-start">
            {t("ac.upgrade")}
          </Button>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface-raised p-4 shadow-card">
        <h2 className="text-lg">{t("ac.signOutTitle")}</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" loading={busy === "local"} onClick={() => signOut("local")}>
            {t("ac.signOut")}
          </Button>
          <Button variant="ghost" loading={busy === "global"} onClick={() => signOut("global")}>
            {t("ac.signOutAll")}
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-danger bg-surface-raised p-4">
        <h2 className="text-lg text-danger">{t("ac.deleteTitle")}</h2>
        <p className="text-sm text-text-muted">
          {t("ac.deleteBody")}
        </p>
        <Link href="/my-cases/backup" className="self-start text-sm font-semibold text-accent hover:underline">
          {t("ac.downloadBackup")}
        </Link>
        <TextField label={t("ac.typeDelete")} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
        <Button variant="danger" disabled={confirm !== "DELETE"} loading={busy === "delete"} onClick={deleteAccount} className="self-start">
          {t("ac.deleteBtn")}
        </Button>
      </section>
    </>
  );
}

export default function AccountPage() {
  const { t } = usePrefs();
  return (
    <Screen title={t("ac.title")} backHref="/more">
      {backendEnabled ? (
        <Account />
      ) : (
        <EmptyState
          icon={<UserRound size={40} />}
          title={t("ac.demo")}
          body={t("ac.demoBody")}
        />
      )}
    </Screen>
  );
}
