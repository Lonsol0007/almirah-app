"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { CaseList } from "@/components/case-list";
import { LocalityCascade, levelOf, type LocalityValue } from "@/components/locality-cascade";
import { usePrefs } from "@/lib/i18n/prefs";
import type { MessageKey } from "@/lib/i18n/messages";
import { Screen } from "@/components/screen";
import { Button } from "@/components/ui/button";
import { Select, TextField } from "@/components/ui/field";
import { Tabs } from "@/components/ui/tabs";
import { data, type SearchCriteria } from "@/lib/data";
import type { CourtCase } from "@/lib/types";
import type { AsyncState } from "@/lib/use-async";
import { useAsync } from "@/lib/use-async";

type Kind = SearchCriteria["kind"];

const TABS: Array<{ id: Kind; label: MessageKey }> = [
  { id: "caseNumber", label: "tab.caseNumber" },
  { id: "party", label: "tab.party" },
  { id: "advocate", label: "tab.advocate" },
  { id: "fir", label: "tab.fir" },
  { id: "filingNumber", label: "tab.filingNumber" },
  { id: "caseType", label: "tab.caseType" },
  { id: "act", label: "tab.act" },
];

const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 30 }, (_, i) => String(THIS_YEAR - i)).map((y) => ({ value: y, label: y }));

type Errors = Record<string, string>;

function req(errors: Errors, key: string, value: string | undefined, message: string) {
  if (!value || !value.trim()) errors[key] = message;
}

export default function SearchPage() {
  const [kind, setKind] = useState<Kind>("caseNumber");
  const [where, setWhere] = useState<LocalityValue>({});
  const [errors, setErrors] = useState<Errors>({});
  const [results, setResults] = useState<AsyncState<CourtCase[]> | null>(null);
  const [lastCriteria, setLastCriteria] = useState<SearchCriteria | null>(null);
  const { courtLevel, t } = usePrefs();
  const STATUS = [
    { value: "pending", label: t("common.pending") },
    { value: "disposed", label: t("common.disposed") },
  ];
  const level = levelOf(where, courtLevel);
  const [types] = useAsync(() => data.caseTypes(level), [level]);
  const [acts] = useAsync(() => data.acts(), []);
  const [advMode, setAdvMode] = useState<"name" | "bar">("name");
  const resultsRef = useRef<HTMLHeadingElement>(null);

  function switchKind(k: string) {
    setKind(k as Kind);
    setErrors({});
    setResults(null);
  }

  async function run(criteria: SearchCriteria) {
    setLastCriteria(criteria);
    setResults({ status: "loading" });
    requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    try {
      setResults({ status: "ready", data: await data.search(criteria) });
    } catch (e) {
      setResults({ status: "error", error: e as Error });
    }
    resultsRef.current?.focus();
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "").trim();
    const status = (v("status") || undefined) as "pending" | "disposed" | undefined;
    const errs: Errors = {};
    let criteria: SearchCriteria | null = null;

    switch (kind) {
      case "caseNumber":
        req(errs, "establishmentId", where.establishmentId, t("err.chooseCourt"));
        req(errs, "caseType", v("caseType"), t("err.chooseCaseType"));
        if (!/^\d+$/.test(v("number"))) errs.number = t("err.caseNumberDigits");
        req(errs, "year", v("year"), t("err.chooseYear"));
        criteria = { kind, establishmentId: where.establishmentId!, caseType: v("caseType"), number: v("number"), year: v("year") };
        break;
      case "filingNumber":
        req(errs, "establishmentId", where.establishmentId, t("err.chooseCourt"));
        if (!/^\d+$/.test(v("number"))) errs.number = t("err.filingDigits");
        req(errs, "year", v("year"), t("err.chooseYear"));
        criteria = { kind, establishmentId: where.establishmentId!, number: v("number"), year: v("year") };
        break;
      case "fir":
        req(errs, "districtId", where.districtId, t("err.chooseDistrict"));
        req(errs, "policeStation", v("policeStation"), t("err.policeStation"));
        if (!/^\d+$/.test(v("firNumber"))) errs.firNumber = t("err.firDigits");
        criteria = { kind, districtId: where.districtId!, policeStation: v("policeStation"), firNumber: v("firNumber"), year: v("year") || undefined };
        break;
      case "advocate":
        if (advMode === "name") {
          if (v("name").length < 3) errs.name = t("err.name3");
          criteria = { kind, complexId: where.complexId, name: v("name"), status };
        } else {
          req(errs, "barCode", v("barCode"), t("err.barCode"));
          criteria = { kind, complexId: where.complexId, barCode: v("barCode"), status };
        }
        break;
      case "party":
        if (v("name").length < 3) errs.name = t("err.name3");
        criteria = { kind, complexId: where.complexId, name: v("name"), year: v("year") || undefined, status };
        break;
      case "caseType":
        req(errs, "establishmentId", where.establishmentId, t("err.chooseCourt"));
        req(errs, "caseType", v("caseType"), t("err.chooseCaseType"));
        criteria = { kind, establishmentId: where.establishmentId!, caseType: v("caseType"), year: v("year") || undefined, status };
        break;
      case "act":
        req(errs, "act", v("act"), t("err.chooseAct"));
        criteria = { kind, complexId: where.complexId, act: v("act"), section: v("section") || undefined, status };
        break;
    }

    setErrors(errs);
    if (Object.keys(errs).length) {
      const form = e.currentTarget;
      requestAnimationFrame(() => form.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
      return;
    }
    if (criteria) run(criteria);
  }

  const depth = kind === "fir" ? "district" : ["caseNumber", "filingNumber", "caseType"].includes(kind) ? "establishment" : "complex";
  const localityOptional = ["advocate", "party", "act"].includes(kind);
  const typeOptions = (types.data ?? []).map((ty) => ({ value: ty, label: ty }));

  const fields: Record<Kind, ReactNode> = {
    caseNumber: (
      <>
        <Select name="caseType" label={t("tab.caseType")} placeholder={t("field.chooseCaseType")} options={typeOptions} error={errors.caseType} />
        <div className="grid grid-cols-2 gap-4">
          <TextField name="number" label={t("tab.caseNumber")} inputMode="numeric" error={errors.number} />
          <Select name="year" label={t("common.year")} placeholder={t("common.year")} options={YEARS} error={errors.year} />
        </div>
      </>
    ),
    filingNumber: (
      <div className="grid grid-cols-2 gap-4">
        <TextField name="number" label={t("tab.filingNumber")} inputMode="numeric" error={errors.number} />
        <Select name="year" label={t("common.year")} placeholder={t("common.year")} options={YEARS} error={errors.year} />
      </div>
    ),
    fir: (
      <>
        <TextField name="policeStation" label={t("field.policeStation")} error={errors.policeStation} />
        <div className="grid grid-cols-2 gap-4">
          <TextField name="firNumber" label={t("field.firNumber")} inputMode="numeric" error={errors.firNumber} />
          <Select name="year" label={t("common.yearOptional")} placeholder={t("common.anyYear")} options={YEARS} />
        </div>
      </>
    ),
    advocate: (
      <>
        <Tabs
          variant="underline"
          label={t("search.findAdvocateBy")}
          value={advMode}
          onChange={(m) => setAdvMode(m as "name" | "bar")}
          items={[
            { id: "name", label: t("tab.byName") },
            { id: "bar", label: t("tab.byBar") },
          ]}
        >
          {advMode === "name" ? (
            <TextField name="name" label={t("field.advocateName")} autoComplete="off" error={errors.name} />
          ) : (
            <TextField name="barCode" label={t("field.barReg")} placeholder="e.g. MAH/1876/2009" autoComplete="off" error={errors.barCode} />
          )}
        </Tabs>
        <Select name="status" label={t("common.status")} placeholder={t("common.pendingAndDisposed")} options={STATUS} />
        <p className="text-sm text-text-muted">
          {t("search.dayListHint")}{" "}
          <Link href="/cause-list?tab=advocate" className="font-semibold text-accent hover:underline">
            {t("search.dayListLink")}
          </Link>
        </p>
      </>
    ),
    party: (
      <>
        <TextField name="name" label={t("field.partyName")} autoComplete="off" error={errors.name} />
        <div className="grid grid-cols-2 gap-4">
          <Select name="year" label={t("common.yearOptional")} placeholder={t("common.anyYear")} options={YEARS} />
          <Select name="status" label={t("common.status")} placeholder={t("common.any")} options={STATUS} />
        </div>
      </>
    ),
    caseType: (
      <>
        <Select name="caseType" label={t("tab.caseType")} placeholder={t("field.chooseCaseType")} options={typeOptions} error={errors.caseType} />
        <div className="grid grid-cols-2 gap-4">
          <Select name="year" label={t("common.yearOptional")} placeholder="Any year" options={YEARS} />
          <Select name="status" label={t("common.status")} placeholder={t("common.any")} options={STATUS} />
        </div>
      </>
    ),
    act: (
      <>
        <Select name="act" label={t("tab.act")} placeholder={t("field.chooseAct")} options={(acts.data ?? []).map((a) => ({ value: a, label: a }))} error={errors.act} />
        <div className="grid grid-cols-2 gap-4">
          <TextField name="section" label={t("field.section")} />
          <Select name="status" label={t("common.status")} placeholder={t("common.any")} options={STATUS} />
        </div>
      </>
    ),
  };

  return (
    <Screen title={t("search.title")}>
      <Tabs label={t("search.by")} value={kind} onChange={switchKind} items={TABS.map((x) => ({ id: x.id, label: t(x.label) }))}>
        <form key={kind} method="post" onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-lg border border-border bg-surface-raised p-4 shadow-card">
          <LocalityCascade
            value={where}
            onChange={setWhere}
            depth={depth}
            errors={{ establishmentId: errors.establishmentId, districtId: errors.districtId }}
          />
          {localityOptional && <p className="-mt-2 text-xs text-text-muted">{t("loc.optional")}</p>}
          {fields[kind]}
          <Button type="submit" size="lg" loading={results?.status === "loading"}>
            {t("search.button")}
          </Button>
        </form>
      </Tabs>

      <section aria-labelledby="results-h" className={results ? "flex flex-col gap-3" : "sr-only"}>
        <h2 id="results-h" ref={resultsRef} tabIndex={-1} className="scroll-mt-20 text-lg">
          {results?.status === "ready"
            ? results.data.length === 1
              ? t("search.resultOne")
              : t("search.resultMany", { n: results.data.length })
            : results?.status === "loading"
              ? t("search.searching")
              : t("search.results")}
        </h2>
        {results && (
          <>
            <p className="text-xs text-text-muted">{t("search.demoNote")}</p>
            <CaseList label="Search results" state={results} onRetry={() => lastCriteria && run(lastCriteria)} />
          </>
        )}
      </section>
    </Screen>
  );
}
