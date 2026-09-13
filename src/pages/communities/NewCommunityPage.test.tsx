import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../context/AuthContext";
import type { Address, Community } from "../../types/api";
import { CommunityDetailPage } from "./CommunityDetailPage";
import { NewCommunityPage } from "./NewCommunityPage";

vi.mock("../../services/address", () => ({ createAddress: vi.fn(), searchAddresses: vi.fn() }));
vi.mock("../../services/community", () => ({
  createCommunity: vi.fn(),
  findCommunityById: vi.fn(),
  joinCommunity: vi.fn(),
  leaveCommunity: vi.fn(),
  deleteCommunity: vi.fn(),
}));

import { createAddress, searchAddresses } from "../../services/address";
import { createCommunity, findCommunityById } from "../../services/community";

const mockedCreateAddress = vi.mocked(createAddress);
const mockedSearch = vi.mocked(searchAddresses);
const mockedCreateCommunity = vi.mocked(createCommunity);
const mockedFind = vi.mocked(findCommunityById);

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
  owner: { id: "u1", name: "Lucas Rocha", email: "lucas@ajudadev.dev", role: "USER" },
};

function seedSession() {
  localStorage.setItem("ajudadev.token", "token-123");
  localStorage.setItem(
    "ajudadev.user",
    JSON.stringify({ id: "u1", name: "Lucas Rocha", email: "lucas@ajudadev.dev", role: "USER" }),
  );
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/comunidades/nova"]}>
      <AuthProvider>
        <Routes>
          <Route path="/comunidades/nova" element={<NewCommunityPage />} />
          <Route path="/comunidades/:id" element={<p>Detalhe da comunidade</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

async function fillAddress(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("CEP"), "01310100");
  await user.type(screen.getByLabelText("Número"), "1000");
  await user.click(screen.getByRole("button", { name: "Buscar endereço" }));
  await screen.findByText(/Endereço confirmado/);
}

describe("NewCommunityPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    seedSession();
    mockedCreateAddress.mockResolvedValue(ADDRESS);
    mockedCreateCommunity.mockResolvedValue(COMMUNITY);
    mockedSearch.mockResolvedValue([]);
  });

  it("nome vazio é barrado localmente sem chamar a API", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Criar comunidade" }));

    expect(await screen.findByText("Informe o nome da comunidade")).toBeInTheDocument();
    expect(screen.getByText("Informe a descrição da comunidade")).toBeInTheDocument();
    expect(mockedCreateCommunity).not.toHaveBeenCalled();
  });

  it("sem endereço escolhido o submit alerta e não chama a API", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Nome"), "Dev SP");
    await user.type(screen.getByLabelText("Descrição"), "Encontros de dev");
    await user.click(screen.getByRole("button", { name: "Criar comunidade" }));

    expect(await screen.findByText("Busque ou selecione um endereço")).toBeInTheDocument();
    expect(mockedCreateCommunity).not.toHaveBeenCalled();
  });

  it("fluxo feliz cria o endereço, cria a comunidade e navega com state", async () => {
    const user = userEvent.setup();
    renderPage();

    await fillAddress(user);
    await user.type(screen.getByLabelText("Nome"), "Dev SP");
    await user.type(screen.getByLabelText("Descrição"), "Encontros de dev em São Paulo");
    await user.click(screen.getByRole("button", { name: "Criar comunidade" }));

    expect(await screen.findByText("Detalhe da comunidade")).toBeInTheDocument();
    expect(mockedCreateAddress).toHaveBeenCalledWith({
      zip_code: "01310100",
      number: "1000",
      complement: "",
    });
    expect(mockedCreateCommunity).toHaveBeenCalledWith({
      name: "Dev SP",
      description: "Encontros de dev em São Paulo",
      address_id: "a1",
    });
    expect(mockedCreateAddress.mock.invocationCallOrder[0]).toBeLessThan(
      mockedCreateCommunity.mock.invocationCallOrder[0],
    );
  });

  it("falha no register da comunidade mantém o endereço no cache", async () => {
    mockedCreateCommunity.mockRejectedValue({
      isAxiosError: true,
      message: "Request failed with status code 400",
      response: {
        status: 400,
        data: { message: "invalid data", code: 400, causes: [{ field: "name", message: "Name is not valid" }] },
      },
    });
    const user = userEvent.setup();
    renderPage();

    await fillAddress(user);
    await user.type(screen.getByLabelText("Nome"), "Dev SP");
    await user.type(screen.getByLabelText("Descrição"), "Encontros de dev");
    await user.click(screen.getByRole("button", { name: "Criar comunidade" }));

    expect(await screen.findByText("Nome inválido")).toBeInTheDocument();
    expect(screen.queryByText("Detalhe da comunidade")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem("ajudadev.addresses.u1") ?? "[]")).toHaveLength(1),
    );
  });

  it("endereço que já existe no servidor é reaproveitado sem criar outro", async () => {
    mockedSearch.mockResolvedValue([ADDRESS]);
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("CEP"), "01310100");
    await user.type(screen.getByLabelText("Número"), "1000");
    await user.click(screen.getByRole("button", { name: "Buscar endereço" }));
    await screen.findByText(/reaproveitado/);

    await user.type(screen.getByLabelText("Nome"), "Dev SP");
    await user.type(screen.getByLabelText("Descrição"), "Encontros de dev");
    await user.click(screen.getByRole("button", { name: "Criar comunidade" }));

    expect(await screen.findByText("Detalhe da comunidade")).toBeInTheDocument();
    expect(mockedCreateAddress).not.toHaveBeenCalled();
    expect(mockedCreateCommunity).toHaveBeenCalledWith({
      name: "Dev SP",
      description: "Encontros de dev",
      address_id: "a1",
    });
  });

  it("pós-criação o detalhe já vem completo do 201, sem nova busca", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/comunidades/nova"]}>
        <AuthProvider>
          <Routes>
            <Route path="/comunidades/nova" element={<NewCommunityPage />} />
            <Route path="/comunidades/:id" element={<CommunityDetailPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    await fillAddress(user);
    await user.type(screen.getByLabelText("Nome"), "Dev SP");
    await user.type(screen.getByLabelText("Descrição"), "Encontros de dev em São Paulo");
    await user.click(screen.getByRole("button", { name: "Criar comunidade" }));

    // O 201 devolve dto.CommunityDto (address + owner aninhados): o detalhe renderiza
    // na hora, sem chamar findCommunityById — era exatamente o bug relatado.
    expect(await screen.findByRole("heading", { name: "Dev SP" })).toBeInTheDocument();
    expect((await screen.findAllByText(/São Paulo\/SP/)).length).toBeGreaterThan(0);
    expect(screen.getByText("Lucas Rocha")).toBeInTheDocument();
    expect(mockedFind).not.toHaveBeenCalled();
  });
});
