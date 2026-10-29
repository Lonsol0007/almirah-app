"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, CalendarDays, Hash, ListChecks, Search } from "lucide-react";
import { cx } from "@/lib/cx";
import { usePrefs } from "@/lib/i18n/prefs";

const ITEMS = [
  { href: "/cnr", label: "nav.cnr", icon: Hash },
  { href: "/search", label: "nav.search", icon: Search },
  { href: "/cause-list", label: "nav.causeList", icon: ListChecks },
  { href: "/calendar", label: "nav.calendar", icon: CalendarDays },
  { href: "/my-cases", label: "nav.myCases", icon: Briefcase },
] as const;

export function BottomNav() {
  const path = usePathname();
  const { t } = usePrefs();
  return (
    <nav
      aria-label={t("nav.main")}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface-raised"
      style={{ height: "var(--bottom-nav-height)" }}
    >
      <ul className="mx-auto grid h-full max-w-[var(--content-max)] grid-cols-5">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex h-full flex-col items-center justify-center gap-1 text-xs font-medium",
                  active ? "text-accent" : "text-text-muted hover:text-text",
                )}
              >
                <Icon aria-hidden="true" size={22} strokeWidth={active ? 2.4 : 2} />
                {t(label)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
