import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { ApiProfile } from "@/lib/types.ts";
import {
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  getProfile as apiGetProfile,
  setToken,
} from "@/lib/api.ts";

interface AuthContextValue {
  user: ApiProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  handleOAuthCallback: (accessToken: string) => Promise<void>;
  updateUser: (updates: Partial<ApiProfile>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: try silent refresh
  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setToken(data.access_token);
          // Fetch profile
          const profileRes = await fetch(`${API_BASE}/api/profiles/me`, {
            headers: { Authorization: `Bearer ${data.access_token}` },
            credentials: "include",
          });
          if (profileRes.ok) {
            setUser(await profileRes.json());
          }
        }
      } catch {
        // Not authenticated, that's fine
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    setToken(res.access_token);
    setUser(res.profile);
  }, []);

  const signup = useCallback(
    async (email: string, password: string, displayName: string) => {
      const res = await apiRegister(email, password, displayName);
      setToken(res.access_token);
      setUser(res.profile);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // ignore logout errors
    }
    setToken(null);
    setUser(null);
  }, []);

  const handleOAuthCallback = useCallback(async (accessToken: string) => {
    setToken(accessToken);
    const profile = await apiGetProfile();
    setUser(profile);
  }, []);

  const updateUser = useCallback((updates: Partial<ApiProfile>) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const profile = await apiGetProfile();
      setUser(profile);
    } catch {
      // ignore refresh errors
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        handleOAuthCallback,
        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
