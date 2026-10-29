"use client";

import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "@/lib/cx";

export interface TabItem {
  id: string;
  label: string;
  disabled?: boolean;
}

interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  variant?: "segmented" | "underline";
  label: string;
  children: ReactNode;
}

export function Tabs({ items, value, onChange, variant = "segmented", label, children }: TabsProps) {
  const base = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const enabled = items.filter((i) => !i.disabled);

  function move(e: KeyboardEvent<HTMLButtonElement>) {
    const idx = enabled.findIndex((i) => i.id === value);
    let next = -1;
    if (e.key === "ArrowRight") next = (idx + 1) % enabled.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + enabled.length) % enabled.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = enabled.length - 1;
    if (next < 0) return;
    e.preventDefault();
    const target = enabled[next];
    onChange(target.id);
    refs.current[items.indexOf(target)]?.focus();
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label={label}
        className={cx(
          "flex gap-1 overflow-x-auto",
          variant === "segmented" ? "rounded-md bg-surface p-1" : "border-b border-border",
        )}
      >
        {items.map((item, i) => {
          const selected = item.id === value;
          return (
            <button
              key={item.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              role="tab"
              type="button"
              id={`${base}-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`${base}-panel`}
              tabIndex={selected ? 0 : -1}
              disabled={item.disabled}
              onClick={() => onChange(item.id)}
              onKeyDown={move}
              className={cx(
                "shrink-0 whitespace-nowrap px-3 py-2 text-sm font-semibold transition-colors",
                "disabled:opacity-50",
                variant === "segmented"
                  ? selected
                    ? "rounded-sm bg-accent-subtle text-accent"
                    : "rounded-sm text-text-muted hover:text-text"
                  : selected
                    ? "-mb-px border-b-2 border-accent text-accent"
                    : "border-b-2 border-transparent text-text-muted hover:text-text",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={`${base}-panel`} aria-labelledby={`${base}-tab-${value}`} className="pt-4">
        {children}
      </div>
    </div>
  );
}
