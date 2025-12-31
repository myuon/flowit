// Re-export conversion function from db
export { sessionFromDb } from "../db/session";

// ============================================
// Domain Model
// ============================================

export interface Session {
  id: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
}
