import { cx } from "@/lib/cx";

export function Spinner({ size = 20, label, className }: { size?: number; label?: string; className?: string }) {
  return (
    <span role={label ? "status" : undefined} className={cx("inline-flex items-center", className)}>
      <span
        aria-hidden="true"
        className="inline-block animate-spin rounded-pill border-2 border-current border-r-transparent"
        style={{ width: size, height: size }}
      />
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}

export function SkeletonCard() {
  return (
    <div role="status" className="rounded-lg border border-border bg-surface-raised p-4">
      <span className="sr-only">Loading</span>
      <div aria-hidden="true" className="space-y-2 motion-safe:animate-pulse">
        <div className="h-4 w-2/3 rounded-sm bg-surface" />
        <div className="h-3 w-1/2 rounded-sm bg-surface" />
        <div className="h-3 w-1/3 rounded-sm bg-surface" />
      </div>
    </div>
  );
}
