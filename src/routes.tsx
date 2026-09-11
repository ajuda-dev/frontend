import { Navigate, Route, Routes } from "react-router";
import { GuestRoute } from "./components/auth/GuestRoute";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import { NotFoundPage } from "./pages/NotFoundPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { CommunityDetailPage } from "./pages/communities/CommunityDetailPage";
import { ExploreCommunitiesPage } from "./pages/communities/ExploreCommunitiesPage";
import { NewCommunityPage } from "./pages/communities/NewCommunityPage";
import { EventDetailPage } from "./pages/events/EventDetailPage";
import { ExploreEventsPage } from "./pages/events/ExploreEventsPage";
import { NewEventPage } from "./pages/events/NewEventPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/comunidades" replace />} />
          <Route path="/comunidades" element={<ExploreCommunitiesPage />} />
          <Route path="/comunidades/nova" element={<NewCommunityPage />} />
          <Route path="/comunidades/:id" element={<CommunityDetailPage />} />
          <Route path="/eventos" element={<ExploreEventsPage />} />
          <Route path="/eventos/novo" element={<NewEventPage />} />
          <Route path="/eventos/:id" element={<EventDetailPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
