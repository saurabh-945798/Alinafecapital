import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

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
  const [token, setToken] = useState(() =>
    typeof window === "undefined" ? "" : window.localStorage.getItem("token") || ""
  );
  const [user, setUser] = useState(parseStoredUser);
  const [isChecking, setIsChecking] = useState(true);

  const clearSession = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("token");
      window.localStorage.removeItem("user");
    }
    setToken("");
    setUser(null);
  }, []);

  const setSession = useCallback(({ token: nextToken, user: nextUser }) => {
    if (!nextToken) return;
    if (typeof window !== "undefined") {
      window.localStorage.setItem("token", nextToken);
      if (nextUser) {
        window.localStorage.setItem("user", JSON.stringify(nextUser));
      } else {
        window.localStorage.removeItem("user");
      }
    }
    setToken(nextToken);
    setUser(nextUser || null);
  }, []);

  useEffect(() => {
    let mounted = true;

    const verifyExistingToken = async () => {
      if (!token) {
        if (mounted) setIsChecking(false);
        return;
      }

      try {
        const { data } = await api.get("/profile/me");
        const profile = data?.item ?? data?.data ?? null;
        if (mounted) {
          setUser((prev) => prev || profile?.user || parseStoredUser());
        }
      } catch (err) {
        const status = err?.response?.status;
        if (status === 401) {
          clearSession();
        }
      } finally {
        if (mounted) setIsChecking(false);
      }
    };

    verifyExistingToken();
    return () => {
      mounted = false;
    };
  }, [token, clearSession]);

  useEffect(() => {
    const interceptorId = api.interceptors.response.use(
      (response) => response,
      (error) => Promise.reject(error)
    );

    return () => {
      api.interceptors.response.eject(interceptorId);
    };
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: !!token,
      isChecking,
      setSession,
      logout: clearSession,
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
