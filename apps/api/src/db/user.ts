import { eq } from "drizzle-orm";
import { db } from "./index";
import { users, userFromDb } from "./schema";
import type { User } from "../models";

// ============================================
// User Repository
// ============================================
export const userRepository = {
  async upsert(data: {
    id: string;
    email: string;
    name?: string | null;
    picture?: string | null;
  }): Promise<User> {
    const now = new Date().toISOString();
    const existing = await db.query.users.findFirst({
      where: eq(users.id, data.id),
    });

    if (existing) {
      // Update existing user
      const [result] = await db
        .update(users)
        .set({
          email: data.email,
          name: data.name ?? existing.name,
          picture: data.picture ?? existing.picture,
          updatedAt: now,
        })
        .where(eq(users.id, data.id))
        .returning();
      return userFromDb(result);
    } else {
      // Create new user
      const [result] = await db
        .insert(users)
        .values({
          id: data.id,
          email: data.email,
          name: data.name,
          picture: data.picture,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      return userFromDb(result);
    }
  },

  async findById(id: string): Promise<User | undefined> {
    const result = await db.query.users.findFirst({
      where: eq(users.id, id),
    });
    return result ? userFromDb(result) : undefined;
  },
};
