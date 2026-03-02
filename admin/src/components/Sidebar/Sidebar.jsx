import { useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { ChevronsLeft, ChevronsRight, LogOut, Menu, X } from "lucide-react";
import { sidebarNav } from "./sidebarNav";
import { clearAdminSession, getAdminUser } from "../../utils/adminAuth";

const cx = (...a) => a.filter(Boolean).join(" ");

function NavItems({ collapsed, onNavigate }) {
  const nav = useMemo(() => sidebarNav, []);
  return (
    <nav className="flex-1 overflow-y-auto px-3 pb-4">
      {nav.map((group) => (
        <div key={group.section} className="mb-5">
          {!collapsed && (
            <p className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              {group.section}
            </p>
          )}

          <div className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cx(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                      isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        size={18}
                        className={cx("shrink-0", isActive ? "text-white" : "text-slate-600")}
                      />
                      {!collapsed && <span>{item.label}</span>}
                      {isActive && <span className="absolute right-2 h-2 w-2 rounded-full bg-white/90" />}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export default function Sidebar() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const adminUser = useMemo(() => getAdminUser(), []);

  const width = collapsed ? "w-20" : "w-72";

  const handleLogout = () => {
    clearAdminSession();
    setMobileOpen(false);
    navigate("/admin/login", { replace: true });
  };

  const shell = (
    <div className={cx("flex h-full flex-col", width)}>
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-semibold">
            A
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <p className="text-sm font-semibold text-slate-900">AlinafeCapital</p>
              <p className="text-xs text-slate-500">Admin Panel</p>
            </div>
          )}
        </div>

        <button
          onClick={() => setCollapsed((v) => !v)}
          className="hidden rounded-lg p-2 hover:bg-slate-100 text-slate-700 lg:inline-flex"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
        </button>
      </div>

      <NavItems collapsed={collapsed} onNavigate={() => setMobileOpen(false)} />

      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-3 rounded-xl p-2 hover:bg-slate-50">
          <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-semibold">
            AD
          </div>
          {!collapsed && (
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900">
                {adminUser?.fullName || "Admin"}
              </p>
              <p className="text-xs text-slate-500">{adminUser?.email || "Admin Session"}</p>
            </div>
          )}
          <button
            className="rounded-lg p-2 hover:bg-slate-100 text-slate-700"
            title="Logout"
            onClick={handleLogout}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="sticky top-0 z-40 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">AlinafeCapital Admin</p>
          <button
            className="rounded-lg p-2 text-slate-700 hover:bg-slate-100"
            onClick={() => setMobileOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu size={18} />
          </button>
        </div>
      </div>

      <aside
        className={cx(
          "hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex",
          "border-r border-slate-200 bg-white"
        )}
      >
        {shell}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 border-r border-slate-200 bg-white">
            <div className="flex items-center justify-end px-3 py-3">
              <button
                className="rounded-lg p-2 text-slate-700 hover:bg-slate-100"
                onClick={() => setMobileOpen(false)}
                aria-label="Close sidebar"
              >
                <X size={18} />
              </button>
            </div>
            <div className="-mt-4">{shell}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
