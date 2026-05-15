import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getAdminUser, isAdminLoggedIn } from "../../utils/adminAuth";
import { hasAnyRole } from "../../utils/adminRbac";

export default function AdminProtectedRoute({ allowedRoles = [], children = null }) {
  const location = useLocation();
  const hasSession = isAdminLoggedIn();
  const adminUser = getAdminUser();

  if (!hasSession) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/admin/login?next=${next}`} replace />;
  }

  if (allowedRoles.length > 0 && !hasAnyRole(adminUser?.role, allowedRoles)) {
    return <Navigate to="/admin" replace />;
  }

  return children || <Outlet />;
}
