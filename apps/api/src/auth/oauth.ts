import { Hono } from "hono";
import * as jose from "jose";
import type { AuthUser } from "@flowit/shared";

/**
 * OIDC Provider configuration
 */
export interface OAuthConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  frontendUrl: string;
}

/**
 * Get OAuth configuration from environment
 */
export function getOAuthConfig(): OAuthConfig {
  return {
    issuer: process.env.OIDC_ISSUER || "https://accounts.google.com",
    clientId: process.env.OIDC_CLIENT_ID || "",
    clientSecret: process.env.OIDC_CLIENT_SECRET || "",
    redirectUri: process.env.OIDC_REDIRECT_URI || "http://localhost:3001/auth/callback",
    scopes: ["openid", "email", "profile"],
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  };
}

// OIDC Discovery cache
interface OIDCDiscovery {
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  issuer: string;
}

const discoveryCache = new Map<string, OIDCDiscovery>();

async function getDiscovery(issuer: string): Promise<OIDCDiscovery> {
  const cached = discoveryCache.get(issuer);
  if (cached) return cached;

  const url = issuer.endsWith("/")
    ? `${issuer}.well-known/openid-configuration`
    : `${issuer}/.well-known/openid-configuration`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch OIDC discovery: ${response.statusText}`);
  }

  const discovery = (await response.json()) as OIDCDiscovery;
  discoveryCache.set(issuer, discovery);
  return discovery;
}

// State storage (in production, use Redis or similar)
const stateStore = new Map<string, { createdAt: number; redirectTo?: string }>();

// Clean up old states periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of stateStore) {
    if (now - value.createdAt > 10 * 60 * 1000) { // 10 minutes
      stateStore.delete(key);
    }
  }
}, 60 * 1000);

/**
 * Generate random state for CSRF protection
 */
function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Extract user info from ID token
 */
function extractUserFromIdToken(payload: jose.JWTPayload): AuthUser {
  return {
    sub: payload.sub || "",
    email: (payload.email as string) || "",
    emailVerified: payload.email_verified as boolean | undefined,
    name: payload.name as string | undefined,
    picture: payload.picture as string | undefined,
    iss: payload.iss || "",
  };
}

/**
 * Create OAuth routes
 */
export function createOAuthRoutes(config: OAuthConfig) {
  const oauth = new Hono();

  // Login - redirect to OIDC provider
  oauth.get("/login", async (c) => {
    const discovery = await getDiscovery(config.issuer);

    const state = generateState();
    stateStore.set(state, { createdAt: Date.now() });

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: config.scopes.join(" "),
      state,
      access_type: "offline", // For refresh tokens
      prompt: "consent", // Always show consent screen for refresh token
    });

    const authUrl = `${discovery.authorization_endpoint}?${params}`;
    return c.redirect(authUrl);
  });

  // Callback - exchange code for tokens
  oauth.get("/callback", async (c) => {
    const code = c.req.query("code");
    const state = c.req.query("state");
    const error = c.req.query("error");

    // Handle error from provider
    if (error) {
      const errorDescription = c.req.query("error_description") || error;
      return c.redirect(`${config.frontendUrl}/auth/error?error=${encodeURIComponent(errorDescription)}`);
    }

    // Validate state
    if (!state || !stateStore.has(state)) {
      return c.redirect(`${config.frontendUrl}/auth/error?error=${encodeURIComponent("Invalid state")}`);
    }
    stateStore.delete(state);

    if (!code) {
      return c.redirect(`${config.frontendUrl}/auth/error?error=${encodeURIComponent("Missing authorization code")}`);
    }

    try {
      const discovery = await getDiscovery(config.issuer);

      // Exchange code for tokens
      const tokenResponse = await fetch(discovery.token_endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: config.redirectUri,
          client_id: config.clientId,
          client_secret: config.clientSecret,
        }),
      });

      if (!tokenResponse.ok) {
        const errorBody = await tokenResponse.text();
        console.error("Token exchange failed:", errorBody);
        return c.redirect(`${config.frontendUrl}/auth/error?error=${encodeURIComponent("Token exchange failed")}`);
      }

      const tokens = (await tokenResponse.json()) as {
        access_token: string;
        id_token: string;
        refresh_token?: string;
        expires_in: number;
        token_type: string;
      };

      // Decode ID token to get user info (we verify it in the JWT middleware later)
      const idTokenPayload = jose.decodeJwt(tokens.id_token);
      const user = extractUserFromIdToken(idTokenPayload);

      // Redirect to frontend with tokens
      // In production, consider using httpOnly cookies instead
      const params = new URLSearchParams({
        access_token: tokens.access_token,
        id_token: tokens.id_token,
        expires_in: tokens.expires_in.toString(),
        user: JSON.stringify(user),
      });

      if (tokens.refresh_token) {
        params.set("refresh_token", tokens.refresh_token);
      }

      return c.redirect(`${config.frontendUrl}/auth/callback?${params}`);
    } catch (err) {
      console.error("OAuth callback error:", err);
      return c.redirect(`${config.frontendUrl}/auth/error?error=${encodeURIComponent("Authentication failed")}`);
    }
  });

  // Logout
  oauth.post("/logout", (c) => {
    // For now, just return success
    // In production with cookies, clear the cookie here
    return c.json({ success: true });
  });

  return oauth;
}
