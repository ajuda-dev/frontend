import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../context/AuthContext";
import type { SkillUser, UserProfile } from "../../types/api";
import { PersonProfilePage } from "./PersonProfilePage";

vi.mock("../../services/user", () => ({
  getUserProfile: vi.fn(),
  getUserSkills: vi.fn(),
  deleteUser: vi.fn(),
}));

import { deleteUser, getUserProfile, getUserSkills } from "../../services/user";

const mockedProfile = vi.mocked(getUserProfile);
const mockedSkills = vi.mocked(getUserSkills);
const mockedDeleteUser = vi.mocked(deleteUser);

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: "u2",
    name: "Ana Souza",
    description: "Desenvolvedora backend",
    email: "ana@ajudadev.dev",
    configVisibility: {
      email: { value: "ana@ajudadev.dev", shareWithCommunity: true },
      github: { value: "https://github.com/ana", shareWithCommunity: true },
    },
    ...overrides,
  };
}

function skillEntry(id: string, name: string, level: SkillUser["level"]): SkillUser {
  return { id, skill_id: `s-${id}`, user_id: "u2", level, skill: { id: `s-${id}`, name } };
}

function apiError(status: number, data: unknown) {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data },
  });
}

function seedSession(id = "u1", role: "USER" | "MODERATOR" | "ADMIN" = "USER") {
  localStorage.setItem("ajudadev.token", "token-123");
  localStorage.setItem(
    "ajudadev.user",
    JSON.stringify({ id, name: "Lucas Rocha", email: "lucas@ajudadev.dev", role }),
  );
}

function renderPage(userId = "u2") {
  return render(
    <MemoryRouter initialEntries={[`/pessoas/${userId}`]}>
      <AuthProvider>
        <Routes>
          <Route path="/pessoas" element={<p>Lista de pessoas</p>} />
          <Route path="/pessoas/:userId" element={<PersonProfilePage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("PersonProfilePage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    seedSession();
    mockedSkills.mockResolvedValue([]);
  });

  it("mostra nome, descrição, e-mail e contatos compartilhados", async () => {
    mockedProfile.mockResolvedValue(profile());
    renderPage();

    expect(await screen.findByRole("heading", { name: "Ana Souza" })).toBeInTheDocument();
    expect(screen.getByText("Desenvolvedora backend")).toBeInTheDocument();
    expect(screen.getByText("ana@ajudadev.dev")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "https://github.com/ana" })).toBeInTheDocument();
  });

  it("sem e-mail compartilhado avisa em vez de inventar", async () => {
    mockedProfile.mockResolvedValue(
      profile({
        email: undefined,
        configVisibility: { email: { value: "", shareWithCommunity: false } },
      }),
    );
    renderPage();

    expect(await screen.findByText("E-mail não compartilhado")).toBeInTheDocument();
  });

  it("no próprio perfil, e-mail com valor e não compartilhado ganha o indicador", async () => {
    seedSession("u2");
    mockedProfile.mockResolvedValue(
      profile({
        configVisibility: {
          email: { value: "ana@ajudadev.dev", shareWithCommunity: false },
          github: { value: "https://github.com/ana", shareWithCommunity: true },
        },
      }),
    );
    renderPage("u2");

    expect(await screen.findByText("ana@ajudadev.dev")).toBeInTheDocument();
    expect(screen.getByText("Não compartilhado")).toBeInTheDocument();
    expect(screen.queryByText("E-mail não compartilhado")).not.toBeInTheDocument();
  });

  it("renderiza a foto compartilhada como imagem no avatar", async () => {
    mockedProfile.mockResolvedValue(
      profile({
        configVisibility: {
          email: { value: "ana@ajudadev.dev", shareWithCommunity: true },
          photo: { value: "https://exemplo.com/ana.png", shareWithCommunity: true },
        },
      }),
    );
    renderPage();

    const image = await screen.findByRole("img", { name: "Foto de Ana Souza" });
    expect(image).toHaveAttribute("src", "https://exemplo.com/ana.png");
  });

  it("a foto não aparece como link na lista de contatos", async () => {
    mockedProfile.mockResolvedValue(
      profile({
        configVisibility: {
          email: { value: "ana@ajudadev.dev", shareWithCommunity: true },
          photo: { value: "https://exemplo.com/ana.png", shareWithCommunity: true },
        },
      }),
    );
    renderPage();

    await screen.findByRole("img", { name: "Foto de Ana Souza" });
    expect(screen.queryByRole("link", { name: "https://exemplo.com/ana.png" })).not.toBeInTheDocument();
    expect(screen.queryByText("Foto")).not.toBeInTheDocument();
  });

  it("foto que falha ao carregar cai nas iniciais", async () => {
    mockedProfile.mockResolvedValue(
      profile({
        configVisibility: {
          email: { value: "ana@ajudadev.dev", shareWithCommunity: true },
          photo: { value: "https://exemplo.com/quebrada.png", shareWithCommunity: true },
        },
      }),
    );
    renderPage();

    fireEvent.error(await screen.findByRole("img", { name: "Foto de Ana Souza" }));

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("AS")).toBeInTheDocument();
  });

  it("sem foto o avatar mostra as iniciais", async () => {
    mockedProfile.mockResolvedValue(profile());
    renderPage();

    await screen.findByRole("heading", { name: "Ana Souza" });
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("AS")).toBeInTheDocument();
  });

  it("no próprio perfil, foto não compartilhada continua visível para o dono", async () => {
    seedSession("u2");
    mockedProfile.mockResolvedValue(
      profile({
        configVisibility: {
          email: { value: "ana@ajudadev.dev", shareWithCommunity: true },
          photo: { value: "https://exemplo.com/ana.png", shareWithCommunity: false },
        },
      }),
    );
    renderPage("u2");

    const image = await screen.findByRole("img", { name: "Foto de Ana Souza" });
    expect(image).toHaveAttribute("src", "https://exemplo.com/ana.png");

    const hiddenRow = screen.getByText("Não compartilhado com a comunidade:").parentElement!;
    expect(within(hiddenRow).getByText("Foto")).toBeInTheDocument();
    expect(within(hiddenRow).queryByText("p")).not.toBeInTheDocument();
  });

  it("no perfil de terceiros o e-mail oculto não aparece", async () => {
    mockedProfile.mockResolvedValue(
      profile({
        email: undefined,
        configVisibility: { email: { value: "", shareWithCommunity: false } },
      }),
    );
    renderPage();

    expect(await screen.findByText("E-mail não compartilhado")).toBeInTheDocument();
    expect(screen.queryByText("Não compartilhado")).not.toBeInTheDocument();
  });

  it("lista as habilidades com o nível", async () => {
    mockedProfile.mockResolvedValue(profile());
    mockedSkills.mockResolvedValue([
      skillEntry("su1", "GO", "TEACH"),
      skillEntry("su2", "JAVA", "WANT_TO_LEARN"),
    ]);
    renderPage();

    expect(await screen.findByText("GO")).toBeInTheDocument();
    expect(screen.getByText("Ensinar")).toBeInTheDocument();
    expect(screen.getByText("Quero aprender")).toBeInTheDocument();
  });

  it("sem habilidades mostra o estado vazio da seção", async () => {
    mockedProfile.mockResolvedValue(profile());
    renderPage();

    expect(await screen.findByText("Ainda não cadastrou habilidades.")).toBeInTheDocument();
  });

  it("no próprio perfil avisa que é você e mostra o que não é compartilhado", async () => {
    seedSession("u2");
    mockedProfile.mockResolvedValue(
      profile({
        configVisibility: {
          email: { value: "ana@ajudadev.dev", shareWithCommunity: true },
          phone: { value: "11999999999", shareWithCommunity: false },
        },
      }),
    );
    renderPage("u2");

    expect(await screen.findByText("Este é você")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir para meu perfil" })).toHaveAttribute(
      "href",
      "/perfil",
    );
    expect(screen.getByText("Não compartilhado com a comunidade:")).toBeInTheDocument();

    const hiddenRow = screen.getByText("Não compartilhado com a comunidade:").parentElement!;
    expect(within(hiddenRow).getByText("Telefone")).toBeInTheDocument();
    expect(within(hiddenRow).queryAllByText(/^[a-z]$/)).toHaveLength(0);
  });

  it("usuário inexistente mostra página amigável com volta para a lista", async () => {
    mockedProfile.mockResolvedValue(null);
    renderPage("inexistente");

    expect(await screen.findByText("Usuário não encontrado.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar para a lista" })).toHaveAttribute(
      "href",
      "/pessoas",
    );
  });

  it("erro da API mostra alerta com tentar novamente", async () => {
    mockedProfile.mockRejectedValue(apiError(500, { message: "erro", code: 500 }));
    renderPage();

    expect(await screen.findByText("Não foi possível carregar o perfil")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
  });

  it("USER não vê a exclusão de usuário", async () => {
    mockedProfile.mockResolvedValue(profile());
    renderPage();

    await screen.findByRole("heading", { name: "Ana Souza" });
    expect(screen.queryByRole("button", { name: "Excluir usuário" })).not.toBeInTheDocument();
  });

  it("MODERATOR também não vê a exclusão de usuário", async () => {
    seedSession("mod-1", "MODERATOR");
    mockedProfile.mockResolvedValue(profile());
    renderPage();

    await screen.findByRole("heading", { name: "Ana Souza" });
    expect(screen.queryByRole("button", { name: "Excluir usuário" })).not.toBeInTheDocument();
  });

  it("ADMIN no próprio perfil não vê a exclusão", async () => {
    seedSession("u2", "ADMIN");
    mockedProfile.mockResolvedValue(profile());
    renderPage("u2");

    await screen.findByRole("heading", { name: "Ana Souza" });
    expect(screen.queryByRole("button", { name: "Excluir usuário" })).not.toBeInTheDocument();
  });

  it("ADMIN exclui em dois passos e volta para a lista", async () => {
    seedSession("admin-1", "ADMIN");
    mockedProfile.mockResolvedValue(profile());
    mockedDeleteUser.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Excluir usuário" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/impedem a exclusão/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Excluir" }));
    await user.click(within(dialog).getByRole("button", { name: "Tenho certeza, excluir" }));

    expect(await screen.findByText("Lista de pessoas")).toBeInTheDocument();
    expect(mockedDeleteUser).toHaveBeenCalledWith("u2");
  });

  it("400 de vínculos ativos lista todas as causes traduzidas", async () => {
    seedSession("admin-1", "ADMIN");
    mockedProfile.mockResolvedValue(profile());
    mockedDeleteUser.mockRejectedValue(
      apiError(400, {
        message: "cannot delete user with active associations",
        code: 400,
        causes: [
          { field: "community", message: "is owner of an active community" },
          { field: "community_users", message: "is a member of an active community" },
        ],
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Excluir usuário" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Excluir" }));
    await user.click(within(dialog).getByRole("button", { name: "Tenho certeza, excluir" }));

    expect(await screen.findByText("É responsável por uma comunidade ativa")).toBeInTheDocument();
    expect(screen.getByText("É membro de uma comunidade ativa")).toBeInTheDocument();
  });
});
