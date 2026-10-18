import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  api,
  clearAccessToken,
  getAccessToken,
  refreshBrowserSession,
  setAccessToken,
} from "../services/api";

const AuthContext = createContext(null);

const parseStoredUser = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getAccessToken);
  const [user, setUser] = useState(parseStoredUser);
  const [isChecking, setIsChecking] = useState(true);

  const clearSession = useCallback(({ notifyServer = true } = {}) => {
    if (notifyServer) api.post("/auth/logout", null, { skipRefresh: true }).catch(() => {});
    clearAccessToken();
    if (typeof window !== "undefined") window.localStorage.removeItem("user");
    setToken("");
    setUser(null);
  }, []);

  const setSession = useCallback(({ token: nextToken, user: nextUser }) => {
    if (!nextToken) return;
    setAccessToken(nextToken);
    if (typeof window !== "undefined") {
      if (nextUser) window.localStorage.setItem("user", JSON.stringify(nextUser));
      else window.localStorage.removeItem("user");
    }
    setToken(nextToken);
    setUser(nextUser || null);
  }, []);

  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      try {
        const nextToken = await refreshBrowserSession();
        if (!mounted) return;
        setToken(nextToken);
        const { data } = await api.get("/profile/me");
        const profile = data?.item ?? data?.data ?? null;
        if (mounted) setUser((prev) => prev || profile?.user || parseStoredUser());
      } catch {
        if (mounted) clearSession({ notifyServer: false });
      } finally {
        if (mounted) setIsChecking(false);
      }
    };
    bootstrap();
    return () => {
      mounted = false;
    };
  }, [clearSession]);

  useEffect(() => {
    const expire = () => clearSession({ notifyServer: false });
    window.addEventListener("alinafe:session-expired", expire);
    return () => window.removeEventListener("alinafe:session-expired", expire);
  }, [clearSession]);

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      isChecking,
      setSession,
      logout: () => clearSession({ notifyServer: true }),
    }),
    [token, user, isChecking, setSession, clearSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
