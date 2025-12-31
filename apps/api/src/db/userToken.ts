import { eq, and } from "drizzle-orm";
import { db } from "./index";
import {
  userTokens,
  type NewUserToken,
  userTokenFromDb,
} from "./schema";
import type { UserToken } from "../models";

// ============================================
// User Token Repository
// ============================================
export const userTokenRepository = {
  async upsert(
    data: Omit<NewUserToken, "id" | "createdAt" | "updatedAt">
  ): Promise<UserToken> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    // Check if token already exists for this user/provider
    const existing = await this.findByUserAndProvider(
      data.userId,
      data.provider
    );

    if (existing) {
      // Update existing token
      const [result] = await db
        .update(userTokens)
        .set({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          expiresAt: data.expiresAt,
          updatedAt: now,
        })
        .where(eq(userTokens.id, existing.id))
        .returning();
      return userTokenFromDb(result);
    }

    // Create new token
    const [result] = await db
      .insert(userTokens)
      .values({
        id,
        ...data,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return userTokenFromDb(result);
  },

  async findByUserAndProvider(
    userId: string,
    provider: string
  ): Promise<UserToken | undefined> {
    const result = await db.query.userTokens.findFirst({
      where: and(
        eq(userTokens.userId, userId),
        eq(userTokens.provider, provider)
      ),
    });
    return result ? userTokenFromDb(result) : undefined;
  },

  async findByUserId(userId: string): Promise<UserToken[]> {
    const results = await db.query.userTokens.findMany({
      where: eq(userTokens.userId, userId),
    });
    return results.map(userTokenFromDb);
  },

  async delete(userId: string, provider: string): Promise<boolean> {
    const result = await db
      .delete(userTokens)
      .where(
        and(eq(userTokens.userId, userId), eq(userTokens.provider, provider))
      );
    return result.rowsAffected > 0;
  },
};
