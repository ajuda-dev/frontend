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
  deleteCommunity: vi.fn(),
}));

vi.mock("../../services/event", () => ({
  listEvents: vi.fn(),
  approveEvent: vi.fn(),
}));

import {
  deleteCommunity,
  findCommunityById,
  joinCommunity,
  leaveCommunity,
} from "../../services/community";
import { listEvents, approveEvent } from "../../services/event";

const mockedFind = vi.mocked(findCommunityById);
const mockedJoin = vi.mocked(joinCommunity);
const mockedLeave = vi.mocked(leaveCommunity);
const mockedDelete = vi.mocked(deleteCommunity);
const mockedListEvents = vi.mocked(listEvents);
const mockedApprove = vi.mocked(approveEvent);

const COMMUNITY: Community = {
  id: "c1",
  name: "Dev SP",
  description: "Encontros de dev em São Paulo",
  address: { id: "a1", zip_code: "01001000", city: "São Paulo", state: "SP" },
  owner: { id: "owner-1", name: "Ana", email: "ana@ajudadev.dev", role: "USER" },
};

function seedSession(id = "u1", role: "USER" | "MODERATOR" | "ADMIN" = "USER", emailVerified = true) {
  localStorage.setItem(
    "ajudadev.user",
    JSON.stringify({ id, name: "Lucas Rocha", email: "lucas@ajudadev.dev", role, emailVerified }),
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
    mockedListEvents.mockResolvedValue({ data: [], has_next: false });
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

  it("state incompleto (sem address/owner) cai na busca e hidrata a tela", async () => {
    // Guarda defensiva: um state parcial nunca deve renderizar a tela com os
    // campos de endereço/responsável vazios — melhor buscar por id.
    mockedFind.mockResolvedValue(COMMUNITY);
    renderDetail({ community: { id: "c1", name: "Dev SP", description: "Encontros de dev" } });

    expect(await screen.findByRole("heading", { name: "Dev SP" })).toBeInTheDocument();
    expect(mockedFind).toHaveBeenCalledWith("c1", expect.anything());
    // Hidratado: endereço e responsável aparecem (sem isso a tela mostra "—"/"não informado").
    expect((await screen.findAllByText(/São Paulo\/SP/)).length).toBeGreaterThan(0);
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("ana@ajudadev.dev")).toBeInTheDocument();
  });

  it("state de outra comunidade é ignorado", async () => {
    mockedFind.mockResolvedValue(COMMUNITY);
    renderDetail({ community: { ...COMMUNITY, id: "c9" } });

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

  it("429 de quota no join mostra o erro e mantém o botão Entrar", async () => {
    mockedJoin.mockRejectedValue({
      isAxiosError: true,
      message: "Request failed with status code 429",
      response: {
        status: 429,
        data: {
          message: "community memberships limit reached",
          error: "too_many_requests",
          code: 429,
        },
      },
    });
    const user = userEvent.setup();
    renderDetail({ community: COMMUNITY });

    await user.click(await screen.findByRole("button", { name: "Entrar" }));

    expect(
      await screen.findByText("Você atingiu o limite de comunidades das quais pode participar"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeInTheDocument();
    expect(screen.queryByText("Você é membro")).not.toBeInTheDocument();
    expect(localStorage.getItem("ajudadev.memberships.u1")).toBeNull();
  });

  it("400 de quem já era membro continua marcando membership", async () => {
    mockedJoin.mockRejectedValue({
      isAxiosError: true,
      message: "Request failed with status code 400",
      response: {
        status: 400,
        data: { message: "user is already a member of this community", code: 400 },
      },
    });
    const user = userEvent.setup();
    renderDetail({ community: COMMUNITY });

    await user.click(await screen.findByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("button", { name: "Sair" })).toBeInTheDocument();
    expect(screen.getByText("Você já é membro desta comunidade.")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("ajudadev.memberships.u1") ?? "[]")).toContain("c1");
  });

  it("e-mail não verificado troca Entrar pelo aviso e não chama a API", async () => {
    seedSession("u1", "USER", false);
    const user = userEvent.setup();
    renderDetail({ community: COMMUNITY });

    expect(await screen.findByRole("heading", { name: "Dev SP" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Entrar" })).not.toBeInTheDocument();
    expect(screen.getByText(/Confirme seu e-mail para continuar/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Confirmar e-mail" })).toHaveAttribute(
      "href",
      "/confirmar-email",
    );

    await user.click(screen.getByRole("link", { name: "Confirmar e-mail" }));
    expect(mockedJoin).not.toHaveBeenCalled();
  });

  it("membro com e-mail pendente ainda pode sair da comunidade", async () => {
    seedSession("u1", "USER", false);
    localStorage.setItem("ajudadev.memberships.u1", JSON.stringify(["c1"]));
    mockedLeave.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderDetail({ community: COMMUNITY });

    await user.click(await screen.findByRole("button", { name: "Sair" }));

    expect(mockedLeave).toHaveBeenCalledWith("c1");
    expect(screen.getByRole("link", { name: "Confirmar e-mail" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Entrar" })).not.toBeInTheDocument();
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

  it("USER que não é owner não vê o botão de excluir", async () => {
    renderDetail({ community: COMMUNITY });

    await screen.findByRole("heading", { name: "Dev SP" });
    expect(screen.queryByRole("button", { name: "Excluir comunidade" })).not.toBeInTheDocument();
  });

  it("USER que não é owner não vê o link de editar", async () => {
    renderDetail({ community: COMMUNITY });

    await screen.findByRole("heading", { name: "Dev SP" });
    expect(screen.queryByRole("link", { name: "Editar comunidade" })).not.toBeInTheDocument();
  });

  it("owner vê o link de editar apontando para a rota de edição", async () => {
    seedSession("owner-1");
    renderDetail({ community: COMMUNITY });

    expect(await screen.findByRole("link", { name: "Editar comunidade" })).toHaveAttribute(
      "href",
      "/comunidades/c1/editar",
    );
  });

  it("MODERATOR vê o link de editar em comunidade alheia", async () => {
    seedSession("mod-1", "MODERATOR");
    renderDetail({ community: COMMUNITY });

    expect(await screen.findByRole("link", { name: "Editar comunidade" })).toBeInTheDocument();
  });

  it("state com updated mostra o aviso de sucesso", async () => {
    render(
      <MemoryRouter
        initialEntries={[{ pathname: "/comunidades/c1", state: { community: COMMUNITY, updated: true } }]}
      >
        <AuthProvider>
          <Routes>
            <Route path="/comunidades/:id" element={<CommunityDetailPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Comunidade atualizada.")).toBeInTheDocument();
  });

  it("sem o state updated não mostra o aviso de sucesso", async () => {
    renderDetail({ community: COMMUNITY });

    await screen.findByRole("heading", { name: "Dev SP" });
    expect(screen.queryByText("Comunidade atualizada.")).not.toBeInTheDocument();
  });

  it("owner vê o botão e a confirmação exclui e volta para a lista", async () => {
    seedSession("owner-1");
    localStorage.setItem("ajudadev.memberships.owner-1", JSON.stringify(["c1"]));
    mockedDelete.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderDetail({ community: COMMUNITY });

    await user.click(await screen.findByRole("button", { name: "Excluir comunidade" }));
    expect(screen.getByText(/Esta ação é irreversível/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Excluir" }));

    expect(await screen.findByText("Lista de comunidades")).toBeInTheDocument();
    expect(mockedDelete).toHaveBeenCalledWith("c1");
    expect(localStorage.getItem("ajudadev.memberships.owner-1")).toBe(JSON.stringify([]));
  });

  it("MODERATOR vê o botão em comunidade alheia com aviso reforçado", async () => {
    seedSession("mod-1", "MODERATOR");
    const user = userEvent.setup();
    renderDetail({ community: COMMUNITY });

    await user.click(await screen.findByRole("button", { name: "Excluir comunidade" }));

    expect(
      screen.getByText(/Você está excluindo uma comunidade que não é sua/),
    ).toBeInTheDocument();
  });

  it("400 com membros ativos mostra a causa e permanece na página", async () => {
    seedSession("owner-1");
    mockedDelete.mockRejectedValue({
      isAxiosError: true,
      message: "Request failed with status code 400",
      response: {
        status: 400,
        data: {
          message: "Invalid delete",
          error: "bad_request",
          code: 400,
          causes: [
            {
              field: "members",
              message: "community has associated members; remove them before deleting",
            },
          ],
        },
      },
    });
    const user = userEvent.setup();
    renderDetail({ community: COMMUNITY });

    await user.click(await screen.findByRole("button", { name: "Excluir comunidade" }));
    await user.click(screen.getByRole("button", { name: "Excluir" }));

    expect(
      await screen.findByText(
        "Esta comunidade ainda tem membros; remova todos antes de excluir",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Dev SP" })).toBeInTheDocument();
  });

  it("403 alerta que só o responsável pode excluir a comunidade", async () => {
    seedSession("owner-1");
    mockedDelete.mockRejectedValue({
      isAxiosError: true,
      message: "Request failed with status code 403",
      response: {
        status: 403,
        data: {
          message: "only the community owner can delete this community",
          error: "forbidden",
          code: 403,
        },
      },
    });
    const user = userEvent.setup();
    renderDetail({ community: COMMUNITY });

    await user.click(await screen.findByRole("button", { name: "Excluir comunidade" }));
    await user.click(screen.getByRole("button", { name: "Excluir" }));

    expect(
      await screen.findByText(
        "Apenas o responsável, moderadores e administradores podem excluir esta comunidade",
      ),
    ).toBeInTheDocument();
  });

  it("seção de eventos lista por community_id", async () => {
    mockedListEvents.mockResolvedValue({
      data: [
        {
          id: "e1",
          title: "Meetup Dev SP",
          description: "Encontro mensal",
          category: "COMMUNITY_EVENT",
          type: "ONLINE",
          start_at: "2026-10-01T18:00:00-03:00",
          duration_min: 60,
        },
      ],
      has_next: false,
    });
    renderDetail({ community: COMMUNITY });

    expect(await screen.findByText("Eventos desta comunidade")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Meetup Dev SP" })).toHaveAttribute(
      "href",
      "/eventos/e1",
    );
    expect(mockedListEvents).toHaveBeenCalledWith({ page: 1, communityId: "c1" });
  });

  it("seção de eventos vazia mostra EmptyState", async () => {
    renderDetail({ community: COMMUNITY });

    expect(await screen.findByText("Nenhum evento por aqui ainda.")).toBeInTheDocument();
  });

  it("USER que não é owner não vê a fila de aprovação", async () => {
    renderDetail({ community: COMMUNITY });

    await screen.findByRole("heading", { name: "Dev SP" });
    expect(screen.queryByText("Aprovação de eventos")).not.toBeInTheDocument();
    expect(mockedListEvents).toHaveBeenCalledTimes(1);
    expect(mockedListEvents).toHaveBeenCalledWith({ page: 1, communityId: "c1" });
  });

  it("owner vê a fila e a aba default busca PENDING", async () => {
    seedSession("owner-1");
    renderDetail({ community: COMMUNITY });

    expect(await screen.findByText("Aprovação de eventos")).toBeInTheDocument();
    expect(mockedListEvents).toHaveBeenCalledWith({
      page: 1,
      communityId: "c1",
      approvalStatus: "PENDING",
    });
    expect(await screen.findByText("Nenhum evento aguardando aprovação.")).toBeInTheDocument();
  });

  it("MODERATOR também vê a fila", async () => {
    seedSession("mod-1", "MODERATOR");
    renderDetail({ community: COMMUNITY });

    expect(await screen.findByText("Aprovação de eventos")).toBeInTheDocument();
  });

  it("trocar para a aba Rejeitados busca REJECTED", async () => {
    seedSession("owner-1");
    const user = userEvent.setup();
    renderDetail({ community: COMMUNITY });

    await user.click(await screen.findByRole("button", { name: "Rejeitados" }));

    expect(mockedListEvents).toHaveBeenLastCalledWith({
      page: 1,
      communityId: "c1",
      approvalStatus: "REJECTED",
    });
    expect(await screen.findByText("Nenhum evento rejeitado.")).toBeInTheDocument();
  });

  it("aprovar na fila recarrega a lista de pendentes", async () => {
    seedSession("owner-1");
    mockedListEvents.mockImplementation(async (params) => {
      if (params.approvalStatus === "PENDING") {
        return {
          data: [
            {
              id: "e1",
              title: "Meetup Dev SP",
              description: "Encontro mensal",
              category: "COMMUNITY_EVENT",
              type: "ONLINE",
              start_at: "2026-10-01T18:00:00-03:00",
              duration_min: 60,
              status: "PENDING",
            },
          ],
          has_next: false,
        };
      }
      return { data: [], has_next: false };
    });
    mockedApprove.mockResolvedValue({
      id: "e1",
      title: "Meetup Dev SP",
      description: "Encontro mensal",
      category: "COMMUNITY_EVENT",
      type: "ONLINE",
      start_at: "2026-10-01T18:00:00-03:00",
      duration_min: 60,
      status: "APPROVED",
    });
    const user = userEvent.setup();
    renderDetail({ community: COMMUNITY });

    await user.click(await screen.findByRole("button", { name: "Aprovar" }));

    expect(mockedApprove).toHaveBeenCalledWith("e1", "APPROVED");
    expect(mockedListEvents).toHaveBeenCalledTimes(3);
  });

  it("mostra os links públicos e a foto para qualquer autenticado", async () => {
    renderDetail({
      community: {
        ...COMMUNITY,
        configVisibility: {
          github: { value: "https://github.com/devsp" },
          photo: { value: "https://exemplo.com/devsp.png" },
        },
      },
    });

    expect(await screen.findByRole("link", { name: "https://github.com/devsp" })).toHaveAttribute(
      "href",
      "https://github.com/devsp",
    );
    expect(screen.getByRole("img", { name: "Foto de Dev SP" })).toHaveAttribute(
      "src",
      "https://exemplo.com/devsp.png",
    );
  });
});
