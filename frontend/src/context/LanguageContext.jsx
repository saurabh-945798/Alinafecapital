import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LANGUAGE, translations } from "../i18n/translations";

const STORAGE_KEY = "alinafe_lang";

const LanguageContext = createContext({
  lang: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  t: (key) => key,
});

const resolveValue = (lang, key) => {
  const parts = String(key || "").split(".");
  let current = translations[lang] || translations[DEFAULT_LANGUAGE];

  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in current)) {
      current = undefined;
      break;
    }
    current = current[part];
  }

  if (typeof current === "string") return current;

  current = translations[DEFAULT_LANGUAGE];
  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in current)) {
      return key;
    }
    current = current[part];
  }

  return typeof current === "string" ? current : key;
};

export function LanguageProvider({ children }) {
  const [lang] = useState(DEFAULT_LANGUAGE);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = "en";
    }
  }, [lang]);

  const value = useMemo(
    () => ({
      lang,
      setLanguage: () => {},
      t: (key) => resolveValue(lang, key),
    }),
    [lang]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
