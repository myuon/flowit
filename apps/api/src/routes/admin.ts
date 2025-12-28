import { Hono } from "hono";
import type { AppSettings, Language } from "@flowit/shared";
import { DEFAULT_APP_SETTINGS } from "@flowit/shared";
import type { AuthVariables } from "../auth";
import { db, appConfig } from "../db";

export function isAdmin(userId: string): boolean {
  const adminIds = process.env.ADMIN_USER_IDS || "";
  const adminList = adminIds
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return adminList.includes(userId);
}

export function createAdminRoutes() {
  const router = new Hono<{ Variables: AuthVariables }>();

  // Middleware to check admin status
  router.use("*", async (c, next) => {
    const user = c.get("user");
    if (!isAdmin(user.sub)) {
      return c.json({ error: "Admin access required" }, 403);
    }
    await next();
  });

  // Update app settings
  router.put("/settings", async (c) => {
    const body = await c.req.json<Partial<AppSettings>>();
    const now = new Date().toISOString();

    if (body.language) {
      if (body.language !== "en" && body.language !== "ja") {
        return c.json({ error: "Invalid language" }, 400);
      }

      await db
        .insert(appConfig)
        .values({ key: "language", value: body.language, updatedAt: now })
        .onConflictDoUpdate({
          target: appConfig.key,
          set: { value: body.language, updatedAt: now },
        });
    }

    // Return updated settings
    const settings: AppSettings = { ...DEFAULT_APP_SETTINGS };
    const rows = await db.select().from(appConfig);
    for (const row of rows) {
      if (row.key === "language" && (row.value === "en" || row.value === "ja")) {
        settings.language = row.value as Language;
      }
    }

    return c.json(settings);
  });

  return router;
}
