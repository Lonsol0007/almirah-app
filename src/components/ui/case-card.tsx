"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { CourtCase } from "@/lib/types";
import { hearingTone } from "@/lib/dates";
import { hearingText, usePrefs } from "@/lib/i18n/prefs";
import { StatusBadge } from "./badge";

export function caseTitle(c: CourtCase) {
  const pet = c.parties.find((p) => p.role === "petitioner")?.name;
  const res = c.parties.find((p) => p.role === "respondent")?.name;
  if (c.label) return c.label;
  if (pet && res) return `${pet} vs ${res}`;
  return pet ?? res ?? c.cnr;
}

export function CaseCard({ c, actions }: { c: CourtCase; actions?: ReactNode }) {
  const { t } = usePrefs();
  const title = caseTitle(c);
  const tone = c.status === "disposed" ? "disposed" : hearingTone(c.nextHearingDate) ?? "pending";
  const chip = c.status === "disposed" ? t("common.disposed") : hearingText(t, c.nextHearingDate);
  return (
    <article className="flex items-start gap-2 rounded-lg border border-border bg-surface-raised shadow-card">
      <Link
        href={`/cases/${c.id}`}
        className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-lg p-4 hover:bg-surface"
        aria-label={`${title}, ${[c.caseType, c.registrationNumber].filter(Boolean).join(" ")}, ${chip}`}
      >
        <span className="truncate text-base font-semibold text-text">{title}</span>
        <span className="text-sm text-text-muted">
          {[c.caseType, c.registrationNumber].filter(Boolean).join(" ")}
          {c.courtNo ? ` · ${t("case.courtN", { n: c.courtNo })}` : ""}
        </span>
        <span className="font-mono text-xs text-text-muted">{c.cnr}</span>
        <span className="mt-1">
          <StatusBadge tone={tone}>{chip}</StatusBadge>
        </span>
      </Link>
      {actions && <div className="flex shrink-0 flex-col p-1.5">{actions}</div>}
    </article>
  );
}
