import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isAdminLoggedIn } from "../../utils/adminAuth";

export default function AdminProtectedRoute() {
  const location = useLocation();
  const hasSession = isAdminLoggedIn();

  if (!hasSession) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/admin/login?next=${next}`} replace />;
  }

  return <Outlet />;
}
