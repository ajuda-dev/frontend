import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useSearchParams } from "react-router";
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
  updateParticipantComment: vi.fn(),
}));

import { findEventById, listEvents } from "../../services/event";
import { getParticipants } from "../../services/eventUser";

const mockedListEvents = vi.mocked(listEvents);
const mockedParticipants = vi.mocked(getParticipants);
const mockedFind = vi.mocked(findEventById);

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
  localStorage.setItem(
    "ajudadev.user",
    JSON.stringify({ id: "u1", name: "Lucas Rocha", email: "lucas@ajudadev.dev", role: "USER" }),
  );
}

function CreateProbe() {
  const [params] = useSearchParams();
  return <p>criar:{params.get("start_at") ?? ""}</p>;
}

function renderAgenda(entry = "/agenda?view=week&date=2026-10-01") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <AuthProvider>
        <Routes>
          <Route path="/agenda" element={<MyAgendaPage />} />
          <Route path="/eventos/:id" element={<EventDetailPage />} />
          <Route path="/eventos/novo" element={<CreateProbe />} />
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
    mockedFind.mockResolvedValue(null);
  });

  it("carrega confirmados e convites com user_id e limit 50", async () => {
    renderAgenda();

    await waitFor(() => expect(mockedListEvents).toHaveBeenCalledTimes(2));
    expect(mockedListEvents).toHaveBeenCalledWith({
      page: 1,
      limit: 50,
      userId: "u1",
      status: "CONFIRMED",
      signal: expect.any(AbortSignal),
    });
    expect(mockedListEvents).toHaveBeenCalledWith({
      page: 1,
      limit: 50,
      userId: "u1",
      status: "REQUESTED",
      signal: expect.any(AbortSignal),
    });
  });

  it("mostra a grade mesmo sem eventos", async () => {
    renderAgenda();

    expect(await screen.findByRole("heading", { name: "Agenda" })).toBeInTheDocument();
    expect(screen.getByText("14:00")).toBeInTheDocument();
    expect(screen.queryByText("Nenhum evento confirmado.")).not.toBeInTheDocument();
  });

  it("mostra eventos confirmados e convites na semana", async () => {
    mockedListEvents.mockImplementation(async (params) => {
      if (params.status === "CONFIRMED") {
        return { data: [event("e1", "Meetup confirmado")], has_next: false };
      }
      return { data: [event("e2", "Mentoria pendente")], has_next: false };
    });
    renderAgenda();

    expect(await screen.findByRole("link", { name: /Meetup confirmado/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Mentoria pendente/ })).toBeInTheDocument();
  });

  it("navega do bloco para o detalhe do evento", async () => {
    mockedListEvents.mockImplementation(async (params) => {
      if (params.status === "CONFIRMED") {
        return { data: [event("e1", "Meetup confirmado")], has_next: false };
      }
      return { data: [], has_next: false };
    });
    mockedFind.mockResolvedValue(event("e1", "Meetup confirmado"));
    const user = userEvent.setup();
    renderAgenda();

    await user.click(await screen.findByRole("link", { name: /Meetup confirmado/ }));

    expect(await screen.findByRole("heading", { name: "Meetup confirmado" })).toBeInTheDocument();
  });

  it("clique em horário vazio abre criar evento com a data preenchida", async () => {
    const user = userEvent.setup();
    renderAgenda();

    await user.click(
      await screen.findByRole("button", {
        name: "Criar evento em quinta-feira, 1 de outubro de 2026 às 14:00",
      }),
    );

    expect(await screen.findByText("criar:2026-10-01T14:00")).toBeInTheDocument();
  });

  it("troca para a visão mês", async () => {
    mockedListEvents.mockImplementation(async (params) => {
      if (params.status === "CONFIRMED") {
        return { data: [event("e1", "Meetup confirmado")], has_next: false };
      }
      return { data: [], has_next: false };
    });
    const user = userEvent.setup();
    renderAgenda();

    await user.selectOptions(await screen.findByLabelText("Visão da agenda"), "month");

    expect(await screen.findByRole("link", { name: /Meetup confirmado/ })).toBeInTheDocument();
    expect(screen.queryByText("14:00")).not.toBeInTheDocument();
  });

  it("botão Criar vai para o formulário sem horário", async () => {
    const user = userEvent.setup();
    renderAgenda();

    await user.click(await screen.findByRole("button", { name: "+ Criar" }));

    expect(await screen.findByText("criar:")).toBeInTheDocument();
  });
});
