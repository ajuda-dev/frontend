import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../../context/useAuth";

export function GuestRoute() {
  const { user } = useAuth();
  const location = useLocation();

  if (user) {
    // Pós-registro a sessão nasce no mesmo submit; senão o GuestRoute manda para a
    // home antes do navigate("/confirmar-email") da página.
    if (location.pathname === "/registro" && !user.emailVerified) {
      return <Navigate to="/confirmar-email" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
