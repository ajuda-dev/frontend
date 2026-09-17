import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
  updateUserName: vi.fn(),
  updateUserProfile: vi.fn(),
}));
vi.mock("../../services/skill", () => ({
  listSkills: vi.fn(),
  assignSkillToUser: vi.fn(),
}));
vi.mock("../../services/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/auth")>();
  return {
    ...actual,
    changePassword: vi.fn(),
  };
});

import { changePassword } from "../../services/auth";
import { assignSkillToUser, listSkills } from "../../services/skill";
import {
  getUserProfile,
  getUserSkills,
  removeUserSkill,
  updateUserName,
  updateUserProfile,
} from "../../services/user";

const mockedProfile = vi.mocked(getUserProfile);
const mockedSkills = vi.mocked(getUserSkills);
const mockedRemove = vi.mocked(removeUserSkill);
const mockedUpdateName = vi.mocked(updateUserName);
const mockedUpdateProfile = vi.mocked(updateUserProfile);
const mockedAssign = vi.mocked(assignSkillToUser);
const mockedListSkills = vi.mocked(listSkills);
const mockedChangePassword = vi.mocked(changePassword);

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
    mockedChangePassword.mockResolvedValue(undefined);
  });

  it("mostra nome, e-mail, cargo e descrição da sessão e do GET", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "Lucas Rocha" })).toBeInTheDocument();
    expect(screen.getByText("lucas@ajudadev.dev")).toBeInTheDocument();
    expect(screen.getAllByText("Usuário")).toHaveLength(2);
    expect(screen.getAllByText("Dev backend")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Ver perfil público" })).toHaveAttribute(
      "href",
      "/pessoas/u1",
    );
    expect(screen.getByRole("button", { name: "Alterar senha" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Esqueci a senha" })).toHaveAttribute(
      "href",
      "/esqueci-senha",
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

  it("não consulta o catálogo de habilidades antes de o usuário buscar", async () => {
    renderPage();

    expect(
      await screen.findByText("Digite para buscar uma habilidade no catálogo."),
    ).toBeInTheDocument();
    expect(mockedListSkills).not.toHaveBeenCalled();
  });

  it("adicionar habilidade usa o id da sessão e recarrega a lista", async () => {
    mockedListSkills.mockResolvedValue(page([{ id: "s1", name: "GO" }]));
    mockedSkills
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([skillEntry("su1", "s1", "GO", "TEACH")]);
    mockedAssign.mockResolvedValue({ id: "su1", skill_id: "s1", user_id: "u1", level: "TEACH" });
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText("Buscar habilidade no catálogo"), "GO");
    await user.click(await screen.findByRole("radio", { name: "GO" }));
    await user.selectOptions(screen.getByLabelText("Nível de domínio"), "TEACH");
    await user.click(screen.getByRole("button", { name: "Adicionar habilidade" }));

    expect(await screen.findByText("Habilidade adicionada: GO.")).toBeInTheDocument();
    expect(mockedAssign).toHaveBeenCalledWith("s1", "u1", "TEACH");
    expect(mockedSkills).toHaveBeenCalledTimes(2);
    expect(await screen.findByLabelText("Mudar nível")).toHaveValue("TEACH");
  });

  it("429 de quota de skills mostra o erro e não inclui a habilidade na lista", async () => {
    mockedListSkills.mockResolvedValue(page([{ id: "s1", name: "GO" }]));
    mockedSkills.mockResolvedValue([]);
    mockedAssign.mockRejectedValue(
      apiError(429, {
        message: "skills limit reached",
        error: "too_many_requests",
        code: 429,
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText("Buscar habilidade no catálogo"), "GO");
    await user.click(await screen.findByRole("radio", { name: "GO" }));
    await user.selectOptions(screen.getByLabelText("Nível de domínio"), "TEACH");
    await user.click(screen.getByRole("button", { name: "Adicionar habilidade" }));

    expect(
      await screen.findByText("Você atingiu o limite de habilidades neste perfil"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Habilidade adicionada: GO.")).not.toBeInTheDocument();
    expect(screen.getByText("Você ainda não cadastrou habilidades.")).toBeInTheDocument();
    expect(mockedSkills).toHaveBeenCalledTimes(1);
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

    await user.type(await screen.findByLabelText("Buscar habilidade no catálogo"), "GO");
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

  it("editar o nome atualiza cabeçalho, card e sessão sem recarregar", async () => {
    mockedUpdateName.mockResolvedValue({
      id: "u1",
      name: "Lucas Rocha Silva",
      email: "lucas@ajudadev.dev",
      role: "USER",
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Editar nome" }));
    const input = screen.getByLabelText("Nome");
    await user.clear(input);
    await user.type(input, "Lucas Rocha Silva");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Nome atualizado.")).toBeInTheDocument();
    expect(mockedUpdateName).toHaveBeenCalledWith("u1", "Lucas Rocha Silva");
    expect(screen.getByRole("heading", { name: "Lucas Rocha Silva" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Nome")).not.toBeInTheDocument();
    expect(localStorage.getItem("ajudadev.token")).toBeNull();
    expect(JSON.parse(localStorage.getItem("ajudadev.user") ?? "{}").name).toBe("Lucas Rocha Silva");
  });

  it("nome vazio é barrado localmente sem chamar a API", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Editar nome" }));
    await user.clear(screen.getByLabelText("Nome"));
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Informe seu nome")).toBeInTheDocument();
    expect(mockedUpdateName).not.toHaveBeenCalled();
  });

  it("nome com dígito é barrado localmente sem chamar a API", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Editar nome" }));
    const input = screen.getByLabelText("Nome");
    await user.clear(input);
    await user.type(input, "Lucas123");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Nome inválido")).toBeInTheDocument();
    expect(mockedUpdateName).not.toHaveBeenCalled();
  });

  it("400 com cause name mostra o erro no campo", async () => {
    mockedUpdateName.mockRejectedValue(
      apiError(400, {
        message: "Invalid data",
        code: 400,
        causes: [{ field: "name", message: "Name is not valid" }],
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Editar nome" }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Nome inválido")).toBeInTheDocument();
    expect(screen.getByLabelText("Nome")).toBeInTheDocument();
  });

  it("403 mostra alerta traduzido", async () => {
    mockedUpdateName.mockRejectedValue(
      apiError(403, {
        message: "only the user themselves or an admin can update this user",
        code: 403,
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Editar nome" }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Você só pode alterar os seus próprios dados")).toBeInTheDocument();
  });

  it("cancelar fecha o formulário sem chamar a API", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Editar nome" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByLabelText("Nome")).not.toBeInTheDocument();
    expect(mockedUpdateName).not.toHaveBeenCalled();
  });

  it("alterar senha abre o formulário e sucesso fecha com aviso", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Alterar senha" }));
    await user.type(screen.getByLabelText("Senha atual"), "antiga123");
    await user.type(screen.getByLabelText("Nova senha"), "nova456");
    await user.click(screen.getByRole("button", { name: "Salvar senha" }));

    expect(await screen.findByText("Senha atualizada.")).toBeInTheDocument();
    expect(mockedChangePassword).toHaveBeenCalledWith({
      currentPassword: "antiga123",
      newPassword: "nova456",
    });
    expect(screen.queryByLabelText("Senha atual")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Alterar senha" })).toBeInTheDocument();
  });

  it("card Perfil público mostra os contatos do GET e o badge do que não é compartilhado", async () => {
    mockedProfile.mockResolvedValue(
      profile({
        configVisibility: {
          email: { value: "lucas@ajudadev.dev", shareWithCommunity: true },
          github: { value: "https://github.com/lucas", shareWithCommunity: true },
          phone: { value: "11999999999", shareWithCommunity: false },
        },
      }),
    );
    renderPage();

    expect(await screen.findByRole("heading", { name: "Perfil público" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "https://github.com/lucas" })).toBeInTheDocument();
    expect(screen.getByText("11999999999")).toBeInTheDocument();
    expect(screen.getByText("Não compartilhado com a comunidade:")).toBeInTheDocument();
    expect(screen.getAllByText("Telefone")).toHaveLength(2);

    const hiddenRow = screen.getByText("Não compartilhado com a comunidade:").parentElement!;
    expect(within(hiddenRow).getByText("Telefone")).toBeInTheDocument();
    expect(within(hiddenRow).queryAllByText(/^[a-z]$/)).toHaveLength(0);
  });

  it("editar perfil pré-preenche o formulário e cancelar descarta sem request", async () => {
    mockedProfile.mockResolvedValue(
      profile({
        configVisibility: {
          email: { value: "lucas@ajudadev.dev", shareWithCommunity: true },
          github: { value: "https://github.com/lucas", shareWithCommunity: true },
        },
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Editar perfil" }));

    expect(screen.getByLabelText("Resumo")).toHaveValue("Dev backend");
    expect(screen.getByLabelText("GitHub")).toHaveValue("https://github.com/lucas");
    expect(screen.getAllByLabelText("Compartilhar com a comunidade")[0]).toBeChecked();
    expect(screen.getByLabelText("Compartilhar e-mail com a comunidade")).toBeChecked();

    await user.clear(screen.getByLabelText("GitHub"));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByLabelText("GitHub")).not.toBeInTheDocument();
    expect(mockedUpdateProfile).not.toHaveBeenCalled();
  });

  it("salvar só o GitHub alterado envia apenas essa chave no body", async () => {
    mockedProfile.mockResolvedValue(
      profile({
        configVisibility: {
          email: { value: "lucas@ajudadev.dev", shareWithCommunity: true },
          github: { value: "https://github.com/lucas", shareWithCommunity: true },
        },
      }),
    );
    mockedUpdateProfile.mockResolvedValue({
      id: "u1",
      name: "Lucas Rocha",
      email: "lucas@ajudadev.dev",
      role: "USER",
      description: "Dev backend",
      configVisibility: {
        email: { value: "lucas@ajudadev.dev", shareWithCommunity: true },
        github: { value: "https://github.com/lucasrocha", shareWithCommunity: true },
      },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Editar perfil" }));
    await user.clear(screen.getByLabelText("GitHub"));
    await user.type(screen.getByLabelText("GitHub"), "https://github.com/lucasrocha");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Perfil atualizado.")).toBeInTheDocument();
    expect(mockedUpdateProfile).toHaveBeenCalledWith("u1", {
      configVisibility: {
        github: { value: "https://github.com/lucasrocha", shareWithCommunity: true },
      },
    });
    expect(mockedUpdateProfile.mock.calls[0][1]).toEqual({
      configVisibility: {
        github: { value: "https://github.com/lucasrocha", shareWithCommunity: true },
      },
    });
    expect(screen.queryByLabelText("GitHub")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "https://github.com/lucasrocha" })).toBeInTheDocument();
  });

  it("alternar o e-mail envia value vazio e só o compartilhamento", async () => {
    mockedUpdateProfile.mockResolvedValue({
      id: "u1",
      name: "Lucas Rocha",
      email: "lucas@ajudadev.dev",
      role: "USER",
      description: "Dev backend",
      configVisibility: { email: { value: "lucas@ajudadev.dev", shareWithCommunity: false } },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Editar perfil" }));
    await user.click(screen.getByLabelText("Compartilhar e-mail com a comunidade"));
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Perfil atualizado.")).toBeInTheDocument();
    expect(mockedUpdateProfile.mock.calls[0][1]).toEqual({
      configVisibility: { email: { value: "", shareWithCommunity: false } },
    });
  });

  it("alterar o resumo envia só description", async () => {
    mockedUpdateProfile.mockResolvedValue({
      id: "u1",
      name: "Lucas Rocha",
      email: "lucas@ajudadev.dev",
      role: "USER",
      description: "Dev backend e Go",
      configVisibility: { email: { value: "lucas@ajudadev.dev", shareWithCommunity: true } },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Editar perfil" }));
    await user.clear(screen.getByLabelText("Resumo"));
    await user.type(screen.getByLabelText("Resumo"), "Dev backend e Go");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Perfil atualizado.")).toBeInTheDocument();
    expect(mockedUpdateProfile.mock.calls[0][1]).toEqual({ description: "Dev backend e Go" });
    expect(screen.getByRole("heading", { name: "Lucas Rocha" })).toBeInTheDocument();
    expect(screen.getAllByText("Dev backend e Go")).toHaveLength(2);
  });

  it("resumo e contato alterados juntos vão no mesmo body", async () => {
    mockedUpdateProfile.mockResolvedValue({
      id: "u1",
      name: "Lucas Rocha",
      email: "lucas@ajudadev.dev",
      role: "USER",
      description: "Novo resumo",
      configVisibility: {
        email: { value: "lucas@ajudadev.dev", shareWithCommunity: true },
        phone: { value: "11999999999", shareWithCommunity: true },
      },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Editar perfil" }));
    await user.clear(screen.getByLabelText("Resumo"));
    await user.type(screen.getByLabelText("Resumo"), "Novo resumo");
    await user.type(screen.getByLabelText("Telefone"), "11999999999");
    await user.click(screen.getAllByLabelText("Compartilhar com a comunidade")[4]);
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Perfil atualizado.")).toBeInTheDocument();
    expect(mockedUpdateProfile.mock.calls[0][1]).toEqual({
      description: "Novo resumo",
      configVisibility: { phone: { value: "11999999999", shareWithCommunity: true } },
    });
  });

  it("sem mudanças o botão Salvar fica desabilitado", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Editar perfil" }));

    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  it("URL inválida é barrada localmente sem chamar a API", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Editar perfil" }));
    await user.type(screen.getByLabelText("GitHub"), "github.com/lucas");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(
      await screen.findByText("Informe um link http(s) válido (ex.: https://exemplo.com)"),
    ).toBeInTheDocument();
    expect(mockedUpdateProfile).not.toHaveBeenCalled();
  });

  it("telefone inválido é barrado localmente sem chamar a API", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Editar perfil" }));
    await user.type(screen.getByLabelText("Telefone"), "1234");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Informe um telefone válido (8 a 15 dígitos)")).toBeInTheDocument();
    expect(mockedUpdateProfile).not.toHaveBeenCalled();
  });

  it("compartilhar sem valor é barrado localmente", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Editar perfil" }));
    await user.click(screen.getAllByLabelText("Compartilhar com a comunidade")[4]);
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Para compartilhar, informe um valor")).toBeInTheDocument();
    expect(mockedUpdateProfile).not.toHaveBeenCalled();
  });

  it("apagar o resumo é barrado localmente com a explicação da limitação", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Editar perfil" }));
    await user.clear(screen.getByLabelText("Resumo"));
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(
      await screen.findByText(
        "Não é possível apagar o resumo: escreva um novo texto ou cancele a edição",
      ),
    ).toBeInTheDocument();
    expect(mockedUpdateProfile).not.toHaveBeenCalled();
  });

  it("400 com cause config_visibility.github.value mostra o erro no campo", async () => {
    mockedUpdateProfile.mockRejectedValue(
      apiError(400, {
        message: "invalid user data",
        code: 400,
        causes: [
          { field: "config_visibility.github.value", message: "value must be a valid http or https url" },
        ],
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Editar perfil" }));
    await user.type(screen.getByLabelText("GitHub"), "https://github.com/lucas");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(
      await screen.findByText("Informe um link http(s) válido (ex.: https://exemplo.com)"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("GitHub")).toBeInTheDocument();
  });

  it("400 sem campo próprio vira alerta geral", async () => {
    mockedUpdateProfile.mockRejectedValue(
      apiError(400, {
        message: "invalid user data",
        code: 400,
        causes: [{ field: "body", message: "provide at least one field to update" }],
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Editar perfil" }));
    await user.type(screen.getByLabelText("GitHub"), "https://github.com/lucas");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Informe ao menos um campo para alterar")).toBeInTheDocument();
    expect(screen.getByLabelText("GitHub")).toBeInTheDocument();
  });

  it("limpar um contato envia valor vazio e ele some da leitura", async () => {
    mockedProfile.mockResolvedValue(
      profile({
        configVisibility: {
          email: { value: "lucas@ajudadev.dev", shareWithCommunity: true },
          phone: { value: "11999999999", shareWithCommunity: true },
        },
      }),
    );
    mockedUpdateProfile.mockResolvedValue({
      id: "u1",
      name: "Lucas Rocha",
      email: "lucas@ajudadev.dev",
      role: "USER",
      description: "Dev backend",
      configVisibility: {
        email: { value: "lucas@ajudadev.dev", shareWithCommunity: true },
        phone: { value: "", shareWithCommunity: false },
      },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Editar perfil" }));
    await user.clear(screen.getByLabelText("Telefone"));
    await user.click(screen.getAllByLabelText("Compartilhar com a comunidade")[4]);
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Perfil atualizado.")).toBeInTheDocument();
    expect(mockedUpdateProfile.mock.calls[0][1]).toEqual({
      configVisibility: { phone: { value: "", shareWithCommunity: false } },
    });
    expect(screen.queryByText("11999999999")).not.toBeInTheDocument();
  });

  it("renderiza a foto compartilhada como imagem no avatar", async () => {
    mockedProfile.mockResolvedValue(
      profile({
        configVisibility: {
          email: { value: "lucas@ajudadev.dev", shareWithCommunity: true },
          photo: { value: "https://exemplo.com/lucas.png", shareWithCommunity: true },
        },
      }),
    );
    renderPage();

    const images = await screen.findAllByRole("img", { name: "Foto de Lucas Rocha" });
    expect(images.length).toBeGreaterThan(0);
    expect(images[0]).toHaveAttribute("src", "https://exemplo.com/lucas.png");
  });

  it("sem foto o avatar mostra as iniciais", async () => {
    renderPage();

    await screen.findByRole("heading", { name: "Lucas Rocha" });
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getAllByText("LR").length).toBeGreaterThan(0);
  });

  it("foto que falha ao carregar cai nas iniciais", async () => {
    mockedProfile.mockResolvedValue(
      profile({
        configVisibility: {
          email: { value: "lucas@ajudadev.dev", shareWithCommunity: true },
          photo: { value: "https://exemplo.com/quebrada.png", shareWithCommunity: true },
        },
      }),
    );
    renderPage();

    const images = await screen.findAllByRole("img", { name: "Foto de Lucas Rocha" });
    images.forEach((image) => fireEvent.error(image));

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getAllByText("LR").length).toBeGreaterThan(0);
  });

  it("a foto não aparece como link na lista de contatos", async () => {
    mockedProfile.mockResolvedValue(
      profile({
        configVisibility: {
          email: { value: "lucas@ajudadev.dev", shareWithCommunity: true },
          photo: { value: "https://exemplo.com/lucas.png", shareWithCommunity: true },
        },
      }),
    );
    renderPage();

    await screen.findAllByRole("img", { name: "Foto de Lucas Rocha" });
    expect(screen.queryByRole("link", { name: "https://exemplo.com/lucas.png" })).not.toBeInTheDocument();
  });

  it("foto não compartilhada continua visível para o próprio dono", async () => {
    mockedProfile.mockResolvedValue(
      profile({
        configVisibility: {
          email: { value: "lucas@ajudadev.dev", shareWithCommunity: true },
          photo: { value: "https://exemplo.com/lucas.png", shareWithCommunity: false },
        },
      }),
    );
    renderPage();

    const images = await screen.findAllByRole("img", { name: "Foto de Lucas Rocha" });
    expect(images.length).toBeGreaterThan(0);

    const hiddenRow = screen.getByText("Não compartilhado com a comunidade:").parentElement!;
    expect(within(hiddenRow).getByText("Foto")).toBeInTheDocument();
    expect(within(hiddenRow).queryByText("p")).not.toBeInTheDocument();
  });

  it("salvar a foto envia a chave photo no body", async () => {
    mockedUpdateProfile.mockResolvedValue({
      id: "u1",
      name: "Lucas Rocha",
      email: "lucas@ajudadev.dev",
      role: "USER",
      description: "Dev backend",
      configVisibility: {
        email: { value: "lucas@ajudadev.dev", shareWithCommunity: true },
        photo: { value: "https://exemplo.com/lucas.png", shareWithCommunity: true },
      },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Editar perfil" }));
    await user.type(screen.getByLabelText("Foto"), "https://exemplo.com/lucas.png");
    await user.click(screen.getAllByLabelText("Compartilhar com a comunidade")[3]);
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Perfil atualizado.")).toBeInTheDocument();
    expect(mockedUpdateProfile.mock.calls[0][1]).toEqual({
      configVisibility: { photo: { value: "https://exemplo.com/lucas.png", shareWithCommunity: true } },
    });
    expect(screen.getAllByRole("img", { name: "Foto de Lucas Rocha" }).length).toBeGreaterThan(0);
  });

  it("URL de foto inválida é barrada localmente", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Editar perfil" }));
    await user.type(screen.getByLabelText("Foto"), "exemplo.com/foto.png");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(
      await screen.findByText("Informe um link http(s) válido (ex.: https://exemplo.com)"),
    ).toBeInTheDocument();
    expect(mockedUpdateProfile).not.toHaveBeenCalled();
  });

  it("não grava nada na sessão ao salvar o perfil", async () => {
    mockedUpdateProfile.mockResolvedValue({
      id: "u1",
      name: "Lucas Rocha",
      email: "lucas@ajudadev.dev",
      role: "USER",
      description: "Novo resumo",
      configVisibility: { email: { value: "lucas@ajudadev.dev", shareWithCommunity: true } },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Editar perfil" }));
    await user.clear(screen.getByLabelText("Resumo"));
    await user.type(screen.getByLabelText("Resumo"), "Novo resumo");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Perfil atualizado.")).toBeInTheDocument();
    expect(localStorage.getItem("ajudadev.token")).toBeNull();
    expect(JSON.parse(localStorage.getItem("ajudadev.user") ?? "{}").name).toBe("Lucas Rocha");
  });
});
