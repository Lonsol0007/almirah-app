"use client";

import type { ReactNode } from "react";
import { AlertTriangle, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CaseCard } from "@/components/ui/case-card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/spinner";
import type { AsyncState } from "@/lib/use-async";
import type { CourtCase } from "@/lib/types";
import { usePrefs } from "@/lib/i18n/prefs";

export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const { t } = usePrefs();
  return (
    <EmptyState
      icon={<AlertTriangle size={40} />}
      title={t("common.loadFailed")}
      body={error.message}
      action={onRetry && <Button variant="secondary" onClick={onRetry}>{t("common.tryAgain")}</Button>}
    />
  );
}

export function CaseList({
  state,
  onRetry,
  empty,
  actions,
  label,
}: {
  state: AsyncState<CourtCase[]>;
  onRetry?: () => void;
  empty?: ReactNode;
  actions?: (c: CourtCase) => ReactNode;
  label: string;
}) {
  const { t } = usePrefs();
  if (state.status === "loading") {
    return (
      <div className="flex flex-col gap-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }
  if (state.status === "error") return <ErrorState error={state.error} onRetry={onRetry} />;
  if (state.data.length === 0) {
    return <>{empty ?? <EmptyState icon={<SearchX size={40} />} title={t("list.noneFound")} body={t("list.noneFoundBody")} />}</>;
  }
  return (
    <ul aria-label={label} className="flex flex-col gap-3">
      {state.data.map((c) => (
        <li key={c.id}>
          <CaseCard c={c} actions={actions?.(c)} />
        </li>
      ))}
    </ul>
  );
}
