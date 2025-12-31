// Re-export conversion function from db
export { userFromDb } from "../db/user";

export interface User {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
  createdAt: string;
  updatedAt: string;
}
