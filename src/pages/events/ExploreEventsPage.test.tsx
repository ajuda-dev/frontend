import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../context/AuthContext";
import type { EventItem, Pageable } from "../../types/api";
import { ExploreEventsPage } from "./ExploreEventsPage";

vi.mock("../../services/event", () => ({
  listEvents: vi.fn(),
}));

import { listEvents } from "../../services/event";

const mockedList = vi.mocked(listEvents);

function event(id: string, title: string): EventItem {
  return {
    id,
    title,
    description: "Evento de testes",
    category: "COMMUNITY_EVENT",
    type: "ONLINE",
    start_at: "2026-10-01T18:00:00-03:00",
    duration_min: 60,
    owner: { id: "owner-1", name: "Ana", email: "ana@ajudadev.dev", role: "USER" },
  };
}

function page(data: EventItem[], hasNext: boolean): Pageable<EventItem> {
  return { data, has_next: hasNext };
}

function seedSession() {
  localStorage.setItem(
    "ajudadev.user",
    JSON.stringify({ id: "u1", name: "Lucas Rocha", email: "lucas@ajudadev.dev", role: "USER" }),
  );
}

function renderPage(entry = "/eventos") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <AuthProvider>
        <ExploreEventsPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("ExploreEventsPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    seedSession();
  });

  it("lista vazia mostra EmptyState", async () => {
    mockedList.mockResolvedValue(page([], false));
    renderPage();

    expect(await screen.findByText("Nenhum evento encontrado.")).toBeInTheDocument();
  });

  it("erro mostra Alert com Tentar novamente", async () => {
    mockedList.mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce(page([], false));
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Não foi possível carregar os eventos")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByText("Nenhum evento encontrado.")).toBeInTheDocument();
  });

  it("renderiza o card com data, local, duração e owner", async () => {
    mockedList.mockResolvedValue(page([event("e1", "Meetup Dev SP")], false));
    renderPage();

    expect(await screen.findByRole("link", { name: "Meetup Dev SP" })).toBeInTheDocument();
    expect(screen.getByText("01/10/2026, 18:00")).toBeInTheDocument();
    expect(screen.getAllByText("Online").length).toBeGreaterThan(0);
    expect(screen.getByText("60 min")).toBeInTheDocument();
    expect(screen.getByText("por Ana")).toBeInTheDocument();
  });

  it("Carregar mais só aparece com has_next e faz append", async () => {
    mockedList
      .mockResolvedValueOnce(page([event("e1", "Meetup Dev SP")], true))
      .mockResolvedValueOnce(page([event("e2", "Webinar Go")], false));
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole("link", { name: "Meetup Dev SP" });
    await user.click(screen.getByRole("button", { name: "Carregar mais" }));

    expect(await screen.findByRole("link", { name: "Webinar Go" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Carregar mais" })).not.toBeInTheDocument();
    expect(mockedList).toHaveBeenLastCalledWith({
      page: 2,
      category: "",
      type: "",
      city: "",
      upcoming: false,
      communityId: "",
    });
  });

  it("filtros da URL são enviados na primeira carga", async () => {
    mockedList.mockResolvedValue(page([], false));
    renderPage("/eventos?category=MENTORING&type=HYBRID&city=Recife&upcoming=true");

    await waitFor(() =>
      expect(mockedList).toHaveBeenCalledWith({
        page: 1,
        category: "MENTORING",
        type: "HYBRID",
        city: "Recife",
        upcoming: true,
        communityId: "",
      }),
    );
  });

  it("selecionar categoria reseta a lista para a página 1 com o filtro", async () => {
    mockedList.mockResolvedValue(page([event("e1", "Meetup Dev SP")], false));
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole("link", { name: "Meetup Dev SP" });
    await user.selectOptions(screen.getByLabelText("Categoria"), "WEBINAR");

    await waitFor(() =>
      expect(mockedList).toHaveBeenLastCalledWith({
        page: 1,
        category: "WEBINAR",
        type: "",
        city: "",
        upcoming: false,
        communityId: "",
      }),
    );
  });

  it("toggle Somente futuros envia upcoming=true", async () => {
    mockedList.mockResolvedValue(page([event("e1", "Meetup Dev SP")], false));
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole("link", { name: "Meetup Dev SP" });
    await user.click(screen.getByLabelText("Somente futuros"));

    await waitFor(() =>
      expect(mockedList).toHaveBeenLastCalledWith({
        page: 1,
        category: "",
        type: "",
        city: "",
        upcoming: true,
        communityId: "",
      }),
    );
  });

  it("filtro de cidade com debounce reseta a lista", async () => {
    mockedList.mockResolvedValue(page([event("e1", "Meetup Dev SP")], false));
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole("link", { name: "Meetup Dev SP" });
    await user.type(screen.getByLabelText("Cidade"), "Recife");

    await waitFor(() =>
      expect(mockedList).toHaveBeenLastCalledWith({
        page: 1,
        category: "",
        type: "",
        city: "Recife",
        upcoming: false,
        communityId: "",
      }),
    );
  });

  it("filtro sem resultado mostra EmptyState específico", async () => {
    mockedList.mockResolvedValue(page([], false));
    renderPage("/eventos?category=WEBINAR");

    expect(
      await screen.findByText(
        "Nenhum evento com esses filtros. Ajuste ou limpe os filtros para ver mais resultados.",
      ),
    ).toBeInTheDocument();
  });

  it("evento presencial mostra cidade/UF do endereço", async () => {
    mockedList.mockResolvedValue(
      page(
        [
          {
            ...event("e1", "Encontro presencial"),
            type: "INPERSON",
            address: { id: "a1", zip_code: "01001000", city: "São Paulo", state: "SP" },
          },
        ],
        false,
      ),
    );
    renderPage();

    expect(await screen.findByText("São Paulo/SP")).toBeInTheDocument();
  });
});
