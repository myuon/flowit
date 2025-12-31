import { eq } from "drizzle-orm";
import { db } from "./index";
import { appConfig } from "./schema";

// ============================================
// Type exports
// ============================================
export type AppConfig = typeof appConfig.$inferSelect;
export type NewAppConfig = typeof appConfig.$inferInsert;

// ============================================
// Converters
// ============================================
export function appConfigFromDb(dbConfig: AppConfig) {
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
    return db.query.appConfig.findFirst({
      where: eq(appConfig.key, key),
    });
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
      return result;
    }

    const [result] = await db
      .insert(appConfig)
      .values({ key, value, updatedAt: now })
      .returning();
    return result;
  },

  async delete(key: string): Promise<boolean> {
    const result = await db.delete(appConfig).where(eq(appConfig.key, key));
    return result.rowsAffected > 0;
  },
};
