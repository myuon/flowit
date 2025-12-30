import { hc } from "hono/client";
import type { AppType } from "@flowit/api";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Custom fetch that includes credentials (cookies) for session-based auth
 */
const authFetch: typeof fetch = (input, init) => {
  return fetch(input, {
    ...init,
    credentials: "include",
  });
};

// Create and export hono client with auth (cookies sent automatically)
export const client = hc<AppType>(API_BASE_URL, { fetch: authFetch });
