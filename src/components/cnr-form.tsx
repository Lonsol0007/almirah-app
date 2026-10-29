"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { CNR_RE, data, normaliseCnr } from "@/lib/data";
import { usePrefs } from "@/lib/i18n/prefs";

export function CnrForm({ compact = false, initial = "" }: { compact?: boolean; initial?: string }) {
  const router = useRouter();
  const { t } = usePrefs();
  const [cnr, setCnr] = useState(initial);
  const [error, setError] = useState<string>();
  const [notFound, setNotFound] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const value = normaliseCnr(cnr);
    setNotFound(undefined);
    if (!CNR_RE.test(value)) {
      setError(t("cnr.invalid"));
      return;
    }
    setError(undefined);
    setBusy(true);
    try {
      const hit = await data.findByCnr(value);
      if (hit) router.push(`/cases/${hit.id}`);
      else setNotFound(value);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form method="post" onSubmit={submit} noValidate className="flex flex-col gap-3">
      <TextField
        label={t("cnr.label")}
        name="cnr"
        value={cnr}
        onChange={(e) => setCnr(e.target.value.toUpperCase())}
        placeholder={t("cnr.placeholder")}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={20}
        className="font-mono uppercase tracking-wide placeholder:font-sans placeholder:normal-case placeholder:tracking-normal"
        hint={compact ? undefined : t("cnr.hint")}
        error={error}
      />
      <div className="flex gap-2">
        <Button type="submit" loading={busy} className="flex-1">
          {t("cnr.lookUp")}
        </Button>
        <Link
          href="/cnr/scan"
          className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface-raised px-4 text-sm font-semibold text-text hover:bg-surface"
        >
          <QrCode aria-hidden="true" size={18} />
          {t("cnr.scan")}
        </Link>
      </div>
      {notFound && (
        <div role="status" className="rounded-md border border-border bg-surface p-3 text-sm">
          <p className="text-text">{t("cnr.noRecord", { cnr: notFound })}</p>
          <Link
            href={`/cases/new?cnr=${notFound}`}
            className="mt-1 inline-block font-semibold text-accent underline-offset-4 hover:underline"
          >
            {t("cnr.addIt")}
          </Link>
        </div>
      )}
    </form>
  );
}
