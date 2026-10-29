"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Briefcase, FilePlus2, RefreshCw, Search, ShieldCheck, Trash2 } from "lucide-react";
import { ErrorState } from "@/components/case-list";
import { Screen } from "@/components/screen";
import { Button, IconButton } from "@/components/ui/button";
import { CaseCard, caseTitle } from "@/components/ui/case-card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { TextField } from "@/components/ui/field";
import { SkeletonCard } from "@/components/ui/spinner";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { data } from "@/lib/data";
import { daysUntil, todayIST } from "@/lib/dates";
import type { CourtCase } from "@/lib/types";
import { useAsync } from "@/lib/use-async";
import { usePrefs } from "@/lib/i18n/prefs";
import type { MessageKey } from "@/lib/i18n/messages";

type View = "date" | "court";

function dateBucket(c: CourtCase, today: string): MessageKey {
  if (c.status === "disposed") return "common.disposed";
  if (!c.nextHearingDate) return "hearing.none";
  const d = daysUntil(c.nextHearingDate, today);
  if (d < 0) return "mc.gPassed";
  if (d === 0) return "common.today";
  if (d <= 7) return "mc.gWeek";
  if (c.nextHearingDate.slice(0, 7) === today.slice(0, 7)) return "mc.gMonth";
  return "mc.gLater";
}

const DATE_ORDER: string[] = ["mc.gPassed", "common.today", "mc.gWeek", "mc.gMonth", "mc.gLater", "hearing.none", "common.disposed"];
const NO_COURT = "\u0000no-court";

export default function MyCasesPage() {
  const toast = useToast();
  const { t } = usePrefs();
  const today = todayIST();
  const [state, reload] = useAsync(() => data.listSaved(), []);
  const [view, setView] = useState<View>("date");
  const [q, setQ] = useState("");
  const [courts, setCourts] = useState<Record<string, string>>({});
  const [removing, setRemoving] = useState<CourtCase | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (state.status !== "ready") return;
    const ids = [...new Set(state.data.map((c) => c.establishmentId).filter(Boolean) as string[])];
    Promise.all(ids.map(async (id) => [id, await data.localityPath(id)] as const)).then((pairs) =>
      setCourts(Object.fromEntries(pairs.map(([id, p]) => [id, [p.establishment, p.complex].filter(Boolean).join(", ")]))),
    );
  }, [state]);

  const groups = useMemo(() => {
    if (state.status !== "ready") return [];
    const needle = q.trim().toLowerCase();
    const list = needle
      ? state.data.filter((c) =>
          [caseTitle(c), c.cnr, c.registrationNumber, c.caseType, ...c.parties.flatMap((p) => [p.name, p.advocateName])]
            .filter(Boolean)
            .some((s) => s!.toLowerCase().includes(needle)),
        )
      : state.data;
    const map = new Map<string, CourtCase[]>();
    for (const c of list) {
      const key = view === "date" ? dateBucket(c, today) : (c.establishmentId && courts[c.establishmentId]) || NO_COURT;
      map.set(key, [...(map.get(key) ?? []), c]);
    }
    const keys = [...map.keys()].sort((a, b) =>
      view === "date" ? DATE_ORDER.indexOf(a) - DATE_ORDER.indexOf(b) : a.localeCompare(b),
    );
    const label = (k: string) => (view === "date" ? t(k as MessageKey) : k === NO_COURT ? t("mc.gCourtNotSet") : k);
    return keys.map((k) => ({ key: k, label: label(k), cases: map.get(k)! }));
  }, [state, q, view, courts, today, t]);

  async function refreshAll() {
    if (state.status !== "ready") return;
    setRefreshing(true);
    try {
      const results = await Promise.all(state.data.map((c) => data.refreshCase(c.id)));
      const changed = results.filter((r) => r.changed).length;
      toast(changed ? t("mc.nUpdated", { n: changed }) : t("mc.allUpToDate"), "success");
      reload();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setRefreshing(false);
    }
  }

  async function confirmRemove() {
    if (!removing) return;
    const c = removing;
    setRemoving(null);
    try {
      await data.setSaved(c.id, false);
      toast(t("toast.removed"), "success");
      reload();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  const total = state.status === "ready" ? state.data.length : 0;
  const shown = groups.reduce((n, g) => n + g.cases.length, 0);

  return (
    <Screen
      title={t("nav.myCases")}
      actions={
        <>
          <IconButton label={t("mc.checkAll")} variant="inverse" onClick={refreshAll} loading={refreshing} disabled={!total}>
            <RefreshCw size={20} />
          </IconButton>
          <Link
            href="/my-cases/backup"
            aria-label={t("mc.backup")}
            className="inline-flex h-11 w-11 items-center justify-center rounded-pill hover:bg-on-accent/10"
          >
            <ShieldCheck aria-hidden="true" size={22} />
          </Link>
        </>
      }
    >
      {state.status === "loading" && (
        <div className="flex flex-col gap-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}
      {state.status === "error" && <ErrorState error={state.error} onRetry={reload} />}

      {state.status === "ready" && total === 0 && (
        <EmptyState
          icon={<Briefcase size={40} />}
          title={t("mc.empty")}
          body={t("mc.emptyBody")}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/cases/new" className="inline-flex h-10 items-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-on-accent">
                <FilePlus2 aria-hidden="true" size={18} />
                {t("home.addCase")}
              </Link>
              <Link href="/search" className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface-raised px-4 text-sm font-semibold text-text">
                <Search aria-hidden="true" size={18} />
                {t("nav.search")}
              </Link>
            </div>
          }
        />
      )}

      {state.status === "ready" && total > 0 && (
        <>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <TextField
                label={t("mc.search")}
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("mc.searchPlaceholder")}
              />
            </div>
            <Link
              href="/cases/new"
              aria-label={t("home.addCase")}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-accent text-on-accent"
            >
              <FilePlus2 aria-hidden="true" size={20} />
            </Link>
          </div>

          <Tabs
            label={t("mc.groupBy")}
            value={view}
            onChange={(v) => setView(v as View)}
            items={[
              { id: "date", label: t("mc.byDate") },
              { id: "court", label: t("mc.byCourt") },
            ]}
          >
            <p className="sr-only" aria-live="polite">
              {t("mc.showing", { shown, total })}
            </p>
            {shown === 0 ? (
              <EmptyState icon={<Search size={40} />} title={t("mc.noMatches")} body={t("mc.noMatchesBody", { q })} action={<Button variant="secondary" onClick={() => setQ("")}>{t("mc.clear")}</Button>} />
            ) : (
              <div className="flex flex-col gap-6">
                {groups.map((g, gi) => (
                  <section key={g.key} aria-labelledby={`group-${gi}`}>
                    <h2 id={`group-${gi}`} className="mb-2 text-sm font-semibold text-text-muted">
                      {g.label} <span className="font-normal">({g.cases.length})</span>
                    </h2>
                    <ul className="flex flex-col gap-3">
                      {g.cases.map((c) => (
                        <li key={c.id}>
                          <CaseCard
                            c={c}
                            actions={
                              <IconButton label={t("mc.removeLabel", { title: caseTitle(c) })} onClick={() => setRemoving(c)}>
                                <Trash2 size={20} />
                              </IconButton>
                            }
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </Tabs>
        </>
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        title={t("mc.confirmTitle")}
        body={t("mc.confirmBody", { title: removing ? caseTitle(removing) : "" })}
        confirmLabel={t("common.remove")}
        destructive
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
      />
    </Screen>
  );
}
