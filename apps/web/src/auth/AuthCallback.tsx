import { useEffect, useState } from "react";
import type { AuthUser, AuthSession } from "@flowit/shared";
import { useAuth } from "./AuthContext";

/**
 * OAuth callback handler component
 * This component handles the redirect from the API after OAuth authentication
 * The API passes tokens via URL query parameters
 */
export function AuthCallback() {
  const [error, setError] = useState<string | null>(null);
  const { saveSession } = useAuth();

  useEffect(() => {
    const handleCallback = () => {
      try {
        const params = new URLSearchParams(window.location.search);

        // Check for error
        const errorParam = params.get("error");
        if (errorParam) {
          setError(errorParam);
          return;
        }

        // Get tokens from URL params
        const accessToken = params.get("access_token");
        const idToken = params.get("id_token");
        const expiresIn = params.get("expires_in");
        const userParam = params.get("user");

        if (!accessToken || !idToken || !userParam) {
          setError("Missing authentication data");
          return;
        }

        // Parse user info
        const user = JSON.parse(userParam) as AuthUser;

        // Create session
        const session: AuthSession = {
          user,
          accessToken,
          idToken,
          expiresAt: Date.now() + (parseInt(expiresIn || "3600") * 1000),
        };

        // Save session
        saveSession(session);

        // Redirect to home page
        window.location.href = "/";
      } catch (err) {
        console.error("Auth callback error:", err);
        setError(err instanceof Error ? err.message : "Authentication failed");
      }
    };

    handleCallback();
  }, [saveSession]);

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h1 style={{ color: "#dc2626", marginBottom: 16 }}>
          Authentication Error
        </h1>
        <p style={{ color: "#666", marginBottom: 24 }}>{error}</p>
        <button
          onClick={() => (window.location.href = "/")}
          style={{
            padding: "12px 24px",
            background: "#333",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 16,
          }}
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          border: "4px solid #f3f3f3",
          borderTop: "4px solid #333",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      />
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <p style={{ marginTop: 24, color: "#666" }}>Completing login...</p>
    </div>
  );
}
