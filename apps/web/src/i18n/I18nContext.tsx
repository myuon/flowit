import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Language } from "@flowit/shared";
import { DEFAULT_APP_SETTINGS } from "@flowit/shared";
import { client } from "../api/client";
import { getTranslations, type Translations } from "./translations";

interface I18nContextValue {
  language: Language;
  t: Translations;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const I18nContext = createContext<I18nContextValue | null>(null);

interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [language, setLanguage] = useState<Language>(
    DEFAULT_APP_SETTINGS.language
  );
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const res = await client.config.settings.$get();
      if (!res.ok) {
        throw new Error("Failed to get settings");
      }
      const settings = await res.json();
      setLanguage(settings.language);
    } catch {
      // Use default language on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const refresh = async () => {
    await fetchSettings();
  };

  const value: I18nContextValue = {
    language,
    t: getTranslations(language),
    isLoading,
    refresh,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
