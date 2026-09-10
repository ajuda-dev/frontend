import { Navigate, Outlet } from "react-router";
import { useAuth } from "../../context/useAuth";

export function GuestRoute() {
  const { session } = useAuth();

  if (session) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
