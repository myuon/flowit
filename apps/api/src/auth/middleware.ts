import { createMiddleware } from "hono/factory";
import type { AuthUser } from "@flowit/shared";
import { sessionRepository, userRepository, userTokenRepository } from "../db/repository";

// Token refresh leeway in seconds (refresh if token expires within this time)
const TOKEN_REFRESH_LEEWAY_SECONDS = 300;

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(
  userId: string,
  refreshToken: string
): Promise<boolean> {
  const clientId = process.env.OIDC_CLIENT_ID;
  const clientSecret = process.env.OIDC_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("Missing OIDC client credentials for token refresh");
    return false;
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      console.error("Token refresh failed:", await response.text());
      return false;
    }

    const tokens = (await response.json()) as {
      access_token: string;
      expires_in: number;
      token_type: string;
    };

    // Update the stored token
    await userTokenRepository.upsert({
      userId,
      provider: "google",
      accessToken: tokens.access_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    });

    return true;
  } catch (error) {
    console.error("Token refresh error:", error);
    return false;
  }
}

/**
 * Check if token needs refresh and refresh if necessary
 */
async function refreshTokenIfNeeded(userId: string): Promise<void> {
  const userToken = await userTokenRepository.findByUserAndProvider(userId, "google");
  if (!userToken) {
    return;
  }

  // Check if token is about to expire
  if (userToken.expiresAt) {
    const expiresAt = new Date(userToken.expiresAt).getTime();
    const now = Date.now();
    const leewayMs = TOKEN_REFRESH_LEEWAY_SECONDS * 1000;

    if (now >= expiresAt - leewayMs) {
      // Token is about to expire, refresh it
      if (userToken.refreshToken) {
        const remainingSeconds = Math.floor((expiresAt - now) / 1000);
        console.log(`[Token Refresh] Refreshing token for user ${userId} (expires in ${remainingSeconds}s)`);
        const success = await refreshAccessToken(userId, userToken.refreshToken);
        if (success) {
          console.log(`[Token Refresh] Successfully refreshed token for user ${userId}`);
        }
      }
    }
  }
}

/**
 * Hono context variables added by auth middleware
 */
export interface AuthVariables {
  user: AuthUser;
  token: string;
}

/**
 * Session-based authentication middleware
 *
 * This middleware:
 * 1. Extracts session ID from HttpOnly cookie
 * 2. Looks up the session in the database
 * 3. Validates session is not expired
 * 4. Retrieves user info and adds to context
 * 5. Refreshes access token if needed (non-blocking)
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

      // Look up user profile
      const userProfile = await userRepository.findById(session.userId);
      if (!userProfile) {
        return c.json({ error: "User not found" }, 401);
      }

      // Refresh access token if needed (non-blocking)
      refreshTokenIfNeeded(session.userId).catch((err) => {
        console.error("Token refresh failed:", err);
      });

      // Create user object from profile
      const user: AuthUser = {
        sub: userProfile.id,
        email: userProfile.email,
        name: userProfile.name ?? undefined,
        picture: userProfile.picture ?? undefined,
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
