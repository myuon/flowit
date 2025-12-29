export { userFromDb } from "../db/schema";

export interface User {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
  createdAt: string;
  updatedAt: string;
}
