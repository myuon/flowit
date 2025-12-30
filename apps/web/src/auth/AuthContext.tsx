import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { AuthUser } from "@flowit/shared";
import { getLoginUrl, getLogoutUrl } from "./config";
import { client } from "../api/client";

interface AuthContextValue {
  /** Current authenticated user, null if not authenticated */
  user: AuthUser | null;
  /** Whether auth state is still loading */
  isLoading: boolean;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Whether user is admin */
  isAdmin: boolean;
  /** Start login flow */
  login: () => void;
  /** Logout and clear session */
  logout: () => Promise<void>;
  /** Re-check authentication status */
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status by calling /auth/me
  const checkAuth = useCallback(async () => {
    try {
      const res = await client.auth.me.$get();
      if (!res.ok) {
        throw new Error("Not authenticated");
      }
      const { user: authUser, isAdmin: adminStatus } = await res.json();
      setUser(authUser);
      setIsAdmin(adminStatus);
    } catch {
      // 401 or other error - user is not authenticated
      setUser(null);
      setIsAdmin(false);
    }
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    const init = async () => {
      await checkAuth();
      setIsLoading(false);
    };
    init();
  }, [checkAuth]);

  const login = useCallback(() => {
    // Redirect to API login endpoint
    window.location.href = getLoginUrl();
  }, []);

  const logout = useCallback(async () => {
    try {
      // Call logout API to clear server-side session and cookie
      await fetch(getLogoutUrl(), {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Ignore errors - still clear local state
    }

    setUser(null);
    setIsAdmin(false);

    // Redirect to home
    window.location.href = "/";
  }, []);

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin,
    login,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
