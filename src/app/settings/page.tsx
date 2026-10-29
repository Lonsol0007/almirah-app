"use client";

import { useState, type FormEvent } from "react";
import { ErrorState } from "@/components/case-list";
import { COURT_LEVELS } from "@/components/locality-cascade";
import { Screen } from "@/components/screen";
import { Button } from "@/components/ui/button";
import { Select, TextField } from "@/components/ui/field";
import { SkeletonCard } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { data, type Profile } from "@/lib/data";
import { useAsync } from "@/lib/use-async";
import { usePrefs } from "@/lib/i18n/prefs";

// Languages with a written translation. Native names, so each is findable by its speakers.
const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिन्दी (Hindi)" },
  { value: "mr", label: "मराठी (Marathi)" },
];

const LEAD_DAYS = [0, 1, 2, 3, 7];

export default function SettingsPage() {
  const toast = useToast();
  const { t, setPrefs } = usePrefs();
  const [state, reload] = useAsync(() => data.getProfile(), []);
  const [states] = useAsync(() => data.locality("state"), []);
  // The form shows the saved profile until the user changes something.
  const [edited, setP] = useState<Profile | null>(null);
  const p = edited ?? (state.status === "ready" ? state.data : null);
  const [busy, setBusy] = useState(false);
  const LEAD = LEAD_DAYS.map((d) => ({
    value: String(d),
    label: d === 0 ? t("st.lead0") : d === 1 ? t("st.lead1") : t("st.leadN", { n: d }),
  }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!p) return;
    setBusy(true);
    try {
      await data.saveProfile(p);
      setPrefs({ lang: p.language, courtLevel: p.courtLevel });
      toast(t("st.saved"), "success");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title={t("st.title")} backHref="/more">
      {state.status === "error" && <ErrorState error={state.error} onRetry={reload} />}
      {!p && state.status !== "error" && <SkeletonCard />}
      {p && (
        <form method="post" onSubmit={submit} className="flex flex-col gap-6">
          <fieldset className="flex flex-col gap-4 rounded-lg border border-border bg-surface-raised p-4 shadow-card">
            <legend className="px-1 text-base font-semibold">{t("st.you")}</legend>
            <TextField label={t("st.name")} value={p.fullName ?? ""} onChange={(e) => setP({ ...p, fullName: e.target.value })} autoComplete="name" />
            <TextField
              label={t("field.barReg")}
              value={p.barCode ?? ""}
              onChange={(e) => setP({ ...p, barCode: e.target.value.toUpperCase() })}
              hint={t("st.barHint")}
              autoComplete="off"
            />
            <Select
              label={t("st.homeState")}
              value={p.homeStateId ?? ""}
              onChange={(e) => setP({ ...p, homeStateId: e.target.value || undefined })}
              placeholder={t("st.notSet")}
              options={(states.data ?? []).map((s) => ({ value: s.id, label: s.name }))}
            />
          </fieldset>

          <fieldset className="flex flex-col gap-4 rounded-lg border border-border bg-surface-raised p-4 shadow-card">
            <legend className="px-1 text-base font-semibold">{t("st.app")}</legend>
            <Select
              label={t("st.language")}
              value={p.language}
              onChange={(e) => setP({ ...p, language: e.target.value })}
              options={LANGUAGES}
              hint={t("st.langHint")}
            />
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-semibold">{t("st.courts")}</legend>
              <div className="flex flex-wrap gap-2">
                {COURT_LEVELS.map(([v, label]) => (
                  <label key={v} className="flex min-h-11 flex-auto cursor-pointer items-center gap-2 whitespace-nowrap rounded-md border border-border px-3 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-subtle">
                    <input type="radio" name="court-level-default" value={v} checked={p.courtLevel === v} onChange={() => setP({ ...p, courtLevel: v })} className="h-4 w-4 accent-[var(--accent)]" />
                    {t(label)}
                  </label>
                ))}
              </div>
              <p className="text-sm text-text-muted">{t("st.courtsHint")}</p>
            </fieldset>
            <Select
              label={t("st.reminders")}
              value={String(p.reminderLeadDays)}
              onChange={(e) => setP({ ...p, reminderLeadDays: Number(e.target.value) })}
              options={LEAD}
              hint={t("st.remindersHint")}
            />
          </fieldset>

          <Button type="submit" size="lg" loading={busy}>
            {t("st.save")}
          </Button>
        </form>
      )}
    </Screen>
  );
}
