import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar/Sidebar.jsx";
import AdminLoadingScreen from "../components/Loading/AdminLoadingScreen.jsx";
import alinafeLogo from "../assets/alinafe-logo.png";
import restockLogo from "../assets/restock-tech-logo.png";

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

  return (
    <div className="min-h-screen bg-slate-50">
      {pageTransition ? (
        <AdminLoadingScreen mode="compact" message="Loading page..." />
      ) : null}

      <Sidebar />

      <main className="lg:pl-72">
        <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-xl lg:px-8">
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
