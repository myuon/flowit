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
