"use client";

import Link from "next/link";
import { CalendarCheck, FilePlus2, ListChecks, Menu, Search, ShieldCheck } from "lucide-react";
import { CaseList } from "@/components/case-list";
import { CnrForm } from "@/components/cnr-form";
import { Screen } from "@/components/screen";
import { EmptyState } from "@/components/ui/empty-state";
import { data } from "@/lib/data";
import { formatDate, todayIST } from "@/lib/dates";
import { BRAND } from "@/lib/brand";
import { useAsync } from "@/lib/use-async";
import { usePrefs } from "@/lib/i18n/prefs";

const TILES = [
  { href: "/search", label: "home.searchCases", icon: Search },
  { href: "/cases/new", label: "home.addCase", icon: FilePlus2 },
  { href: "/cause-list", label: "nav.causeList", icon: ListChecks },
  { href: "/my-cases/backup", label: "home.backUp", icon: ShieldCheck },
] as const;

export default function Home() {
  const today = todayIST();
  const { t } = usePrefs();
  const [hearings, reload] = useAsync(() => data.casesOn(today), [today]);

  return (
    <Screen
      title={BRAND.name}
      actions={
        <Link
          href="/more"
          aria-label={t("common.more")}
          className="inline-flex h-11 w-11 items-center justify-center rounded-pill hover:bg-on-accent/10"
        >
          <Menu aria-hidden="true" size={22} />
        </Link>
      }
    >
      <section aria-labelledby="find" className="rounded-lg border border-border bg-surface-raised p-4 shadow-card">
        <h2 id="find" className="mb-3 text-lg">
          {t("home.findCase")}
        </h2>
        <CnrForm compact />
      </section>

      <nav aria-label={t("home.shortcuts")} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TILES.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-start gap-2 rounded-lg border border-border bg-surface-raised p-4 text-sm font-semibold text-text shadow-card hover:bg-surface"
          >
            <Icon aria-hidden="true" size={22} className="text-accent" />
            {t(label)}
          </Link>
        ))}
      </nav>

      <section aria-labelledby="today" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 id="today" className="text-lg">
            {t("home.todaysHearings")}
          </h2>
          <span className="text-sm text-text-muted">{formatDate(today)}</span>
        </div>
        <CaseList
          label="Today's hearings"
          state={hearings}
          onRetry={reload}
          empty={
            <EmptyState
              icon={<CalendarCheck size={40} />}
              title={t("home.noHearings")}
              body={t("home.noHearingsBody")}
              action={
                <Link href="/calendar" className="text-sm font-semibold text-accent underline-offset-4 hover:underline">
                  {t("home.openCalendar")}
                </Link>
              }
            />
          }
        />
      </section>
    </Screen>
  );
}
