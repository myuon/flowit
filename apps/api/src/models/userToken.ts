import type { UserToken as DbUserToken } from "../db/schema";

// ============================================
// Domain Model
// ============================================

export interface UserToken {
  id: string;
  userId: string;
  provider: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Conversion Functions from DB Entity
// ============================================

export function userTokenFromDb(dbToken: DbUserToken): UserToken {
  return {
    id: dbToken.id,
    userId: dbToken.userId,
    provider: dbToken.provider,
    accessToken: dbToken.accessToken,
    refreshToken: dbToken.refreshToken,
    expiresAt: dbToken.expiresAt,
    createdAt: dbToken.createdAt,
    updatedAt: dbToken.updatedAt,
  };
}

// ============================================
// Input Types for Creating/Updating
// ============================================

export interface UpsertUserTokenInput {
  userId: string;
  provider: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: string | null;
}

export function upsertUserTokenInputFromRequest(body: {
  userId: string;
  provider: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: string | null;
}): UpsertUserTokenInput {
  return {
    userId: body.userId,
    provider: body.provider,
    accessToken: body.accessToken,
    refreshToken: body.refreshToken ?? null,
    expiresAt: body.expiresAt ?? null,
  };
}
