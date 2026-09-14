import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../context/AuthContext";
import type { EventItem } from "../../types/api";
import { EventDetailPage } from "./EventDetailPage";
import { MyAgendaPage } from "./MyAgendaPage";

vi.mock("../../services/event", () => ({
  findEventById: vi.fn(),
  listEvents: vi.fn(),
  createEvent: vi.fn(),
  deleteEvent: vi.fn(),
}));

vi.mock("../../services/eventUser", () => ({
  joinEvent: vi.fn(),
  cancelParticipation: vi.fn(),
  getParticipants: vi.fn(),
  addParticipant: vi.fn(),
  updateParticipantStatus: vi.fn(),
}));

import { listEvents } from "../../services/event";
import { getParticipants } from "../../services/eventUser";

const mockedListEvents = vi.mocked(listEvents);
const mockedParticipants = vi.mocked(getParticipants);

function event(id: string, title: string): EventItem {
  return {
    id,
    title,
    description: "descrição",
    category: "COMMUNITY_EVENT",
    type: "ONLINE",
    start_at: "2026-10-01T18:00:00-03:00",
    duration_min: 60,
  };
}

function seedSession() {
  localStorage.setItem("ajudadev.token", "token-123");
  localStorage.setItem(
    "ajudadev.user",
    JSON.stringify({ id: "u1", name: "Lucas Rocha", email: "lucas@ajudadev.dev", role: "USER" }),
  );
}

function renderAgenda() {
  return render(
    <MemoryRouter initialEntries={["/agenda"]}>
      <AuthProvider>
        <Routes>
          <Route path="/agenda" element={<MyAgendaPage />} />
          <Route path="/eventos/:id" element={<EventDetailPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("MyAgendaPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    seedSession();
    mockedListEvents.mockResolvedValue({ data: [], has_next: false });
    mockedParticipants.mockResolvedValue([]);
  });

  it("carrega os três blocos com user_id e os filtros certos", async () => {
    renderAgenda();

    await waitFor(() => expect(mockedListEvents).toHaveBeenCalledTimes(3));
    expect(mockedListEvents).toHaveBeenCalledWith({ page: 1, userId: "u1", status: "CONFIRMED" });
    expect(mockedListEvents).toHaveBeenCalledWith({ page: 1, userId: "u1", status: "REQUESTED" });
    expect(mockedListEvents).toHaveBeenCalledWith({ page: 1, userId: "u1", status: "CANCELLED" });
  });

  it("blocos vazios mostram um EmptyState cada", async () => {
    renderAgenda();

    expect(await screen.findByText("Nenhum evento confirmado.")).toBeInTheDocument();
    expect(screen.getByText("Nenhum convite de mentoria pendente.")).toBeInTheDocument();
    expect(screen.getByText("Nenhuma inscrição cancelada.")).toBeInTheDocument();
  });

  it("mostra os eventos de cada bloco", async () => {
    mockedListEvents.mockImplementation(async (params) => {
      if (params.status === "CONFIRMED") {
        return { data: [event("e1", "Meetup confirmado")], has_next: false };
      }
      if (params.status === "REQUESTED") {
        return { data: [event("e2", "Mentoria pendente")], has_next: false };
      }
      return { data: [event("e3", "Evento cancelado")], has_next: false };
    });
    renderAgenda();

    expect(await screen.findByText("Meetup confirmado")).toBeInTheDocument();
    expect(await screen.findByText("Mentoria pendente")).toBeInTheDocument();
    expect(await screen.findByText("Evento cancelado")).toBeInTheDocument();
  });

  it("navega do card para o detalhe do evento", async () => {
    mockedListEvents.mockImplementation(async (params) => {
      if (params.status === "CONFIRMED") {
        return { data: [event("e1", "Meetup confirmado")], has_next: false };
      }
      return { data: [], has_next: false };
    });
    const user = userEvent.setup();
    renderAgenda();

    await user.click(await screen.findByRole("link", { name: "Ver detalhes" }));

    expect(await screen.findByRole("heading", { name: "Meetup confirmado" })).toBeInTheDocument();
  });
});
