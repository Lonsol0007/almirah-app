"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { LocalityCascade, levelOf, type LocalityValue } from "@/components/locality-cascade";
import { usePrefs } from "@/lib/i18n/prefs";
import { Screen } from "@/components/screen";
import { UpgradeNotice } from "@/components/upgrade-notice";
import { Button } from "@/components/ui/button";
import { DateField, Select, TextField } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { CNR_RE, DataError, data, normaliseCnr } from "@/lib/data";
import type { MessageKey } from "@/lib/i18n/messages";

// The data layer's messages for this form, shown in the advocate's language.
const KNOWN_ERRORS: Record<string, MessageKey> = {
  "A CNR is 16 letters and numbers.": "nc.badCnr",
  "This case is already in your list.": "nc.duplicate",
};
import { useAsync } from "@/lib/use-async";

function NewCaseForm() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const [where, setWhere] = useState<LocalityValue>({});
  const { courtLevel, t } = usePrefs();
  const level = levelOf(where, courtLevel);
  const [types] = useAsync(() => data.caseTypes(level), [level]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [limit, setLimit] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    const cnr = normaliseCnr(get("cnr"));
    const next: Record<string, string> = {};
    if (!CNR_RE.test(cnr)) next.cnr = t("nc.badCnr");
    if (!get("petitioner") && !get("label")) next.petitioner = t("nc.needName");
    setErrors(next);
    if (Object.keys(next).length) {
      document.getElementById(Object.keys(next)[0])?.focus();
      return;
    }
    setBusy(true);
    try {
      const c = await data.createCase({
        cnr,
        label: get("label"),
        caseType: get("caseType"),
        registrationNumber: get("registrationNumber"),
        establishmentId: where.establishmentId,
        courtNo: get("courtNo"),
        nextHearingDate: get("nextHearingDate"),
        petitioner: get("petitioner"),
        respondent: get("respondent"),
        advocateName: get("advocateName"),
      });
      toast(t("nc.saved"), "success");
      router.push(`/cases/${c.id}`);
    } catch (err) {
      if (err instanceof DataError && err.code === "limit") {
        setLimit(err.message);
      } else if (err instanceof DataError && (err.code === "duplicate" || err.code === "invalid")) {
        setErrors({ cnr: KNOWN_ERRORS[err.message] ? t(KNOWN_ERRORS[err.message]) : err.message });
        document.getElementById("cnr")?.focus();
      } else {
        toast((err as Error).message, "error");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form method="post" onSubmit={submit} noValidate className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-4 rounded-lg border border-border bg-surface-raised p-4 shadow-card">
        <legend className="px-1 text-base font-semibold">{t("nc.theCase")}</legend>
        <TextField
          id="cnr"
          name="cnr"
          label={t("cnr.label")}
          defaultValue={params.get("cnr") ?? ""}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          className="font-mono uppercase"
          error={errors.cnr}
          required
        />
        <TextField name="label" label={t("nc.label")} placeholder={t("nc.labelPlaceholder")} maxLength={80} />
        <Select
          name="caseType"
          label={t("tab.caseType")}
          placeholder={t("field.chooseCaseType")}
          options={(types.data ?? []).map((ty) => ({ value: ty, label: ty }))}
        />
        <TextField name="registrationNumber" label={t("tab.caseNumber")} placeholder={t("nc.caseNumberPlaceholder")} />
        <DateField name="nextHearingDate" label={t("rh.next")} />
      </fieldset>

      <fieldset className="flex flex-col gap-4 rounded-lg border border-border bg-surface-raised p-4 shadow-card">
        <legend className="px-1 text-base font-semibold">{t("loc.court")}</legend>
        <LocalityCascade value={where} onChange={setWhere} />
        <TextField name="courtNo" label={t("nc.courtRoom")} inputMode="numeric" />
      </fieldset>

      <fieldset className="flex flex-col gap-4 rounded-lg border border-border bg-surface-raised p-4 shadow-card">
        <legend className="px-1 text-base font-semibold">{t("nc.parties")}</legend>
        <TextField id="petitioner" name="petitioner" label={t("nc.petitioner")} error={errors.petitioner} />
        <TextField name="respondent" label={t("nc.respondent")} />
        <TextField name="advocateName" label={t("nc.advocate")} />
      </fieldset>

      {limit && <UpgradeNotice message={limit} />}
      <Button type="submit" size="lg" loading={busy}>
        {t("nc.save")}
      </Button>
    </form>
  );
}

export default function NewCasePage() {
  const { t } = usePrefs();
  return (
    <Screen title={t("home.addCase")} backHref="/my-cases">
      <Suspense>
        <NewCaseForm />
      </Suspense>
    </Screen>
  );
}
