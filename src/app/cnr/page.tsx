"use client";

import { CnrForm } from "@/components/cnr-form";
import { Screen } from "@/components/screen";
import { usePrefs } from "@/lib/i18n/prefs";

export default function CnrPage() {
  const { t } = usePrefs();
  return (
    <Screen title={t("cnr.title")}>
      <section className="rounded-lg border border-border bg-surface-raised p-4 shadow-card">
        <CnrForm />
      </section>
      <section className="flex flex-col gap-2 text-sm text-text-muted">
        <h2 className="text-base font-semibold text-text">{t("cnr.whereTitle")}</h2>
        <p>{t("cnr.where1")}</p>
        <p>{t("cnr.where2")}</p>
      </section>
    </Screen>
  );
}
