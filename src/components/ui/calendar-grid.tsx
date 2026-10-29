"use client";

import { useRef, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cx } from "@/lib/cx";
import { formatLongDay, formatMonth, todayIST } from "@/lib/dates";
import { usePrefs } from "@/lib/i18n/prefs";
import { IconButton } from "./button";

const WEEKDAYS = ["wd.mon", "wd.tue", "wd.wed", "wd.thu", "wd.fri", "wd.sat", "wd.sun"] as const;

function iso(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function shift(isoDate: string, days: number) {
  const t = Date.parse(isoDate + "T00:00:00Z") + days * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

interface CalendarGridProps {
  month: string; // yyyy-mm
  selected?: string;
  counts: Record<string, number>;
  onSelect: (date: string) => void;
  onMonthChange: (month: string) => void;
}

export function CalendarGrid({ month, selected, counts, onSelect, onMonthChange }: CalendarGridProps) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7; // Monday-first
  const today = todayIST();
  const grid = useRef<HTMLDivElement>(null);
  const { t } = usePrefs();

  const cells: Array<string | null> = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => iso(y, m - 1, i + 1)),
  ];
  while (cells.length % 7) cells.push(null);

  const focusable = selected?.startsWith(month) ? selected : today.startsWith(month) ? today : iso(y, m - 1, 1);

  function step(delta: number) {
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    onMonthChange(d.toISOString().slice(0, 7));
  }

  function onKey(e: KeyboardEvent<HTMLButtonElement>, date: string) {
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    const delta = moves[e.key];
    if (delta === undefined) return;
    e.preventDefault();
    const next = shift(date, delta);
    onSelect(next);
    if (!next.startsWith(month)) onMonthChange(next.slice(0, 7));
    requestAnimationFrame(() => grid.current?.querySelector<HTMLButtonElement>(`[data-date="${next}"]`)?.focus());
  }

  const title = formatMonth(month);

  return (
    <div className="rounded-lg border border-border bg-surface-raised p-3 shadow-card">
      <div className="mb-2 flex items-center justify-between">
        <IconButton label={t("cal.prev")} onClick={() => step(-1)}>
          <ChevronLeft size={20} />
        </IconButton>
        <h2 className="text-base font-semibold" aria-live="polite">
          {title}
        </h2>
        <IconButton label={t("cal.next")} onClick={() => step(1)}>
          <ChevronRight size={20} />
        </IconButton>
      </div>
      <div ref={grid} role="grid" aria-label={title} className="grid grid-cols-7 gap-1">
        <div role="row" className="contents">
          {WEEKDAYS.map((d) => (
            <div key={d} role="columnheader" className="py-1 text-center text-xs font-medium text-text-muted">
              {t(d)}
            </div>
          ))}
        </div>
        {Array.from({ length: cells.length / 7 }, (_, r) => (
          <div role="row" key={r} className="contents">
            {cells.slice(r * 7, r * 7 + 7).map((date, i) =>
              date ? (
                <div role="gridcell" key={date}>
                  <button
                    type="button"
                    data-date={date}
                    tabIndex={date === focusable ? 0 : -1}
                    aria-pressed={date === selected}
                    aria-label={t("cal.dayLabel", { day: formatLongDay(date), n: counts[date] ?? 0 })}
                    onClick={() => onSelect(date)}
                    onKeyDown={(e) => onKey(e, date)}
                    className={cx(
                      "flex h-11 w-full flex-col items-center justify-center rounded-md text-sm",
                      date === selected
                        ? "bg-accent text-on-accent"
                        : date === today
                          ? "text-accent ring-2 ring-accent ring-inset"
                          : "text-text hover:bg-surface",
                    )}
                  >
                    <span>{Number(date.slice(8))}</span>
                    {counts[date] ? (
                      <span
                        aria-hidden="true"
                        className={cx(
                          "mt-0.5 h-1.5 w-1.5 rounded-pill",
                          date === selected ? "bg-on-accent" : "bg-accent",
                        )}
                      />
                    ) : (
                      <span aria-hidden="true" className="mt-0.5 h-1.5" />
                    )}
                  </button>
                </div>
              ) : (
                <div role="gridcell" key={`e${r}-${i}`} />
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
