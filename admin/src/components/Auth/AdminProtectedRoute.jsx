import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { refreshAdminSession } from "../../services/api/axios";
import { getAdminUser, isAdminLoggedIn } from "../../utils/adminAuth";
import { hasAnyRole } from "../../utils/adminRbac";

export default function AdminProtectedRoute({ allowedRoles = [], children = null }) {
  const location = useLocation();
  const [checking, setChecking] = useState(() => !isAdminLoggedIn());
  const [hasSession, setHasSession] = useState(isAdminLoggedIn);
  const adminUser = getAdminUser();

  useEffect(() => {
    let active = true;
    if (hasSession) {
      setChecking(false);
      return () => {
        active = false;
      };
    }

    refreshAdminSession()
      .then(() => {
        if (active) setHasSession(true);
      })
      .catch(() => {
        if (active) setHasSession(false);
      })
      .finally(() => {
        if (active) setChecking(false);
      });

    return () => {
      active = false;
    };
  }, [hasSession]);

  if (checking) return null;

  if (!hasSession) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/admin/login?next=${next}`} replace />;
  }

  if (allowedRoles.length > 0 && !hasAnyRole(adminUser, allowedRoles)) {
    return <Navigate to="/admin" replace />;
  }

  return children || <Outlet />;
}
