import { useAuth } from "../auth";
import { UserMenu } from "../components/UserMenu";

export function AdminPage() {
  const { user, isAdmin } = useAuth();

  if (!isAdmin) {
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
        <h1 style={{ color: "#dc2626", marginBottom: 16 }}>Access Denied</h1>
        <p style={{ color: "#666", marginBottom: 24 }}>
          You do not have permission to access this page.
        </p>
        <a
          href="/"
          style={{
            padding: "12px 24px",
            background: "#333",
            color: "white",
            border: "none",
            borderRadius: 8,
            textDecoration: "none",
            fontSize: 16,
          }}
        >
          Go Home
        </a>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          height: 48,
          borderBottom: "1px solid #e0e0e0",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 12,
          background: "white",
        }}
      >
        <a
          href="/"
          style={{
            fontWeight: 600,
            fontSize: 16,
            color: "#333",
            textDecoration: "none",
          }}
        >
          Flowit
        </a>
        <span
          style={{
            padding: "4px 10px",
            background: "#fef3c7",
            color: "#92400e",
            borderRadius: 4,
            fontSize: 12,
          }}
        >
          Admin
        </span>
        <div style={{ flex: 1 }} />
        <a
          href="/"
          style={{
            padding: "6px 12px",
            background: "#f0f0f0",
            border: "1px solid #ddd",
            borderRadius: 4,
            textDecoration: "none",
            color: "#333",
            fontSize: 14,
          }}
        >
          Back to Editor
        </a>
        <div style={{ width: 1, height: 24, background: "#e0e0e0" }} />
        <UserMenu />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        <h1 style={{ margin: "0 0 24px 0" }}>Admin Dashboard</h1>

        <div
          style={{
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <h2 style={{ margin: "0 0 16px 0", fontSize: 18 }}>Current User</h2>
          <div style={{ display: "grid", gap: 8 }}>
            <div>
              <strong>ID:</strong> {user?.sub}
            </div>
            <div>
              <strong>Email:</strong> {user?.email}
            </div>
            <div>
              <strong>Name:</strong> {user?.name || "N/A"}
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: 24,
          }}
        >
          <h2 style={{ margin: "0 0 16px 0", fontSize: 18 }}>Admin Tools</h2>
          <p style={{ color: "#666", margin: 0 }}>
            Admin features will be added here.
          </p>
        </div>
      </div>
    </div>
  );
}
