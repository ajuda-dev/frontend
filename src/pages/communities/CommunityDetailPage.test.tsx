import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../context/AuthContext";
import type { Community } from "../../types/api";
import { CommunityDetailPage } from "./CommunityDetailPage";

vi.mock("../../services/community", () => ({
  listCommunities: vi.fn(),
  findCommunityById: vi.fn(),
  joinCommunity: vi.fn(),
  leaveCommunity: vi.fn(),
}));

import { findCommunityById, joinCommunity, leaveCommunity } from "../../services/community";

const mockedFind = vi.mocked(findCommunityById);
const mockedJoin = vi.mocked(joinCommunity);
const mockedLeave = vi.mocked(leaveCommunity);

const COMMUNITY: Community = {
  id: "c1",
  name: "Dev SP",
  description: "Encontros de dev em São Paulo",
  address: { id: "a1", zip_code: "01001000", city: "São Paulo", state: "SP" },
  owner: { id: "owner-1", name: "Ana", email: "ana@ajudadev.dev", role: "USER" },
};

function seedSession(id = "u1") {
  localStorage.setItem("ajudadev.token", "token-123");
  localStorage.setItem(
    "ajudadev.user",
    JSON.stringify({ id, name: "Lucas Rocha", email: "lucas@ajudadev.dev", role: "USER" }),
  );
}

function renderDetail(state?: { community: Community }) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: "/comunidades/c1", state }]}>
      <AuthProvider>
        <Routes>
          <Route path="/comunidades/:id" element={<CommunityDetailPage />} />
          <Route path="/comunidades" element={<p>Lista de comunidades</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("CommunityDetailPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    seedSession();
  });

  it("com state da lista não chama a API", async () => {
    renderDetail({ community: COMMUNITY });

    expect(await screen.findByRole("heading", { name: "Dev SP" })).toBeInTheDocument();
    expect(mockedFind).not.toHaveBeenCalled();
    expect(screen.getByText("Encontros de dev em São Paulo")).toBeInTheDocument();
  });

  it("sem state busca pelo id (acesso direto/refresh)", async () => {
    mockedFind.mockResolvedValue(COMMUNITY);
    renderDetail();

    expect(await screen.findByRole("heading", { name: "Dev SP" })).toBeInTheDocument();
    expect(mockedFind).toHaveBeenCalledWith("c1", expect.anything());
  });

  it("não encontrada mostra estado amigável", async () => {
    mockedFind.mockResolvedValue(null);
    renderDetail();

    expect(await screen.findByText("Comunidade não encontrada.")).toBeInTheDocument();
  });

  it("owner não vê o botão Entrar", async () => {
    seedSession("owner-1");
    renderDetail({ community: COMMUNITY });

    expect(await screen.findByText("Você é o criador")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Entrar" })).not.toBeInTheDocument();
  });

  it("clique em Entrar marca como membro e troca para Sair", async () => {
    mockedJoin.mockResolvedValue({ id: "m1", community_id: "c1", user_id: "u1" });
    const user = userEvent.setup();
    renderDetail({ community: COMMUNITY });

    await user.click(await screen.findByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("button", { name: "Sair" })).toBeInTheDocument();
    expect(screen.getByText("Você é membro")).toBeInTheDocument();
    expect(mockedJoin).toHaveBeenCalledWith("c1");
  });

  it("membro com cache persistido vê Sair e o leave desmarca", async () => {
    localStorage.setItem("ajudadev.memberships.u1", JSON.stringify(["c1"]));
    mockedLeave.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderDetail({ community: COMMUNITY });

    await user.click(await screen.findByRole("button", { name: "Sair" }));

    expect(await screen.findByRole("button", { name: "Entrar" })).toBeInTheDocument();
    expect(mockedLeave).toHaveBeenCalledWith("c1");
  });
});
