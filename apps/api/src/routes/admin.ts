import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { AuthVariables } from "../auth";
import { db, appConfig } from "../db";
import { updateSettingsSchema } from "./schemas";
import {
  appConfigFromDb,
  appSettingsFromConfigs,
  updateSettingsInputFromRequest,
} from "../models";

export function isAdmin(userId: string): boolean {
  const adminIds = process.env.ADMIN_USER_IDS || "";
  const adminList = adminIds
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return adminList.includes(userId);
}

export function createAdminRoutes() {
  return (
    new Hono<{ Variables: AuthVariables }>()
      // Middleware to check admin status
      .use("*", async (c, next) => {
        const user = c.get("user");
        if (!isAdmin(user.sub)) {
          return c.json({ error: "Admin access required" }, 403);
        }
        await next();
      })
      // Update app settings
      .put("/settings", zValidator("json", updateSettingsSchema), async (c) => {
        const body = c.req.valid("json");
        const input = updateSettingsInputFromRequest(body);
        const now = new Date().toISOString();

        if (input.language) {
          await db
            .insert(appConfig)
            .values({ key: "language", value: input.language, updatedAt: now })
            .onConflictDoUpdate({
              target: appConfig.key,
              set: { value: input.language, updatedAt: now },
            });
        }

        // Return updated settings
        const rows = await db.select().from(appConfig);
        const configs = rows.map(appConfigFromDb);
        const settings = appSettingsFromConfigs(configs);

        return c.json(settings);
      })
  );
}
