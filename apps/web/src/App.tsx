import { AuthProvider, useAuth, AuthError, LoginPage } from "./auth";
import { I18nProvider } from "./i18n";
import { WorkflowEditor } from "./components/editor/WorkflowEditor";
import { AdminPage } from "./pages/AdminPage";
import { WorkflowListPage } from "./pages/WorkflowListPage";

/**
 * Simple path-based router for auth flows
 */
function AppRouter() {
  const path = window.location.pathname;

  // Handle OAuth error
  if (path === "/auth/error") {
    return <AuthError />;
  }

  // Admin page
  if (path === "/admin") {
    return <ProtectedRoute page="admin" />;
  }

  // Workflow editor page
  const workflowMatch = path.match(/^\/workflows\/([^/]+)$/);
  if (workflowMatch) {
    const workflowId = workflowMatch[1];
    return <ProtectedRoute page="editor" workflowId={workflowId} />;
  }

  // Home page - workflow list
  return <ProtectedRoute page="list" />;
}

/**
 * Protected route - shows login if not authenticated
 */
function ProtectedRoute({
  page,
  workflowId,
}: {
  page: "list" | "editor" | "admin";
  workflowId?: string;
}) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen font-sans">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (page === "admin") {
    return <AdminPage />;
  }

  if (page === "editor") {
    return <WorkflowEditor workflowId={workflowId} />;
  }

  return <WorkflowListPage />;
}

export function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </I18nProvider>
  );
}
