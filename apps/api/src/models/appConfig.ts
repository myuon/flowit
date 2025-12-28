import type { AppSettings, Language } from "@flowit/shared";
import { DEFAULT_APP_SETTINGS } from "@flowit/shared";

// Re-export conversion function from schema
export { appConfigFromDb } from "../db/schema";

// ============================================
// Domain Model
// ============================================

export interface AppConfig {
  key: string;
  value: string;
  updatedAt: string;
}

// ============================================
// Helper Functions
// ============================================

export function appSettingsFromConfigs(configs: AppConfig[]): AppSettings {
  const settings: AppSettings = { ...DEFAULT_APP_SETTINGS };

  for (const config of configs) {
    if (config.key === "language" && isValidLanguage(config.value)) {
      settings.language = config.value;
    }
  }

  return settings;
}

function isValidLanguage(value: string): value is Language {
  return value === "en" || value === "ja";
}

// ============================================
// Input Types for Updating
// ============================================

export interface UpdateSettingsInput {
  language?: Language;
}

export function updateSettingsInputFromRequest(body: {
  language?: Language;
}): UpdateSettingsInput {
  return {
    language: body.language,
  };
}
