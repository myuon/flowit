import { createMiddleware } from "hono/factory";
import * as jose from "jose";
import type { AuthUser } from "@flowit/shared";
import { sessionRepository } from "../db/repository";

/**
 * OIDC Provider configuration for JWT verification
 * Designed to be provider-agnostic (Google, Auth0, Keycloak, etc.)
 */
export interface JWTVerifyConfig {
  /** OIDC issuer URL - used to fetch JWKS */
  issuer: string;
  /** Expected audience (typically the client ID) */
  audience: string;
}

// Cache for JWKS to avoid fetching on every request
const jwksCache = new Map<string, jose.JWTVerifyGetKey>();

/**
 * Get or create a JWKS remote key set for an issuer
 */
function getJWKS(issuer: string): jose.JWTVerifyGetKey {
  const cached = jwksCache.get(issuer);
  if (cached) return cached;

  // Standard OIDC discovery: issuer + /.well-known/openid-configuration
  // jose.createRemoteJWKSet will fetch from issuer + /.well-known/jwks.json
  // For Google: https://www.googleapis.com/oauth2/v3/certs
  const jwksUri = issuer.endsWith("/")
    ? `${issuer}.well-known/jwks.json`
    : `${issuer}/.well-known/jwks.json`;

  // Google uses a different JWKS endpoint
  const googleJwksUri = "https://www.googleapis.com/oauth2/v3/certs";
  const actualUri = issuer === "https://accounts.google.com" ? googleJwksUri : jwksUri;

  const jwks = jose.createRemoteJWKSet(new URL(actualUri));
  jwksCache.set(issuer, jwks);
  return jwks;
}

/**
 * Extract user info from JWT claims
 */
function extractUser(payload: jose.JWTPayload): AuthUser {
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
 * Hono context variables added by auth middleware
 */
export interface AuthVariables {
  user: AuthUser;
  token: string;
}

/**
 * Create JWT verification middleware for Hono
 *
 * This middleware:
 * 1. Extracts Bearer token from Authorization header
 * 2. Verifies JWT signature using issuer's JWKS
 * 3. Validates issuer and audience claims
 * 4. Extracts user info and adds to context
 *
 * @example
 * ```ts
 * const authConfig = {
 *   issuer: "https://accounts.google.com",
 *   audience: "your-client-id.apps.googleusercontent.com"
 * };
 *
 * app.use("/api/*", jwtAuth(authConfig));
 * ```
 */
export function jwtAuth(config: JWTVerifyConfig) {
  return createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    const authHeader = c.req.header("Authorization");

    if (!authHeader) {
      return c.json({ error: "Missing Authorization header" }, 401);
    }

    if (!authHeader.startsWith("Bearer ")) {
      return c.json({ error: "Invalid Authorization header format" }, 401);
    }

    const token = authHeader.slice(7);

    try {
      const jwks = getJWKS(config.issuer);

      const { payload } = await jose.jwtVerify(token, jwks, {
        issuer: config.issuer,
        audience: config.audience,
      });

      const user = extractUser(payload);

      // Validate required fields
      if (!user.sub || !user.email) {
        return c.json({ error: "Invalid token: missing required claims" }, 401);
      }

      // Add to context
      c.set("user", user);
      c.set("token", token);

      await next();
    } catch (error) {
      if (error instanceof jose.errors.JWTExpired) {
        return c.json({ error: "Token expired" }, 401);
      }
      if (error instanceof jose.errors.JWTClaimValidationFailed) {
        return c.json({ error: "Token validation failed" }, 401);
      }
      if (error instanceof jose.errors.JWSSignatureVerificationFailed) {
        return c.json({ error: "Invalid token signature" }, 401);
      }

      console.error("JWT verification error:", error);
      return c.json({ error: "Authentication failed" }, 401);
    }
  });
}

/**
 * Get auth configuration from environment variables
 * Falls back to Google OIDC if not configured
 */
export function getAuthConfig(): JWTVerifyConfig {
  return {
    issuer: process.env.OIDC_ISSUER || "https://accounts.google.com",
    audience: process.env.OIDC_AUDIENCE || process.env.OIDC_CLIENT_ID || "",
  };
}

/**
 * Session-based authentication middleware
 *
 * This middleware:
 * 1. Extracts session ID from HttpOnly cookie
 * 2. Looks up the session in the database
 * 3. Validates session is not expired
 * 4. Retrieves user info and adds to context
 */
export function sessionAuth() {
  return createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    // Get session ID from cookie
    const sessionId = c.req
      .header("Cookie")
      ?.split(";")
      .find((cookie) => cookie.trim().startsWith("session_id="))
      ?.split("=")[1];

    if (!sessionId) {
      return c.json({ error: "Missing session" }, 401);
    }

    try {
      // Look up session
      const session = await sessionRepository.findValidById(sessionId);
      if (!session) {
        return c.json({ error: "Invalid or expired session" }, 401);
      }

      // Create minimal user object from session
      const user: AuthUser = {
        sub: session.userId,
        email: "",
        iss: "session",
      };

      // Add to context
      c.set("user", user);
      c.set("token", sessionId);

      await next();
    } catch (error) {
      console.error("Session auth error:", error);
      return c.json({ error: "Authentication failed" }, 401);
    }
  });
}
