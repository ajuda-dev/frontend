import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../context/AuthContext";
import type { EventItem } from "../../types/api";
import { EventDetailPage } from "./EventDetailPage";

vi.mock("../../services/event", () => ({
  findEventById: vi.fn(),
  listEvents: vi.fn(),
}));

import { findEventById } from "../../services/event";

const mockedFind = vi.mocked(findEventById);

const EVENT: EventItem = {
  id: "e1",
  title: "Meetup Dev SP",
  description: "Encontro mensal da comunidade",
  category: "COMMUNITY_EVENT",
  type: "INPERSON",
  start_at: "2026-10-01T18:00:00-03:00",
  duration_min: 90,
  address: { id: "a1", zip_code: "01001000", city: "São Paulo", state: "SP" },
  owner: { id: "owner-1", name: "Ana", email: "ana@ajudadev.dev", role: "USER" },
  community: { id: "c1", name: "Dev SP", description: "Comunidade de São Paulo" },
};

function seedSession(id = "u1") {
  localStorage.setItem("ajudadev.token", "token-123");
  localStorage.setItem(
    "ajudadev.user",
    JSON.stringify({ id, name: "Lucas Rocha", email: "lucas@ajudadev.dev", role: "USER" }),
  );
}

function renderDetail(state?: { event: EventItem }) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: "/eventos/e1", state }]}>
      <AuthProvider>
        <Routes>
          <Route path="/eventos/:id" element={<EventDetailPage />} />
          <Route path="/eventos" element={<p>Lista de eventos</p>} />
          <Route path="/comunidades/:id" element={<p>Detalhe da comunidade</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("EventDetailPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    seedSession();
  });

  it("com state da lista não chama a API", async () => {
    renderDetail({ event: EVENT });

    expect(await screen.findByRole("heading", { name: "Meetup Dev SP" })).toBeInTheDocument();
    expect(mockedFind).not.toHaveBeenCalled();
    expect(screen.getByText("Encontro mensal da comunidade")).toBeInTheDocument();
  });

  it("sem state busca pelo id (acesso direto/refresh)", async () => {
    mockedFind.mockResolvedValue(EVENT);
    renderDetail();

    expect(await screen.findByRole("heading", { name: "Meetup Dev SP" })).toBeInTheDocument();
    expect(mockedFind).toHaveBeenCalledWith("e1", expect.anything());
  });

  it("state de outro evento é ignorado", async () => {
    mockedFind.mockResolvedValue(EVENT);
    renderDetail({ event: { ...EVENT, id: "e9" } });

    expect(await screen.findByRole("heading", { name: "Meetup Dev SP" })).toBeInTheDocument();
    expect(mockedFind).toHaveBeenCalledWith("e1", expect.anything());
  });

  it("não encontrado mostra estado amigável com volta para a lista", async () => {
    mockedFind.mockResolvedValue(null);
    renderDetail();

    expect(await screen.findByText("Evento não encontrado ou removido.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar para a lista" })).toHaveAttribute(
      "href",
      "/eventos",
    );
  });

  it("erro mostra Alert com Tentar novamente", async () => {
    mockedFind.mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce(EVENT);
    renderDetail();

    expect(await screen.findByText("Não foi possível carregar o evento")).toBeInTheDocument();
  });

  it("mostra data, duração, endereço e owner", async () => {
    renderDetail({ event: EVENT });

    await screen.findByRole("heading", { name: "Meetup Dev SP" });
    expect(screen.getAllByText("01/10/2026, 18:00").length).toBeGreaterThan(0);
    expect(screen.getByText("90 min")).toBeInTheDocument();
    expect(screen.getByText("São Paulo/SP")).toBeInTheDocument();
    expect(screen.getByText("Ana")).toBeInTheDocument();
  });

  it("evento com community mostra o link com state", async () => {
    renderDetail({ event: EVENT });

    const link = await screen.findByRole("link", { name: "Comunidade: Dev SP" });
    expect(link).toHaveAttribute("href", "/comunidades/c1");
  });

  it("owner vê o badge Você organiza", async () => {
    seedSession("owner-1");
    renderDetail({ event: EVENT });

    expect(await screen.findByText("Você organiza")).toBeInTheDocument();
  });

  it("não-owner não vê o badge Você organiza", async () => {
    renderDetail({ event: EVENT });

    await screen.findByRole("heading", { name: "Meetup Dev SP" });
    expect(screen.queryByText("Você organiza")).not.toBeInTheDocument();
  });

  it("online com meeting_link mostra o link em nova aba", async () => {
    renderDetail({
      event: { ...EVENT, type: "ONLINE", address: null, meeting_link: "https://meet.example.com/x" },
    });

    const link = await screen.findByRole("link", { name: "Acessar link da reunião" });
    expect(link).toHaveAttribute("href", "https://meet.example.com/x");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("online sem meeting_link avisa que o link será divulgado", async () => {
    renderDetail({ event: { ...EVENT, type: "ONLINE", address: null } });

    expect(await screen.findByText("Evento online — link será divulgado.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Acessar link da reunião" })).not.toBeInTheDocument();
  });
});
