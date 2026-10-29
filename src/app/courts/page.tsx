"use client";

import { useMemo, useState } from "react";
import { MapPin, SearchX } from "lucide-react";
import { ErrorState } from "@/components/case-list";
import { Screen } from "@/components/screen";
import { EmptyState } from "@/components/ui/empty-state";
import { TextField } from "@/components/ui/field";
import { SkeletonCard } from "@/components/ui/spinner";
import { data } from "@/lib/data";
import { useAsync } from "@/lib/use-async";
import { usePrefs } from "@/lib/i18n/prefs";

export default function CourtsPage() {
  const { t } = usePrefs();
  const [q, setQ] = useState("");
  const [state, reload] = useAsync(async () => {
    const [complexes, districts, states] = await Promise.all([
      data.locality("complex"),
      data.locality("district"),
      data.locality("state"),
    ]);
    // High Court benches and consumer commissions are listed alongside district court complexes.
    const benches = (
      await Promise.all(states.flatMap((s) => [data.highCourtBenches(s.id), data.consumerCommissions(s.id)]))
    ).flat();
    return [...complexes, ...benches].map((c) => {
      const d = districts.find((x) => x.id === c.parentId);
      const s = states.find((x) => x.id === d?.parentId);
      return { ...c, district: d?.name ?? "", state: s?.name ?? "" };
    });
  }, []);

  const list = useMemo(() => {
    if (state.status !== "ready") return [];
    const n = q.trim().toLowerCase();
    return n ? state.data.filter((c) => [c.name, c.district, c.state].some((s) => s.toLowerCase().includes(n))) : state.data;
  }, [state, q]);

  return (
    <Screen title={t("ct.title")} backHref="/more">
      <TextField label={t("ct.search")} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("ct.placeholder")} />
      {state.status === "loading" && <SkeletonCard />}
      {state.status === "error" && <ErrorState error={state.error} onRetry={reload} />}
      {state.status === "ready" &&
        (list.length === 0 ? (
          <EmptyState icon={<SearchX size={40} />} title={t("ct.none")} body={t("ct.noneBody")} />
        ) : (
          <ul aria-label={t("ct.list")} className="flex flex-col gap-3">
            {list.map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface-raised p-4 shadow-card">
                <MapPin aria-hidden="true" size={22} className="shrink-0 text-accent" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-sm text-text-muted">
                    {c.district}, {c.state}
                  </p>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c.name}, ${c.state}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-sm font-semibold text-accent hover:underline"
                >
                  {t("ct.directions")}<span className="sr-only"> {t("ct.directionsTo", { name: c.name })}</span>
                </a>
              </li>
            ))}
          </ul>
        ))}
    </Screen>
  );
}
