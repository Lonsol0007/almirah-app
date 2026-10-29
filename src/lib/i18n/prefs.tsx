"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { data } from "../data";
import { daysUntil, formatDate, todayIST } from "../dates";
import type { CourtLevel } from "../types";
import { LANGS, translate, type Lang, type MessageKey } from "./messages";

export type T = (key: MessageKey, vars?: Record<string, string | number>) => string;

interface Prefs {
  lang: Lang;
  courtLevel: CourtLevel;
  t: T;
  /** Apply a change right away (Settings calls this after saving). */
  setPrefs: (p: { lang?: string; courtLevel?: CourtLevel }) => void;
}

const asLang = (l?: string): Lang => (LANGS.includes(l as Lang) ? (l as Lang) : "en");

const PrefsContext = createContext<Prefs>({
  lang: "en",
  courtLevel: "district",
  t: (k, v) => translate("en", k, v),
  setPrefs: () => {},
});

export function PrefsProvider({ children }: { children: ReactNode }) {
  // The server always renders English; the saved language applies once the profile loads.
  const [lang, setLang] = useState<Lang>("en");
  const [courtLevel, setCourtLevel] = useState<CourtLevel>("district");

  useEffect(() => {
    let live = true;
    data
      .getProfile()
      .then((p) => {
        if (!live) return;
        setLang(asLang(p.language));
        setCourtLevel(p.courtLevel ?? "district");
      })
      .catch(() => {}); // signed out or offline: stay on the defaults
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setPrefs = useCallback((p: { lang?: string; courtLevel?: CourtLevel }) => {
    if (p.lang !== undefined) setLang(asLang(p.lang));
    if (p.courtLevel) setCourtLevel(p.courtLevel);
  }, []);

  const value = useMemo<Prefs>(
    () => ({ lang, courtLevel, setPrefs, t: (k, v) => translate(lang, k, v) }),
    [lang, courtLevel, setPrefs],
  );
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs() {
  return useContext(PrefsContext);
}

/** The hearing chip text for a date, in the current language. */
export function hearingText(t: T, iso: string | undefined, from = todayIST()) {
  if (!iso) return t("hearing.none");
  const d = daysUntil(iso, from);
  if (d === 0) return t("hearing.today");
  if (d === 1) return t("hearing.tomorrow");
  if (d < 0) return t("hearing.passed", { date: formatDate(iso) });
  return t("hearing.next", { date: formatDate(iso) });
}
