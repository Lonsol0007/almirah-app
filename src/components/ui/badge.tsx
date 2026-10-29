import { cx } from "@/lib/cx";

export type BadgeTone = "pending" | "disposed" | "today" | "overdue";

const tones: Record<BadgeTone, string> = {
  pending: "bg-accent-subtle text-accent",
  disposed: "bg-surface text-text-muted",
  today: "bg-surface text-success",
  overdue: "bg-surface text-danger",
};

export function StatusBadge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-pill border border-border px-2.5 py-0.5 text-xs font-semibold",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
