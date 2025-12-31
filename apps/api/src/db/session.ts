import { eq, lt } from "drizzle-orm";
import { db } from "./index";
import { sessions, sessionFromDb } from "./schema";
import type { Session } from "../models";

// ============================================
// Session Repository
// ============================================
export const sessionRepository = {
  async create(userId: string, expiresAt: Date): Promise<Session> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const [result] = await db
      .insert(sessions)
      .values({
        id,
        userId,
        expiresAt: expiresAt.toISOString(),
        createdAt: now,
      })
      .returning();
    return sessionFromDb(result);
  },

  async findById(id: string): Promise<Session | undefined> {
    const result = await db.query.sessions.findFirst({
      where: eq(sessions.id, id),
    });
    return result ? sessionFromDb(result) : undefined;
  },

  async findValidById(id: string): Promise<Session | undefined> {
    const now = new Date().toISOString();
    const result = await db.query.sessions.findFirst({
      where: eq(sessions.id, id),
    });
    if (!result) return undefined;
    // Check if session is expired
    if (result.expiresAt < now) {
      return undefined;
    }
    return sessionFromDb(result);
  },

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(sessions).where(eq(sessions.id, id));
    return result.rowsAffected > 0;
  },

  async deleteByUserId(userId: string): Promise<number> {
    const result = await db.delete(sessions).where(eq(sessions.userId, userId));
    return result.rowsAffected;
  },

  async deleteExpired(): Promise<number> {
    const now = new Date().toISOString();
    const result = await db.delete(sessions).where(lt(sessions.expiresAt, now));
    return result.rowsAffected;
  },
};
