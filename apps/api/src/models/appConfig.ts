import type { AppSettings, Language } from "@flowit/shared";
import { DEFAULT_APP_SETTINGS } from "@flowit/shared";

// Re-export conversion function from db
export { appConfigFromDb } from "../db/appConfig";

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
  anthropicApiKey?: string;
}

export function updateSettingsInputFromRequest(body: {
  language?: Language;
  anthropicApiKey?: string;
}): UpdateSettingsInput {
  return {
    language: body.language,
    anthropicApiKey: body.anthropicApiKey,
  };
}

// ============================================
// API Key Helper Functions
// ============================================

export function getAnthropicApiKey(configs: AppConfig[]): string | null {
  const config = configs.find((c) => c.key === "anthropicApiKey");
  return config?.value ?? null;
}

export function hasAnthropicApiKey(configs: AppConfig[]): boolean {
  return configs.some((c) => c.key === "anthropicApiKey" && c.value.length > 0);
}
