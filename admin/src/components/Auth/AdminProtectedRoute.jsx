import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getActiveAdminKey } from "../../utils/adminAuth";

export default function AdminProtectedRoute() {
  const location = useLocation();
  const hasKey = Boolean(getActiveAdminKey());

  if (!hasKey) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/admin/access?next=${next}`} replace />;
  }

  return <Outlet />;
}

