import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../../context/useAuth";

export function ProtectedRoute() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}
