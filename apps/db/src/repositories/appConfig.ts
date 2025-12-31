import { eq } from "drizzle-orm";
import { db } from "../connection";
import { appConfig } from "../schema";
import type { AppConfig } from "../types";

// ============================================
// Type exports
// ============================================
export type DbAppConfig = typeof appConfig.$inferSelect;
export type NewAppConfig = typeof appConfig.$inferInsert;

// ============================================
// Converters
// ============================================
export function appConfigFromDb(dbConfig: DbAppConfig): AppConfig {
  return {
    key: dbConfig.key,
    value: dbConfig.value,
    updatedAt: dbConfig.updatedAt,
  };
}

// ============================================
// App Config Repository
// ============================================
export const appConfigRepository = {
  async get(key: string): Promise<AppConfig | undefined> {
    const result = await db.query.appConfig.findFirst({
      where: eq(appConfig.key, key),
    });
    return result ? appConfigFromDb(result) : undefined;
  },

  async set(key: string, value: string): Promise<AppConfig> {
    const now = new Date().toISOString();
    const existing = await this.get(key);

    if (existing) {
      const [result] = await db
        .update(appConfig)
        .set({ value, updatedAt: now })
        .where(eq(appConfig.key, key))
        .returning();
      return appConfigFromDb(result);
    }

    const [result] = await db
      .insert(appConfig)
      .values({ key, value, updatedAt: now })
      .returning();
    return appConfigFromDb(result);
  },

  async delete(key: string): Promise<boolean> {
    const result = await db.delete(appConfig).where(eq(appConfig.key, key));
    return result.rowsAffected > 0;
  },
};
