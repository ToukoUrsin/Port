import {
  createContext,
  useContext,
  useCallback,
  type ReactNode,
} from "react";
import { useSearchParams } from "react-router-dom";
import { translations } from "@/i18n/translations";

export type Language = "fi" | "en";

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "preferred_lang";

function isValidLang(v: string | null): v is Language {
  return v === "fi" || v === "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const rawLang = searchParams.get("lang");
  const storedLang = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  const language: Language = isValidLang(rawLang)
    ? rawLang
    : isValidLang(storedLang)
      ? storedLang
      : "fi";

  // Sync localStorage whenever we resolve a language
  if (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) !== language) {
    localStorage.setItem(STORAGE_KEY, language);
  }

  const setLanguage = useCallback(
    (lang: Language) => {
      localStorage.setItem(STORAGE_KEY, lang);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("lang", lang);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const t = useCallback(
    (key: string): string => {
      return translations[language]?.[key] || translations.fi?.[key] || key;
    },
    [language],
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
