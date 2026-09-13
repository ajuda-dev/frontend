import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../context/AuthContext";
import type { Pageable, Skill, SkillUser, UserProfile } from "../../types/api";
import { MyProfilePage } from "./MyProfilePage";

vi.mock("../../services/user", () => ({
  getUserProfile: vi.fn(),
  getUserSkills: vi.fn(),
  removeUserSkill: vi.fn(),
  deleteUser: vi.fn(),
}));
vi.mock("../../services/skill", () => ({
  listSkills: vi.fn(),
  assignSkillToUser: vi.fn(),
}));

import { assignSkillToUser, listSkills } from "../../services/skill";
import { getUserProfile, getUserSkills, removeUserSkill } from "../../services/user";

const mockedProfile = vi.mocked(getUserProfile);
const mockedSkills = vi.mocked(getUserSkills);
const mockedRemove = vi.mocked(removeUserSkill);
const mockedAssign = vi.mocked(assignSkillToUser);
const mockedListSkills = vi.mocked(listSkills);

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: "u1",
    name: "Lucas Rocha",
    description: "Dev backend",
    email: "lucas@ajudadev.dev",
    configVisibility: { email: { value: "lucas@ajudadev.dev", shareWithCommunity: true } },
    ...overrides,
  };
}

function skillEntry(id: string, skillId: string, name: string, level: SkillUser["level"]): SkillUser {
  return { id, skill_id: skillId, user_id: "u1", level, skill: { id: skillId, name } };
}

function page(data: Skill[], hasNext = false): Pageable<Skill> {
  return { data, has_next: hasNext };
}

function apiError(status: number, data: unknown) {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data },
  });
}

function seedSession(id = "u1") {
  localStorage.setItem("ajudadev.token", "token-123");
  localStorage.setItem(
    "ajudadev.user",
    JSON.stringify({ id, name: "Lucas Rocha", email: "lucas@ajudadev.dev", role: "USER" }),
  );
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/perfil"]}>
      <AuthProvider>
        <Routes>
          <Route path="/perfil" element={<MyProfilePage />} />
          <Route path="/pessoas/:userId" element={<p>Perfil público</p>} />
          <Route path="/skills" element={<p>Catálogo de skills</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("MyProfilePage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    seedSession();
    mockedProfile.mockResolvedValue(profile());
    mockedSkills.mockResolvedValue([]);
    mockedListSkills.mockResolvedValue(page([]));
  });

  it("mostra nome, e-mail, cargo e descrição da sessão e do GET", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "Lucas Rocha" })).toBeInTheDocument();
    expect(screen.getByText("lucas@ajudadev.dev")).toBeInTheDocument();
    expect(screen.getByText("Usuário")).toBeInTheDocument();
    expect(screen.getByText("Dev backend")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver perfil público" })).toHaveAttribute(
      "href",
      "/pessoas/u1",
    );
  });

  it("lista as habilidades com o nível de cada uma", async () => {
    mockedSkills.mockResolvedValue([skillEntry("su1", "s1", "GO", "TEACH")]);
    renderPage();

    expect(await screen.findByText("GO")).toBeInTheDocument();
    expect(screen.getByLabelText("Mudar nível")).toHaveValue("TEACH");
  });

  it("seção vazia aponta para o catálogo", async () => {
    renderPage();

    expect(await screen.findByText("Você ainda não cadastrou habilidades.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Descobrir skills no catálogo" })).toHaveAttribute(
      "href",
      "/skills",
    );
  });

  it("adicionar habilidade usa o id da sessão e recarrega a lista", async () => {
    mockedListSkills.mockResolvedValue(page([{ id: "s1", name: "GO" }]));
    mockedSkills
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([skillEntry("su1", "s1", "GO", "TEACH")]);
    mockedAssign.mockResolvedValue({ id: "su1", skill_id: "s1", user_id: "u1", level: "TEACH" });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("radio", { name: "GO" }));
    await user.selectOptions(screen.getByLabelText("Nível de domínio"), "TEACH");
    await user.click(screen.getByRole("button", { name: "Adicionar habilidade" }));

    expect(await screen.findByText("Habilidade adicionada: GO.")).toBeInTheDocument();
    expect(mockedAssign).toHaveBeenCalledWith("s1", "u1", "TEACH");
    expect(mockedSkills).toHaveBeenCalledTimes(2);
    expect(await screen.findByLabelText("Mudar nível")).toHaveValue("TEACH");
  });

  it("duplicado avisa para ajustar o nível na linha existente", async () => {
    mockedListSkills.mockResolvedValue(page([{ id: "s1", name: "GO" }]));
    mockedSkills.mockResolvedValue([skillEntry("su1", "s1", "GO", "WANT_TO_LEARN")]);
    mockedAssign.mockRejectedValue(
      apiError(400, {
        message: "invalid skill user data",
        code: 400,
        causes: [{ field: "user_id", message: "user already has this skill" }],
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("radio", { name: "GO" }));
    await user.selectOptions(screen.getByLabelText("Nível de domínio"), "TEACH");
    await user.click(screen.getByRole("button", { name: "Adicionar habilidade" }));

    expect(
      await screen.findByText(
        "Você já tem esta habilidade. Para mudar o nível, use o seletor na linha dela abaixo.",
      ),
    ).toBeInTheDocument();
    expect(mockedSkills).toHaveBeenCalledTimes(1);
  });

  it("remover chama DELETE e a linha some da lista", async () => {
    mockedSkills
      .mockResolvedValueOnce([skillEntry("su1", "s1", "GO", "TEACH")])
      .mockResolvedValueOnce([]);
    mockedRemove.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Remover" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/Remover GO\?/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Remover" }));

    expect(mockedRemove).toHaveBeenCalledWith("u1", "s1");
    await waitFor(() => {
      expect(screen.queryByText("GO")).not.toBeInTheDocument();
    });
  });

  it("mudar nível executa remove + add e reconcilia com o servidor", async () => {
    mockedSkills
      .mockResolvedValueOnce([skillEntry("su1", "s1", "GO", "TEACH")])
      .mockResolvedValueOnce([skillEntry("su1", "s1", "GO", "WANT_TO_LEARN")]);
    mockedRemove.mockResolvedValue(undefined);
    mockedAssign.mockResolvedValue({
      id: "su2",
      skill_id: "s1",
      user_id: "u1",
      level: "WANT_TO_LEARN",
    });
    const user = userEvent.setup();
    renderPage();

    await user.selectOptions(await screen.findByLabelText("Mudar nível"), "WANT_TO_LEARN");

    await waitFor(() => {
      expect(mockedRemove).toHaveBeenCalledWith("u1", "s1");
    });
    expect(mockedAssign).toHaveBeenCalledWith("s1", "u1", "WANT_TO_LEARN");
    expect(mockedRemove.mock.invocationCallOrder[0]).toBeLessThan(
      mockedAssign.mock.invocationCallOrder[0],
    );
    expect(mockedSkills).toHaveBeenCalledTimes(2);
    await waitFor(() => {
      expect(screen.getByLabelText("Mudar nível")).toHaveValue("WANT_TO_LEARN");
    });
  });

  it("erro de carregamento mostra alerta com tentar novamente", async () => {
    mockedProfile.mockRejectedValue(apiError(500, { message: "erro", code: 500 }));
    renderPage();

    expect(await screen.findByText("Não foi possível carregar o perfil")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
  });
});
