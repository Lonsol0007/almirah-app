"use client";

import { useState } from "react";
import { CalendarCheck } from "lucide-react";
import { CaseList } from "@/components/case-list";
import { Screen } from "@/components/screen";
import { CalendarGrid } from "@/components/ui/calendar-grid";
import { EmptyState } from "@/components/ui/empty-state";
import { data } from "@/lib/data";
import { formatDate, todayIST } from "@/lib/dates";
import { useAsync } from "@/lib/use-async";
import { usePrefs } from "@/lib/i18n/prefs";

export default function CalendarPage() {
  const today = todayIST();
  const { t } = usePrefs();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [day, setDay] = useState(today);
  const [counts] = useAsync(() => data.calendarCounts(month), [month]);
  const [cases, reload] = useAsync(() => data.casesOn(day), [day]);

  return (
    <Screen title={t("nav.calendar")}>
      <CalendarGrid
        month={month}
        onMonthChange={setMonth}
        selected={day}
        onSelect={(d) => {
          setDay(d);
          if (!d.startsWith(month)) setMonth(d.slice(0, 7));
        }}
        counts={counts.data ?? {}}
      />
      <section aria-labelledby="day-h" className="flex flex-col gap-3">
        <h2 id="day-h" className="text-lg" aria-live="polite">
          {day === today ? t("common.today") : formatDate(day)}
        </h2>
        <CaseList
          label={t("cal.hearingsOn", { date: formatDate(day) })}
          state={cases}
          onRetry={reload}
          empty={
            <EmptyState
              icon={<CalendarCheck size={40} />}
              title={t("cal.none")}
              body={t("cal.noneBody")}
            />
          }
        />
      </section>
    </Screen>
  );
}
