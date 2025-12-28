// Re-export conversion function from schema
export { userTokenFromDb } from "../db/schema";

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
