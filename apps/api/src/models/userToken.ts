// Re-export conversion function from db
export { userTokenFromDb } from "../db/userToken";

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
