"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { FileX2 } from "lucide-react";
import { ErrorState } from "@/components/case-list";
import { Screen } from "@/components/screen";
import { Button } from "@/components/ui/button";
import { caseTitle } from "@/components/ui/case-card";
import { caseRef } from "@/lib/consumer";
import { EmptyState } from "@/components/ui/empty-state";
import { DateField, TextField } from "@/components/ui/field";
import { SkeletonCard } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { DataError, data, type HearingInput } from "@/lib/data";
import { formatDate, todayIST } from "@/lib/dates";
import { usePrefs } from "@/lib/i18n/prefs";
import type { MessageKey } from "@/lib/i18n/messages";
import { useAsync } from "@/lib/use-async";
import { caseHref } from "@/lib/routes";

type Outcome = "adjourned" | "disposed";

// The data layer's validation messages, shown in the advocate's language.
const KNOWN_ERRORS: Record<string, MessageKey> = {
  "Add the date of the hearing.": "rh.errHeldOn",
  "Add the next hearing date.": "rh.errNext",
  "The next date has to be after the hearing.": "rh.errOrder",
};

export default function RecordHearingPage() {
  return (
    <Suspense>
      <RecordHearing />
    </Suspense>
  );
}

function RecordHearing() {
  const id = useSearchParams().get("id") ?? "";
  const router = useRouter();
  const toast = useToast();
  const { t } = usePrefs();
  const [state, reload] = useAsync(() => data.getCase(id), [id]);
  const [outcome, setOutcome] = useState<Outcome>("adjourned");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const today = todayIST();

  if (state.status === "loading") {
    return (
      <Screen title={t("case.record")} backHref={caseHref(id)}>
        <SkeletonCard />
      </Screen>
    );
  }
  if (state.status === "error") {
    return (
      <Screen title={t("case.record")} backHref={caseHref(id)}>
        <ErrorState error={state.error} onRetry={reload} />
      </Screen>
    );
  }
  const c = state.data;
  if (!c || c.status === "disposed") {
    return (
      <Screen title={t("case.record")} backHref={c ? caseHref(id) : "/my-cases"}>
        <EmptyState
          icon={<FileX2 size={40} />}
          title={c ? t("rh.disposedTitle") : t("case.notFound")}
          body={c ? t("rh.disposedBody") : t("case.notFoundBody")}
        />
      </Screen>
    );
  }

  // Default to the listed date if it has arrived, otherwise today.
  const heldDefault = c.nextHearingDate && c.nextHearingDate <= today ? c.nextHearingDate : today;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "").trim();
    const base = { heldOn: v("heldOn"), whatHappened: v("whatHappened"), stage: v("stage") };
    const input: HearingInput =
      outcome === "adjourned"
        ? { ...base, outcome, nextHearingDate: v("nextHearingDate") }
        : { ...base, outcome, natureOfDisposal: v("natureOfDisposal") };
    setBusy(true);
    setErrors({});
    try {
      await data.recordHearing(id, input);
      toast(input.outcome === "adjourned" ? t("rh.toastNext", { date: formatDate(input.nextHearingDate) }) : t("rh.toastDisposed"), "success");
      router.push(caseHref(id));
    } catch (err) {
      if (err instanceof DataError && err.code === "invalid") {
        const field = /next/i.test(err.message) ? "nextHearingDate" : /hearing/i.test(err.message) ? "heldOn" : "form";
        setErrors({ [field]: KNOWN_ERRORS[err.message] ? t(KNOWN_ERRORS[err.message]) : err.message });
        requestAnimationFrame(() => document.getElementById(field)?.focus());
      } else {
        toast((err as Error).message, "error");
      }
      setBusy(false);
    }
  }

  return (
    <Screen title={t("case.record")} backHref={caseHref(id)}>
      <p className="text-sm text-text-muted">
        <span className="font-semibold text-text">{caseTitle(c)}</span> · <span className="font-mono">{caseRef(c)}</span>
      </p>
      <form method="post" onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-lg border border-border bg-surface-raised p-4 shadow-card">
        <DateField id="heldOn" name="heldOn" label={t("rh.heldOn")} defaultValue={heldDefault} max={today} error={errors.heldOn} />
        <TextField name="whatHappened" label={t("rh.whatHappened")} placeholder={t("rh.whatHappenedPlaceholder")} maxLength={300} />
        <TextField name="stage" label={t("f.stage")} defaultValue={c.stage ?? ""} maxLength={120} />

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">{t("rh.result")}</legend>
          {(
            [
              ["adjourned", "rh.adjourned"],
              ["disposed", "rh.disposed"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-border px-3 has-[:checked]:border-accent has-[:checked]:bg-accent-subtle">
              <input
                type="radio"
                name="outcome"
                value={value}
                checked={outcome === value}
                onChange={() => setOutcome(value)}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              <span className="text-sm">{t(label)}</span>
            </label>
          ))}
        </fieldset>

        {outcome === "adjourned" ? (
          <DateField id="nextHearingDate" name="nextHearingDate" label={t("rh.next")} error={errors.nextHearingDate} />
        ) : (
          <TextField name="natureOfDisposal" label={t("rh.outcome")} placeholder={t("rh.outcomePlaceholder")} maxLength={200} />
        )}

        {errors.form && (
          <p role="alert" className="text-sm text-danger">
            {errors.form}
          </p>
        )}
        <Button type="submit" size="lg" loading={busy}>
          {t("rh.save")}
        </Button>
      </form>
    </Screen>
  );
}
