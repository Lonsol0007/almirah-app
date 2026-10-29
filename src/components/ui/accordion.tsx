"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cx } from "@/lib/cx";

interface AccordionProps {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function Accordion({ title, count, defaultOpen = false, children }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className="border-b border-border bg-surface-raised last:border-b-0">
      <h3>
        <button
          type="button"
          id={`${id}-h`}
          aria-expanded={open}
          aria-controls={`${id}-r`}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-3 bg-surface-raised px-4 py-3.5 text-left text-base font-semibold text-text hover:bg-surface"
        >
          <span>
            {title}
            {count !== undefined && <span className="ml-2 text-sm font-normal text-text-muted">({count})</span>}
          </span>
          <ChevronDown
            aria-hidden="true"
            size={20}
            className={cx(
              "shrink-0 text-text-muted transition-transform duration-[var(--motion-base)]",
              open && "rotate-180",
            )}
          />
        </button>
      </h3>
      <div id={`${id}-r`} role="region" aria-labelledby={`${id}-h`} hidden={!open} className="px-4 pb-4">
        {children}
      </div>
    </section>
  );
}
