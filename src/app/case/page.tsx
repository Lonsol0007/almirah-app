"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Bookmark, BookmarkCheck, CalendarPlus, Copy, ExternalLink, FileText, FileX2, RefreshCw, Upload } from "lucide-react";
import { ErrorState } from "@/components/case-list";
import { Screen } from "@/components/screen";
import { UpgradeNotice } from "@/components/upgrade-notice";
import { Accordion } from "@/components/ui/accordion";
import { StatusBadge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { caseTitle } from "@/components/ui/case-card";
import { EmptyState } from "@/components/ui/empty-state";
import { KeyValueList } from "@/components/ui/key-value";
import { SkeletonCard } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { DataError, data } from "@/lib/data";
import { formatDate, formatInstant, hearingTone } from "@/lib/dates";
import { hearingText, usePrefs } from "@/lib/i18n/prefs";
import type { CourtCase } from "@/lib/types";
import { E_JAGRITI_URL, caseRef, isConsumerRef } from "@/lib/consumer";
import { googleCalendarUrl } from "@/lib/google-calendar";
import { caseHref, hearingHref } from "@/lib/routes";
import { useAsync } from "@/lib/use-async";

function Nothing() {
  const { t } = usePrefs();
  return <p className="text-sm text-text-muted">{t("common.nothingRecorded")}</p>;
}

function summaryText(c: CourtCase, court: string) {
  const lines = [
    caseTitle(c),
    `${c.caseType ?? "Case"} ${c.registrationNumber ?? ""}`.trim(),
    isConsumerRef(c.cnr) ? "Filed on e-Jagriti" : `CNR: ${c.cnr}`,
    court && `Court: ${court}${c.courtNo ? `, Court no. ${c.courtNo}` : ""}`,
    c.status === "disposed"
      ? `Disposed${c.natureOfDisposal ? `: ${c.natureOfDisposal}` : ""}`
      : `Next hearing: ${c.nextHearingDate ? formatDate(c.nextHearingDate) : "not set"}`,
    c.stage && `Stage: ${c.stage}`,
  ];
  return lines.filter(Boolean).join("\n");
}

export default function CaseDetailPage() {
  return (
    <Suspense>
      <CaseDetail />
    </Suspense>
  );
}

function CaseDetail() {
  const id = useSearchParams().get("id") ?? "";
  const toast = useToast();
  const { t } = usePrefs();
  const [state, reload] = useAsync(() => data.getCase(id), [id]);
  // On screen: the loaded case, replaced by the result of anything done on this page.
  const [edited, setC] = useState<CourtCase | null>(null);
  const c = edited?.id === id ? edited : state.status === "ready" ? state.data : null;
  const [court, setCourt] = useState("");
  const [busy, setBusy] = useState<"save" | "refresh" | "upload" | null>(null);
  const [limit, setLimit] = useState<string>();
  const [linked, setLinked] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!c?.establishmentId) return;
    data.localityPath(c.establishmentId).then((p) => setCourt([p.establishment, p.complex].filter(Boolean).join(", ")));
  }, [c?.establishmentId]);

  useEffect(() => {
    // Transferred cases link to their other number when we hold a record of it.
    c?.transfers.forEach((tr) => {
      const other = tr.oldRef === c.cnr ? tr.newRef : tr.oldRef;
      data.findByCnr(other).then((hit) => hit && setLinked((m) => ({ ...m, [other]: hit.id }))).catch(() => {});
    });
  }, [c]);

  if (state.status === "loading") {
    return (
      <Screen title={t("case.fallbackTitle")} backHref="/my-cases">
        <SkeletonCard />
        <SkeletonCard />
      </Screen>
    );
  }
  if (state.status === "error") {
    return (
      <Screen title={t("case.fallbackTitle")} backHref="/my-cases">
        <ErrorState error={state.error} onRetry={reload} />
      </Screen>
    );
  }
  if (!c) {
    return (
      <Screen title={t("case.fallbackTitle")} backHref="/my-cases">
        <EmptyState
          icon={<FileX2 size={40} />}
          title={t("case.notFound")}
          body={t("case.notFoundBody")}
          action={<Link href="/search" className="text-sm font-semibold text-accent hover:underline">{t("case.searchForIt")}</Link>}
        />
      </Screen>
    );
  }

  const title = caseTitle(c);
  const tone = c.status === "disposed" ? "disposed" : hearingTone(c.nextHearingDate) ?? "pending";
  const petitioners = c.parties.filter((p) => p.role === "petitioner");
  const respondents = c.parties.filter((p) => p.role === "respondent");

  async function toggleSave() {
    if (!c) return;
    setBusy("save");
    try {
      const next = await data.setSaved(c.id, !c.saved);
      setC(next);
      setLimit(undefined);
      toast(next.saved ? t("toast.saved") : t("toast.removed"), "success");
    } catch (e) {
      if (e instanceof DataError && e.code === "limit") setLimit(e.message);
      else toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  async function refresh() {
    if (!c) return;
    setBusy("refresh");
    try {
      const r = await data.refreshCase(c.id);
      setC(r.case);
      toast(r.changed ? t("toast.updated") : t("toast.upToDate"), "success");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  async function copy() {
    if (!c) return;
    try {
      await navigator.clipboard.writeText(summaryText(c, court));
      toast(t("toast.copied"), "success");
    } catch {
      toast(t("toast.copyFailed"), "error");
    }
  }

  async function upload(file?: File) {
    if (!c || !file) return;
    setBusy("upload");
    try {
      await data.addOrder(c.id, file);
      setC(await data.getCase(c.id));
      toast(t("toast.orderAdded"), "success");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Screen
      title={c.caseType ?? t("case.fallbackTitle")}
      backHref="/my-cases"
      actions={
        <>
          <IconButton label={t("case.copy")} onClick={copy} variant="inverse">
            <Copy size={20} />
          </IconButton>
          <IconButton label={t("case.checkUpdates")} onClick={refresh} loading={busy === "refresh"} variant="inverse">
            <RefreshCw size={20} />
          </IconButton>
        </>
      }
    >
      <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface-raised p-4 shadow-card">
        <h2 className="break-words text-xl">{title}</h2>
        <p className="text-sm text-text-muted">
          {[c.caseType, c.registrationNumber].filter(Boolean).join(" ")}
          {court && <> · {court}</>}
          {c.courtNo && <> · {t("case.courtN", { n: c.courtNo })}</>}
        </p>
        <p className="font-mono text-sm text-text">{caseRef(c)}</p>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={tone}>{c.status === "disposed" ? t("common.disposed") : hearingText(t, c.nextHearingDate)}</StatusBadge>
          {c.stage && <StatusBadge tone="disposed">{c.stage}</StatusBadge>}
        </div>
        <Button
          variant={c.saved ? "secondary" : "primary"}
          onClick={toggleSave}
          loading={busy === "save"}
          icon={c.saved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
          aria-pressed={c.saved}
        >
          {c.saved ? t("case.inMyCases") : t("case.save")}
        </Button>
        {c.status === "pending" && (
          <Link
            href={hearingHref(c.id)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface-raised px-4 text-sm font-semibold text-text hover:bg-surface"
          >
            <CalendarPlus aria-hidden="true" size={18} />
            {t("case.record")}
          </Link>
        )}
        {c.status === "pending" && c.nextHearingDate && (
          <a
            href={googleCalendarUrl({
              title: `Hearing: ${caseTitle(c)}`,
              date: c.nextHearingDate,
              details: summaryText(c, court),
              location: court || undefined,
            })}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface-raised px-4 text-sm font-semibold text-text hover:bg-surface"
          >
            <CalendarPlus aria-hidden="true" size={18} />
            {t("case.addToGoogle")}
          </a>
        )}
        {isConsumerRef(c.cnr) && (
          // e-Jagriti has no public API: the advocate checks the portal and records the outcome here.
          <a
            href={E_JAGRITI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface-raised px-4 text-sm font-semibold text-text hover:bg-surface"
          >
            <ExternalLink aria-hidden="true" size={18} />
            {t("case.eJagriti")}
          </a>
        )}
        {limit && <UpgradeNotice message={limit} />}
        <p className="text-xs text-text-muted">{t("case.lastChecked", { when: formatInstant(c.updatedAt) })}</p>
      </section>

      <div className="overflow-hidden rounded-lg border border-border">
        <Accordion title={t("sec.details")} defaultOpen>
          <KeyValueList
            items={[
              { label: t("tab.caseType"), value: c.caseType },
              { label: t("tab.filingNumber"), value: c.filingNumber },
              { label: t("f.filingDate"), value: formatDate(c.filingDate) },
              { label: t("f.regNumber"), value: c.registrationNumber },
              { label: t("f.regDate"), value: formatDate(c.registrationDate) },
              { label: "CNR", value: isConsumerRef(c.cnr) ? undefined : <span className="font-mono">{c.cnr}</span> },
            ]}
          />
        </Accordion>

        <Accordion title={t("sec.status")} defaultOpen>
          <KeyValueList
            items={[
              { label: t("common.status"), value: c.status === "disposed" ? t("common.disposed") : t("common.pending") },
              { label: t("f.nextHearing"), value: c.status === "pending" ? formatDate(c.nextHearingDate) : undefined },
              { label: t("f.stage"), value: c.stage },
              { label: t("loc.court"), value: court },
              { label: t("f.courtJudge"), value: [c.courtNo && t("case.courtN", { n: c.courtNo }), c.judge].filter(Boolean).join(" · ") },
              { label: t("f.disposal"), value: c.natureOfDisposal },
            ]}
          />
        </Accordion>

        <Accordion title={t("sec.parties")} count={c.parties.length}>
          {c.parties.length === 0 ? (
            <Nothing />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                [t("f.petitioners"), petitioners],
                [t("f.respondents"), respondents],
              ].map(([heading, list]) => (
                <div key={heading as string}>
                  <h4 className="mb-2 text-xs font-medium text-text-muted">{heading as string}</h4>
                  <ol className="flex flex-col gap-2">
                    {(list as CourtCase["parties"]).map((p, i) => (
                      <li key={i} className="text-sm">
                        <span className="font-semibold text-text">{p.name}</span>
                        {p.advocateName && <span className="block text-text-muted">{t("f.advocate", { name: p.advocateName })}</span>}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          )}
        </Accordion>

        <Accordion title={t("sec.acts")} count={c.acts.length}>
          {c.acts.length === 0 ? (
            <Nothing />
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {c.acts.map((a, i) => (
                <li key={i}>
                  {a.actName}
                  {a.section && <span className="text-text-muted"> · {t("f.section", { s: a.section })}</span>}
                </li>
              ))}
            </ul>
          )}
        </Accordion>

        {c.fir && (
          <Accordion title={t("sec.fir")}>
            <KeyValueList
              items={[
                { label: t("field.policeStation"), value: c.fir.policeStation },
                { label: t("field.firNumber"), value: c.fir.firNumber },
                { label: t("common.year"), value: c.fir.firYear },
              ]}
            />
          </Accordion>
        )}

        <Accordion title={t("sec.history")} count={c.history.length}>
          {c.history.length === 0 ? (
            <Nothing />
          ) : (
            <div className="overflow-x-auto rounded-sm" tabIndex={0} role="region" aria-label={t("h.scroll")}>
              <table className="w-full min-w-[32rem] text-left text-sm">
                <caption className="sr-only">{t("sec.history")}</caption>
                <thead className="text-xs text-text-muted">
                  <tr>
                    <th scope="col" className="py-2 pr-3 font-medium">{t("h.businessOn")}</th>
                    <th scope="col" className="py-2 pr-3 font-medium">{t("h.nextDate")}</th>
                    <th scope="col" className="py-2 pr-3 font-medium">{t("h.purpose")}</th>
                    <th scope="col" className="py-2 font-medium">{t("h.judge")}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...c.history].reverse().map((h, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="py-2 pr-3">{formatDate(h.businessOn)}</td>
                      <td className="py-2 pr-3">{formatDate(h.hearingDate)}</td>
                      <td className="py-2 pr-3">{h.purpose}</td>
                      <td className="py-2 text-text-muted">{h.judge}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Accordion>

        <Accordion title={t("sec.orders")} count={c.orders.length}>
          <div className="flex flex-col gap-3">
            {c.orders.length === 0 ? (
              <Nothing />
            ) : (
              <ul className="flex flex-col gap-2">
                {c.orders.map((o) => (
                  <li key={o.id} className="flex items-center gap-3 text-sm">
                    <FileText aria-hidden="true" size={18} className="shrink-0 text-text-muted" />
                    {o.url ? (
                      <a href={o.url} target="_blank" rel="noopener" className="font-semibold text-accent hover:underline">
                        {t("o.order", { n: o.orderNumber ?? "", date: formatDate(o.orderDate) })}
                      </a>
                    ) : (
                      <span>
                        {t("o.order", { n: o.orderNumber ?? "", date: formatDate(o.orderDate) })}
                        <span className="text-text-muted">{t("o.noCopy")}</span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              hidden
              id="order-file"
              onChange={(e) => upload(e.target.files?.[0])}
            />
            <Button
              variant="secondary"
              size="sm"
              icon={<Upload size={16} />}
              loading={busy === "upload"}
              onClick={() => fileRef.current?.click()}
              className="self-start"
            >
              {t("o.attach")}
            </Button>
          </div>
        </Accordion>

        <Accordion title={t("sec.ias")} count={c.interimApps.length}>
          {c.interimApps.length === 0 ? (
            <Nothing />
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {c.interimApps.map((ia) => (
                <li key={ia.iaNumber}>
                  <span className="font-semibold">{ia.iaNumber}</span>
                  <span className="text-text-muted">
                    {" "}
                    · {ia.filedBy ?? "—"} · {ia.status === "disposed" ? t("common.disposed") : t("common.pending")}
                    {ia.filedOn && ` · ${t("f.filed", { date: formatDate(ia.filedOn) })}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Accordion>

        <Accordion title={t("sec.transfers")} count={c.transfers.length}>
          {c.transfers.length === 0 ? (
            <Nothing />
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {c.transfers.map((tr, i) => {
                const other = tr.oldRef === c.cnr ? tr.newRef : tr.oldRef;
                return (
                  <li key={i}>
                    {t("t.line", { old: tr.oldRef, new: tr.newRef })}
                    {tr.transferDate && <span className="text-text-muted"> · {formatDate(tr.transferDate)}</span>}
                    {linked[other] && (
                      <Link href={caseHref(linked[other])} className="ml-2 font-semibold text-accent hover:underline">
                        {other === tr.oldRef ? t("t.openEarlier") : t("t.openCurrent")}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Accordion>
      </div>
    </Screen>
  );
}
