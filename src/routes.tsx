import { Navigate, Route, Routes } from "react-router";
import { GuestRoute } from "./components/auth/GuestRoute";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import { NotFoundPage } from "./pages/NotFoundPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { CommunityDetailPage } from "./pages/communities/CommunityDetailPage";
import { EditCommunityPage } from "./pages/communities/EditCommunityPage";
import { ExploreCommunitiesPage } from "./pages/communities/ExploreCommunitiesPage";
import { NewCommunityPage } from "./pages/communities/NewCommunityPage";
import { EventDetailPage } from "./pages/events/EventDetailPage";
import { ExploreEventsPage } from "./pages/events/ExploreEventsPage";
import { MyAgendaPage } from "./pages/events/MyAgendaPage";
import { NewEventPage } from "./pages/events/NewEventPage";
import { PeoplePage } from "./pages/people/PeoplePage";
import { PersonProfilePage } from "./pages/people/PersonProfilePage";
import { MyProfilePage } from "./pages/profile/MyProfilePage";
import { SkillsPage } from "./pages/skills/SkillsPage";

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
          <Route path="/comunidades/:id/editar" element={<EditCommunityPage />} />
          <Route path="/eventos" element={<ExploreEventsPage />} />
          <Route path="/eventos/novo" element={<NewEventPage />} />
          <Route path="/eventos/:id" element={<EventDetailPage />} />
          <Route path="/agenda" element={<MyAgendaPage />} />
          <Route path="/skills" element={<SkillsPage />} />
          <Route path="/pessoas" element={<PeoplePage />} />
          <Route path="/pessoas/:userId" element={<PersonProfilePage />} />
          <Route path="/perfil" element={<MyProfilePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
