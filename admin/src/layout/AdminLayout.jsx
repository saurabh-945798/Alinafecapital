import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar/Sidebar.jsx";

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />

      {/* main area */}
      <main className="lg:pl-72">
        <div className="px-4 py-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}