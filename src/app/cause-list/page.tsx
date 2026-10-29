"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { CalendarX2 } from "lucide-react";
import { CaseList } from "@/components/case-list";
import { LocalityCascade, type LocalityValue } from "@/components/locality-cascade";
import { Screen } from "@/components/screen";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DateField, TextField } from "@/components/ui/field";
import { Tabs } from "@/components/ui/tabs";
import { data } from "@/lib/data";
import { formatDate, todayIST } from "@/lib/dates";
import type { CourtCase } from "@/lib/types";
import type { AsyncState } from "@/lib/use-async";
import { usePrefs } from "@/lib/i18n/prefs";

type Mode = "court" | "advocate";

function CauseList() {
  const params = useSearchParams();
  const { t } = usePrefs();
  const [mode, setMode] = useState<Mode>(params.get("tab") === "advocate" ? "advocate" : "court");
  const [where, setWhere] = useState<LocalityValue>({});
  const [date, setDate] = useState(todayIST());
  const [advocate, setAdvocate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<AsyncState<CourtCase[]> | null>(null);
  const [heading, setHeading] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (mode === "court" && !where.establishmentId) errs.establishmentId = t("err.chooseCourt");
    if (mode === "advocate" && !where.complexId) errs.complexId = t("err.chooseComplex");
    if (mode === "advocate" && advocate.trim().length < 3) errs.advocate = t("err.advocate3");
    if (!date) errs.date = t("err.chooseDate");
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setResult({ status: "loading" });
    try {
      const list =
        mode === "court"
          ? await data.causeList(where.establishmentId!, date)
          : await data.dateCaseList({ complexId: where.complexId!, date, advocate });
      const path = await (mode === "court" && where.establishmentId ? data.localityPath(where.establishmentId) : Promise.resolve(null));
      setHeading(
        mode === "court"
          ? `${path?.establishment ?? t("loc.court")} · ${formatDate(date)}`
          : `${advocate.trim()} · ${formatDate(date)}`,
      );
      setResult({ status: "ready", data: list });
    } catch (err) {
      setResult({ status: "error", error: err as Error });
    }
  }

  return (
    <>
      <Tabs
        label={t("cl.listBy")}
        value={mode}
        onChange={(m) => {
          setMode(m as Mode);
          setResult(null);
          setErrors({});
        }}
        items={[
          { id: "court", label: t("cl.oneCourt") },
          { id: "advocate", label: t("cl.advocateComplex") },
        ]}
      >
        <form method="post" onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-lg border border-border bg-surface-raised p-4 shadow-card">
          <LocalityCascade
            value={where}
            onChange={setWhere}
            depth={mode === "court" ? "establishment" : "complex"}
            errors={{ establishmentId: errors.establishmentId, complexId: errors.complexId }}
          />
          {mode === "advocate" && (
            <TextField
              label={t("cl.advocateField")}
              value={advocate}
              onChange={(e) => setAdvocate(e.target.value)}
              autoComplete="off"
              error={errors.advocate}
            />
          )}
          <DateField label={t("common.date")} value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} />
          <Button type="submit" size="lg" loading={result?.status === "loading"}>
            {t("cl.show")}
          </Button>
        </form>
      </Tabs>

      {result && (
        <section aria-labelledby="list-h" className="flex flex-col gap-3">
          <h2 id="list-h" className="text-lg">
            {result.status === "ready" ? heading : t("cl.loading")}
          </h2>
          <CaseList
            label={t("cl.listed")}
            state={result}
            empty={
              <EmptyState
                icon={<CalendarX2 size={40} />}
                title={t("cl.nothing")}
                body={t("cl.nothingBody")}
              />
            }
          />
        </section>
      )}
    </>
  );
}

export default function CauseListPage() {
  const { t } = usePrefs();
  return (
    <Screen title={t("nav.causeList")}>
      <Suspense>
        <CauseList />
      </Suspense>
    </Screen>
  );
}
