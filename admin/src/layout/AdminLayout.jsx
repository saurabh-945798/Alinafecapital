import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar/Sidebar.jsx";
import AdminLoadingScreen from "../components/Loading/AdminLoadingScreen.jsx";
import alinafeLogo from "../assets/alinafe-logo.png";
import restockLogo from "../assets/restock-tech-logo.png";
import { api } from "../services/api/axios.js";
import { clearAdminSession, isAdminLoggedIn } from "../utils/adminAuth.js";

const ADMIN_ACTIVITY_KEY = "alinafe:admin:last-activity";
const ADMIN_LOGOUT_KEY = "alinafe:admin:logout-at";
const ADMIN_IDLE_MINUTES = Math.max(1, Number(import.meta.env.VITE_SESSION_IDLE_MINUTES || 10));
const ADMIN_IDLE_MS = ADMIN_IDLE_MINUTES * 60 * 1000;

export default function AdminLayout() {
  const location = useLocation();
  const firstRenderRef = useRef(true);
  const [pageTransition, setPageTransition] = useState(false);

  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return undefined;
    }

    setPageTransition(true);
    const timer = window.setTimeout(() => setPageTransition(false), 360);
    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  useEffect(() => {
    if (!isAdminLoggedIn()) return undefined;
    let lastWrite = 0;
    let loggingOut = false;
    const readLastActivity = () => Number(window.localStorage.getItem(ADMIN_ACTIVITY_KEY) || 0);
    const touch = () => {
      const now = Date.now();
      if (now - lastWrite < 2000) return;
      lastWrite = now;
      window.localStorage.setItem(ADMIN_ACTIVITY_KEY, String(now));
    };
    const idleLogout = () => {
      if (loggingOut) return;
      loggingOut = true;
      window.localStorage.setItem(ADMIN_LOGOUT_KEY, String(Date.now()));
      api.post("/auth/logout", null, { skipRefresh: true }).catch(() => {}).finally(() => {
        clearAdminSession();
        window.location.replace("/admin/login?reason=idle");
      });
    };
    const checkIdle = () => {
      const last = readLastActivity();
      if (last && Date.now() - last >= ADMIN_IDLE_MS) idleLogout();
    };
    const onStorage = (event) => {
      if (event.key === ADMIN_LOGOUT_KEY && event.newValue) {
        clearAdminSession();
        window.location.replace("/admin/login?reason=idle");
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
  }, []);

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f8fafc_0%,#eef4fb_50%,#fbf7ee_100%)]">
      {pageTransition ? (
        <AdminLoadingScreen mode="compact" message="Loading page..." />
      ) : null}

      <Sidebar />

      <main className="lg:pl-72">
        <div className="sticky top-0 z-30 border-b border-[#002D5B]/10 bg-[linear-gradient(120deg,rgba(255,255,255,0.96),rgba(238,245,252,0.94),rgba(252,248,239,0.94))] px-4 py-3 backdrop-blur-xl lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                <img src={alinafeLogo} alt="Alinafe Capital" className="h-8 w-auto object-contain" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Alinafe Capital Admin</p>
                <p className="text-xs text-slate-500">Live loan operations, repayments and reports</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Powered by</span>
              <img src={restockLogo} alt="Restock Tech" className="h-9 w-auto object-contain" />
            </div>
          </div>
        </div>

        <div className="px-4 py-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
