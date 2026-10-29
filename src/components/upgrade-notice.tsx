"use client";

import Link from "next/link";
import { LIMIT_MESSAGES } from "@/lib/data";
import { usePrefs } from "@/lib/i18n/prefs";

/** Shown when a free-plan limit stops an action. Says what happened and the one way forward. */
export function UpgradeNotice({ message }: { message: string }) {
  const { t } = usePrefs();
  const text = message === LIMIT_MESSAGES.cases ? t("up.cases") : message === LIMIT_MESSAGES.orders ? t("up.orders") : message;
  return (
    <div role="alert" className="flex flex-col gap-2 rounded-md border border-accent bg-accent-subtle p-3 text-sm text-text">
      <p>{text}</p>
      <p className="text-text-muted">{t("up.unaffected")}</p>
      <Link href="/account" className="self-start font-semibold text-accent hover:underline">
        {t("up.see")}
      </Link>
    </div>
  );
}
