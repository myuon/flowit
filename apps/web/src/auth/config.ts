/**
 * Auth configuration
 * Uses BFF (Backend for Frontend) pattern - OAuth flow handled by API server
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Get API login URL
 * Redirects to API which handles OAuth flow with client_secret
 */
export function getLoginUrl(): string {
  return `${API_BASE_URL}/auth/login`;
}

/**
 * Get API logout URL
 */
export function getLogoutUrl(): string {
  return `${API_BASE_URL}/auth/logout`;
}

/**
 * Get API base URL
 */
export function getApiBaseUrl(): string {
  return API_BASE_URL;
}
