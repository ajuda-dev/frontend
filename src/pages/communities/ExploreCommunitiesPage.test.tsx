import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../context/AuthContext";
import type { Community, Pageable } from "../../types/api";
import { ExploreCommunitiesPage } from "./ExploreCommunitiesPage";

vi.mock("../../services/community", () => ({
  listCommunities: vi.fn(),
  joinCommunity: vi.fn(),
  leaveCommunity: vi.fn(),
}));

import { listCommunities } from "../../services/community";

const mockedList = vi.mocked(listCommunities);

function community(id: string, name: string): Community {
  return {
    id,
    name,
    description: "Comunidade de testes",
    address: { id: "a1", zip_code: "01001000", city: "São Paulo", state: "SP" },
    owner: { id: "owner-1", name: "Ana", email: "ana@ajudadev.dev", role: "USER" },
  };
}

function page(data: Community[], hasNext: boolean): Pageable<Community> {
  return { data, has_next: hasNext };
}

function seedSession() {
  localStorage.setItem("ajudadev.token", "token-123");
  localStorage.setItem(
    "ajudadev.user",
    JSON.stringify({ id: "u1", name: "Lucas Rocha", email: "lucas@ajudadev.dev", role: "USER" }),
  );
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/comunidades"]}>
      <AuthProvider>
        <ExploreCommunitiesPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("ExploreCommunitiesPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    seedSession();
  });

  it("lista vazia mostra EmptyState", async () => {
    mockedList.mockResolvedValue(page([], false));
    renderPage();

    expect(await screen.findByText("Nenhuma comunidade encontrada.")).toBeInTheDocument();
  });

  it("erro mostra Alert com Tentar novamente", async () => {
    mockedList.mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce(page([], false));
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Não foi possível carregar as comunidades")).toBeInTheDocument();
    expect(screen.getByText("Não foi possível concluir a operação. Tente novamente.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByText("Nenhuma comunidade encontrada.")).toBeInTheDocument();
  });

  it("renderiza os cards com cidade, CEP e owner", async () => {
    mockedList.mockResolvedValue(page([community("c1", "Dev SP")], false));
    renderPage();

    expect(await screen.findByRole("link", { name: "Dev SP" })).toBeInTheDocument();
    expect(screen.getByText("São Paulo/SP · CEP 01001-000")).toBeInTheDocument();
    expect(screen.getByText("criada por Ana")).toBeInTheDocument();
  });

  it("Carregar mais só aparece com has_next e faz append", async () => {
    mockedList
      .mockResolvedValueOnce(page([community("c1", "Dev SP")], true))
      .mockResolvedValueOnce(page([community("c2", "Dev RJ")], false));
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole("link", { name: "Dev SP" });
    await user.click(screen.getByRole("button", { name: "Carregar mais" }));

    expect(await screen.findByRole("link", { name: "Dev RJ" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Carregar mais" })).not.toBeInTheDocument();
    expect(mockedList).toHaveBeenLastCalledWith({
      page: 2,
      city: "",
      name: "",
      ownerId: undefined,
    });
  });

  it("sem has_next não mostra Carregar mais", async () => {
    mockedList.mockResolvedValue(page([community("c1", "Dev SP")], false));
    renderPage();

    await screen.findByRole("link", { name: "Dev SP" });
    expect(screen.queryByRole("button", { name: "Carregar mais" })).not.toBeInTheDocument();
  });

  it("filtro com debounce reseta a lista para a página 1", async () => {
    mockedList.mockResolvedValue(page([community("c1", "Dev SP")], false));
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole("link", { name: "Dev SP" });
    await user.type(screen.getByLabelText("Filtrar por cidade"), "Recife");

    await waitFor(() =>
      expect(mockedList).toHaveBeenLastCalledWith({
        page: 1,
        city: "Recife",
        name: "",
        ownerId: undefined,
      }),
    );
  });

  it("busca pelo nome vai com debounce e reseta para a página 1", async () => {
    mockedList.mockResolvedValue(page([community("c1", "Dev SP")], false));
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole("link", { name: "Dev SP" });
    await user.type(screen.getByLabelText("Buscar pelo nome"), "Dev");

    await waitFor(() =>
      expect(mockedList).toHaveBeenLastCalledWith({
        page: 1,
        city: "",
        name: "Dev",
        ownerId: undefined,
      }),
    );
  });

  it('"Minhas comunidades" restringe a busca ao owner logado', async () => {
    mockedList.mockResolvedValue(page([community("c1", "Dev SP")], false));
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole("link", { name: "Dev SP" });
    await user.click(screen.getByRole("checkbox", { name: "Mostrar apenas as comunidades que eu criei" }));

    await waitFor(() =>
      expect(mockedList).toHaveBeenLastCalledWith({
        page: 1,
        city: "",
        name: "",
        ownerId: "u1",
      }),
    );
  });

  it('desligar "Minhas comunidades" volta a listar todas', async () => {
    mockedList.mockResolvedValue(page([community("c1", "Dev SP")], false));
    const user = userEvent.setup();
    renderPage();

    const toggle = await screen.findByRole("checkbox", {
      name: "Mostrar apenas as comunidades que eu criei",
    });
    await user.click(toggle);
    await user.click(toggle);

    await waitFor(() =>
      expect(mockedList).toHaveBeenLastCalledWith({
        page: 1,
        city: "",
        name: "",
        ownerId: undefined,
      }),
    );
  });

  it("com filtro ativo a lista vazia fala em filtros", async () => {
    mockedList.mockResolvedValue(page([], false));
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Nenhuma comunidade encontrada.");
    await user.type(screen.getByLabelText("Buscar pelo nome"), "zzz");

    expect(
      await screen.findByText(
        "Nenhuma comunidade corresponde aos filtros. Tente outro trecho ou limpe os filtros.",
      ),
    ).toBeInTheDocument();
  });

  it("card sem endereço mostra Endereço não informado", async () => {
    mockedList.mockResolvedValue(
      page([{ id: "c1", name: "Sem endereço", description: "sem endereço" }], false),
    );
    renderPage();

    expect(await screen.findByText("Endereço não informado")).toBeInTheDocument();
  });

  it("mostra o atalho para criar comunidade", async () => {
    mockedList.mockResolvedValue(page([], false));
    renderPage();

    expect(await screen.findByRole("link", { name: "Nova comunidade" })).toHaveAttribute(
      "href",
      "/comunidades/nova",
    );
  });
});
