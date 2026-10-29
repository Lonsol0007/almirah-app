"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { usePrefs } from "@/lib/i18n/prefs";

export function AppBar({ title, backHref, actions }: { title: string; backHref?: string; actions?: ReactNode }) {
  const { t } = usePrefs();
  return (
    <header className="sticky top-0 z-30 bg-accent text-on-accent" style={{ height: "var(--app-bar-height)" }}>
      <div className="mx-auto flex h-full max-w-[var(--content-max)] items-center gap-2 px-2">
        {backHref ? (
          <Link
            href={backHref}
            aria-label={t("common.back")}
            className="inline-flex h-11 w-11 items-center justify-center rounded-pill hover:bg-on-accent/10"
          >
            <ArrowLeft aria-hidden="true" size={22} />
          </Link>
        ) : (
          <span className="w-2" />
        )}
        <h1 className="min-w-0 flex-1 truncate text-lg">{title}</h1>
        {actions && <div className="flex items-center">{actions}</div>}
      </div>
    </header>
  );
}
