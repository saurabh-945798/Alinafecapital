import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  api,
  clearAccessToken,
  getAccessToken,
  refreshBrowserSession,
  setAccessToken,
} from "../services/api";

const AuthContext = createContext(null);
const CUSTOMER_ACTIVITY_KEY = "alinafe:customer:last-activity";
const CUSTOMER_LOGOUT_KEY = "alinafe:customer:logout-at";
const IDLE_MINUTES = Math.max(1, Number(import.meta.env.VITE_SESSION_IDLE_MINUTES || 10));
const IDLE_MS = IDLE_MINUTES * 60 * 1000;

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
      window.localStorage.setItem(CUSTOMER_ACTIVITY_KEY, String(Date.now()));
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

  useEffect(() => {
    if (!token || typeof window === "undefined") return undefined;

    let lastWrite = 0;
    let loggingOut = false;
    const readLastActivity = () => Number(window.localStorage.getItem(CUSTOMER_ACTIVITY_KEY) || 0);
    const touch = () => {
      const now = Date.now();
      // Avoid excessive localStorage writes on mouse/scroll activity.
      if (now - lastWrite < 2000) return;
      lastWrite = now;
      window.localStorage.setItem(CUSTOMER_ACTIVITY_KEY, String(now));
    };
    const idleLogout = () => {
      if (loggingOut) return;
      loggingOut = true;
      window.localStorage.setItem(CUSTOMER_LOGOUT_KEY, String(Date.now()));
      clearSession({ notifyServer: true });
      window.location.replace("/login?reason=idle");
    };
    const checkIdle = () => {
      const last = readLastActivity();
      if (last && Date.now() - last >= IDLE_MS) idleLogout();
    };
    const onStorage = (event) => {
      if (event.key === CUSTOMER_LOGOUT_KEY && event.newValue) {
        clearSession({ notifyServer: false });
        if (!window.location.pathname.startsWith("/login")) window.location.replace("/login?reason=idle");
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") checkIdle();
    };
    const events = ["pointerdown", "keydown", "touchstart", "scroll"];
    events.forEach((eventName) => window.addEventListener(eventName, touch, { passive: true }));
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibility);

    if (!readLastActivity()) touch();
    checkIdle();
    const timer = window.setInterval(checkIdle, 15_000);

    return () => {
      window.clearInterval(timer);
      events.forEach((eventName) => window.removeEventListener(eventName, touch));
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [token, clearSession]);

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
