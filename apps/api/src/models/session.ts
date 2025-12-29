// Re-export conversion function from schema
export { sessionFromDb } from "../db/schema";

// ============================================
// Domain Model
// ============================================

export interface Session {
  id: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
}
