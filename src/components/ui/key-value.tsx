import type { ReactNode } from "react";

export function KeyValueList({ items }: { items: Array<{ label: string; value?: ReactNode }> }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-[minmax(0,12rem)_1fr]">
      {items.map((item) => (
        <div key={item.label} className="contents">
          <dt className="text-xs font-medium text-text-muted sm:pt-0.5">{item.label}</dt>
          <dd className="-mt-2 text-sm text-text sm:mt-0">
            {item.value === undefined || item.value === null || item.value === "" ? (
              <>
                <span aria-hidden="true">—</span>
                <span className="sr-only">not recorded</span>
              </>
            ) : (
              item.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
