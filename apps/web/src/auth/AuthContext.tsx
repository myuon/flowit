import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { AuthUser, AuthSession } from "@flowit/shared";
import { getLoginUrl } from "./config";
import { getCurrentUser } from "../api/client";

const AUTH_STORAGE_KEY = "flowit-auth";
const ADMIN_STORAGE_KEY = "flowit-admin";

interface AuthContextValue {
  /** Current authenticated user, null if not authenticated */
  user: AuthUser | null;
  /** Current auth session with tokens */
  session: AuthSession | null;
  /** Whether auth state is still loading */
  isLoading: boolean;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Whether user is admin */
  isAdmin: boolean;
  /** Start login flow */
  login: () => void;
  /** Logout and clear session */
  logout: () => void;
  /** Get current access token (for API calls) */
  getAccessToken: () => string | null;
  /** Save session after OAuth callback */
  saveSession: (session: AuthSession) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Load session from storage
 */
function loadSession(): AuthSession | null {
  try {
    const stored = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return null;

    const session = JSON.parse(stored) as AuthSession;

    // Check if expired
    if (session.expiresAt < Date.now()) {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Save session to storage
 */
function persistSession(session: AuthSession): void {
  sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

/**
 * Clear session from storage
 */
function clearSession(): void {
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from storage and fetch admin status
  useEffect(() => {
    const init = async () => {
      const storedSession = loadSession();
      if (storedSession) {
        setSession(storedSession);
        setUser(storedSession.user);

        // Check cached admin status first
        const cachedAdmin = sessionStorage.getItem(ADMIN_STORAGE_KEY);
        if (cachedAdmin !== null) {
          setIsAdmin(cachedAdmin === "true");
        }

        // Fetch fresh admin status from API
        try {
          const { isAdmin: adminStatus } = await getCurrentUser();
          setIsAdmin(adminStatus);
          sessionStorage.setItem(ADMIN_STORAGE_KEY, String(adminStatus));
        } catch {
          // If API call fails, keep cached value
        }
      }
      setIsLoading(false);
    };
    init();
  }, []);

  const login = useCallback(() => {
    // Redirect to API login endpoint
    window.location.href = getLoginUrl();
  }, []);

  const logout = useCallback(() => {
    clearSession();
    sessionStorage.removeItem(ADMIN_STORAGE_KEY);
    setSession(null);
    setUser(null);
    setIsAdmin(false);
    // Redirect to home
    window.location.href = "/";
  }, []);

  const getAccessToken = useCallback(() => {
    return session?.accessToken || null;
  }, [session]);

  const saveSession = useCallback((newSession: AuthSession) => {
    persistSession(newSession);
    setSession(newSession);
    setUser(newSession.user);
  }, []);

  const value: AuthContextValue = {
    user,
    session,
    isLoading,
    isAuthenticated: !!user,
    isAdmin,
    login,
    logout,
    getAccessToken,
    saveSession,
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
