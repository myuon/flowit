import { AuthProvider, useAuth, AuthCallback, LoginPage } from "./auth";
import { WorkflowEditor } from "./components/editor/WorkflowEditor";

/**
 * Simple path-based router for auth flows
 */
function AppRouter() {
  const path = window.location.pathname;

  // Handle OAuth callback
  if (path === "/auth/callback") {
    return <AuthCallback />;
  }

  // Main app (protected)
  return <ProtectedRoute />;
}

/**
 * Protected route - shows login if not authenticated
 */
function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
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
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <WorkflowEditor />;
}

export function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
