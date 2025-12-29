import { Hono } from "hono";
import type { AppSettings, Language } from "@flowit/shared";
import { DEFAULT_APP_SETTINGS } from "@flowit/shared";
import { db, appConfig } from "../db";

export function createConfigRoutes() {
  return (
    new Hono()
      // Get app settings (public - needed for i18n before login)
      .get("/settings", async (c) => {
        const settings: AppSettings = { ...DEFAULT_APP_SETTINGS };

        const rows = await db.select().from(appConfig);
        for (const row of rows) {
          if (
            row.key === "language" &&
            (row.value === "en" || row.value === "ja")
          ) {
            settings.language = row.value as Language;
          }
        }

        return c.json(settings);
      })
  );
}
