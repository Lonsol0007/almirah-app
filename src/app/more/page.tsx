"use client";

import Link from "next/link";
import { ChevronRight, FileText, MapPin, Settings, ShieldCheck, UserRound } from "lucide-react";
import { Screen } from "@/components/screen";
import { BRAND } from "@/lib/brand";
import { usePrefs } from "@/lib/i18n/prefs";

const APP = [
  { href: "/account", label: "mo.account", icon: UserRound },
  { href: "/settings", label: "st.title", icon: Settings },
  { href: "/my-cases/backup", label: "bk.title", icon: ShieldCheck },
  { href: "/courts", label: "ct.title", icon: MapPin },
  { href: "/privacy", label: "mo.privacy", icon: FileText },
  { href: "/terms", label: "mo.terms", icon: FileText },
] as const;

export default function MorePage() {
  const { t } = usePrefs();
  return (
    <Screen title={t("common.more")} backHref="/">
      <nav aria-label={t("st.app")} className="overflow-hidden rounded-lg border border-border bg-surface-raised shadow-card">
        <ul>
          {APP.map(({ href, label, icon: Icon }) => (
            <li key={href} className="border-b border-border last:border-b-0">
              <Link href={href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface">
                <Icon aria-hidden="true" size={20} className="text-accent" />
                <span className="flex-1 font-semibold">{t(label)}</span>
                <ChevronRight aria-hidden="true" size={18} className="text-text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section aria-labelledby="help-h" className="flex flex-col gap-2 text-sm">
        <h2 id="help-h" className="text-lg">
          {t("mo.help")}
        </h2>
        <details className="rounded-lg border border-border bg-surface-raised p-4">
          <summary className="cursor-pointer font-semibold">{t("mo.q1")}</summary>
          <p className="mt-2 text-text-muted">{t("mo.a1", { brand: BRAND.name })}</p>
        </details>
        <details className="rounded-lg border border-border bg-surface-raised p-4">
          <summary className="cursor-pointer font-semibold">{t("mo.q2")}</summary>
          <p className="mt-2 text-text-muted">{t("mo.a2")}</p>
        </details>
        <p className="text-text-muted">
          {t("mo.independent", { brand: BRAND.name })} {t("mo.questions")}{" "}
          <a className="font-semibold text-accent hover:underline" href={`mailto:${BRAND.supportEmail}`}>
            {BRAND.supportEmail}
          </a>
        </p>
      </section>
    </Screen>
  );
}
