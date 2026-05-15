import { createContext, useContext, useState, type ReactNode } from "react";
import type { Lang, Locale } from "./types";
import { en } from "./en";
import { es } from "./es";

const LOCALES: Record<Lang, Locale> = { en, es };
const STORAGE_KEY = "flexo-sim-lang";

function getSavedLang(): Lang {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === "es" ? "es" : "en";
}

type LocaleContextValue = { t: Locale; lang: Lang; setLang: (lang: Lang) => void };

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getSavedLang);

  function setLang(next: Lang) {
    localStorage.setItem(STORAGE_KEY, next);
    setLangState(next);
  }

  return (
    <LocaleContext.Provider value={{ t: LOCALES[lang], lang, setLang }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside LocaleProvider");
  return ctx;
}
