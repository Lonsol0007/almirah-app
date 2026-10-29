import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-surface-raised px-6 py-10 text-center">
      <span aria-hidden="true" className="text-text-muted">
        {icon}
      </span>
      <h2 className="text-lg text-text">{title}</h2>
      {body && <p className="max-w-sm text-sm text-text-muted">{body}</p>}
      {action}
    </div>
  );
}
