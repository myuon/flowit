/**
 * OAuth error handler component
 * Displays error message from OAuth flow and provides navigation back to home
 */
export function AuthError() {
  const params = new URLSearchParams(window.location.search);
  const error = params.get("error") || "Authentication failed";

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
