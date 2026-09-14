import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../context/AuthContext";
import type { Address, Community } from "../../types/api";
import { CommunityDetailPage } from "./CommunityDetailPage";
import { EditCommunityPage } from "./EditCommunityPage";

vi.mock("../../services/address", () => ({ createAddress: vi.fn() }));
vi.mock("../../services/community", () => ({
  findCommunityById: vi.fn(),
  updateCommunity: vi.fn(),
  joinCommunity: vi.fn(),
  leaveCommunity: vi.fn(),
  deleteCommunity: vi.fn(),
}));
vi.mock("../../services/event", () => ({ listEvents: vi.fn() }));

import { createAddress } from "../../services/address";
import { findCommunityById, updateCommunity } from "../../services/community";
import { listEvents } from "../../services/event";

const mockedCreateAddress = vi.mocked(createAddress);
const mockedFind = vi.mocked(findCommunityById);
const mockedUpdate = vi.mocked(updateCommunity);
const mockedListEvents = vi.mocked(listEvents);

const ADDRESS: Address = {
  id: "a1",
  zip_code: "01310100",
  street: "Avenida Paulista",
  number: "1000",
  city: "São Paulo",
  state: "SP",
};

const COMMUNITY: Community = {
  id: "c1",
  name: "Dev SP",
  description: "Encontros de dev em São Paulo",
  address: ADDRESS,
  owner: { id: "owner-1", name: "Ana", email: "ana@ajudadev.dev", role: "USER" },
};

function seedSession(id = "owner-1", role: "USER" | "MODERATOR" | "ADMIN" = "USER") {
  localStorage.setItem(
    "ajudadev.user",
    JSON.stringify({ id, name: "Lucas Rocha", email: "lucas@ajudadev.dev", role }),
  );
}

function renderEdit() {
  return render(
    <MemoryRouter initialEntries={["/comunidades/c1/editar"]}>
      <AuthProvider>
        <Routes>
          <Route path="/comunidades/:id/editar" element={<EditCommunityPage />} />
          <Route path="/comunidades/:id" element={<CommunityDetailPage />} />
          <Route path="/comunidades" element={<p>Lista de comunidades</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("EditCommunityPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    seedSession();
    mockedFind.mockResolvedValue(COMMUNITY);
    mockedUpdate.mockResolvedValue(COMMUNITY);
    mockedCreateAddress.mockResolvedValue(ADDRESS);
    mockedListEvents.mockResolvedValue({ data: [], has_next: false });
  });

  it("pré-preenche nome, descrição e o endereço atual da comunidade", async () => {
    renderEdit();

    expect(await screen.findByLabelText("Nome")).toHaveValue("Dev SP");
    expect(screen.getByLabelText("Descrição")).toHaveValue("Encontros de dev em São Paulo");
    // O endereço atual fica visível mesmo sem cache local, para ser mantido no PUT.
    expect(screen.getByText(/Endereço atual:/)).toHaveTextContent("Avenida Paulista");
  });

  it("salvar envia PUT com os campos e volta ao detalhe com o aviso de sucesso", async () => {
    mockedUpdate.mockResolvedValue({ ...COMMUNITY, name: "Dev SP Editado" });
    const user = userEvent.setup();
    renderEdit();

    const name = await screen.findByLabelText("Nome");
    await user.clear(name);
    await user.type(name, "Dev SP Editado");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(await screen.findByRole("heading", { name: "Dev SP Editado" })).toBeInTheDocument();
    expect(screen.getByText("Comunidade atualizada.")).toBeInTheDocument();
    expect(mockedUpdate).toHaveBeenCalledWith("c1", {
      name: "Dev SP Editado",
      description: "Encontros de dev em São Paulo",
      address_id: "a1",
    });
    // O 200 devolve a comunidade completa: o detalhe não refaz a busca.
    expect(mockedFind).toHaveBeenCalledTimes(1);
  });

  it("nome vazio é barrado localmente sem chamar a API", async () => {
    const user = userEvent.setup();
    renderEdit();

    await user.clear(await screen.findByLabelText("Nome"));
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(await screen.findByText("Informe o nome da comunidade")).toBeInTheDocument();
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("descrição vazia é barrada localmente (o backend não aceita limpar)", async () => {
    const user = userEvent.setup();
    renderEdit();

    await user.clear(await screen.findByLabelText("Descrição"));
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(await screen.findByText("Informe a descrição da comunidade")).toBeInTheDocument();
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("400 com cause de campo mostra o erro no campo e permanece na página", async () => {
    mockedUpdate.mockRejectedValue({
      isAxiosError: true,
      message: "Request failed with status code 400",
      response: {
        status: 400,
        data: {
          message: "invalid data",
          code: 400,
          causes: [{ field: "name", message: "Name is not valid" }],
        },
      },
    });
    const user = userEvent.setup();
    renderEdit();

    await user.click(await screen.findByRole("button", { name: "Salvar alterações" }));

    expect(await screen.findByText("Nome inválido")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeInTheDocument();
  });

  it("403 alerta que só o responsável pode alterar a comunidade", async () => {
    mockedUpdate.mockRejectedValue({
      isAxiosError: true,
      message: "Request failed with status code 403",
      response: {
        status: 403,
        data: {
          message: "only the community owner can update this community",
          error: "forbidden",
          code: 403,
        },
      },
    });
    const user = userEvent.setup();
    renderEdit();

    await user.click(await screen.findByRole("button", { name: "Salvar alterações" }));

    expect(
      await screen.findByText(
        "Apenas o responsável, moderadores e administradores podem alterar esta comunidade",
      ),
    ).toBeInTheDocument();
  });

  it("comunidade inexistente mostra estado amigável", async () => {
    mockedFind.mockResolvedValue(null);
    renderEdit();

    expect(await screen.findByText("Comunidade não encontrada.")).toBeInTheDocument();
  });

  it("USER que não é owner vê o aviso de permissão em vez do formulário", async () => {
    seedSession("u1");
    renderEdit();

    expect(await screen.findByText("Você não pode alterar esta comunidade")).toBeInTheDocument();
    expect(screen.queryByLabelText("Nome")).not.toBeInTheDocument();
  });

  it("MODERATOR edita comunidade alheia", async () => {
    seedSession("mod-1", "MODERATOR");
    renderEdit();

    expect(await screen.findByLabelText("Nome")).toHaveValue("Dev SP");
  });
});
