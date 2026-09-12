import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../context/AuthContext";
import type { Pageable, Skill } from "../../types/api";
import { SkillsPage } from "./SkillsPage";

vi.mock("../../services/skill", () => ({
  listSkills: vi.fn(),
  createSkill: vi.fn(),
  updateSkill: vi.fn(),
  deleteSkill: vi.fn(),
}));

import { createSkill, deleteSkill, listSkills, updateSkill } from "../../services/skill";

const mockedList = vi.mocked(listSkills);
const mockedCreate = vi.mocked(createSkill);
const mockedUpdate = vi.mocked(updateSkill);
const mockedDelete = vi.mocked(deleteSkill);

function skill(id: string, name: string): Skill {
  return { id, name };
}

function page(data: Skill[], hasNext: boolean): Pageable<Skill> {
  return { data, has_next: hasNext };
}

function apiError(status: number, data: unknown) {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data },
  });
}

function seedSession(role: "USER" | "MODERATOR" | "ADMIN" = "USER") {
  localStorage.setItem("ajudadev.token", "token-123");
  localStorage.setItem(
    "ajudadev.user",
    JSON.stringify({ id: "u1", name: "Lucas Rocha", email: "lucas@ajudadev.dev", role }),
  );
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/skills"]}>
      <AuthProvider>
        <SkillsPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("SkillsPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    seedSession();
  });

  it("lista vazia mostra EmptyState", async () => {
    mockedList.mockResolvedValue(page([], false));
    renderPage();

    expect(await screen.findByText("Nenhuma habilidade encontrada.")).toBeInTheDocument();
  });

  it("renderiza as habilidades do catálogo", async () => {
    mockedList.mockResolvedValue(page([skill("s1", "GOLANG"), skill("s2", "REACT")], false));
    renderPage();

    expect(await screen.findByText("GOLANG")).toBeInTheDocument();
    expect(screen.getByText("REACT")).toBeInTheDocument();
  });

  it("erro mostra Alert com Tentar novamente", async () => {
    mockedList.mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce(page([], false));
    const user = userEvent.setup();
    renderPage();

    expect(
      await screen.findByText("Não foi possível carregar as habilidades"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByText("Nenhuma habilidade encontrada.")).toBeInTheDocument();
  });

  it("busca com debounce reseta a lista para a página 1", async () => {
    mockedList.mockResolvedValue(page([skill("s1", "GOLANG")], false));
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("GOLANG");
    await user.type(screen.getByLabelText("Buscar habilidade"), "GO");

    await waitFor(() =>
      expect(mockedList).toHaveBeenLastCalledWith({ page: 1, name: "GO" }),
    );
  });

  it("com busca ativa a lista vazia fala em termo", async () => {
    mockedList.mockResolvedValue(page([], false));
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Nenhuma habilidade encontrada.");
    await user.type(screen.getByLabelText("Buscar habilidade"), "zzz");

    expect(
      await screen.findByText(
        "Nenhuma habilidade começa com esse termo. Tente outro trecho ou limpe a busca.",
      ),
    ).toBeInTheDocument();
  });

  it("Carregar mais só aparece com has_next e faz append", async () => {
    mockedList
      .mockResolvedValueOnce(page([skill("s1", "GOLANG")], true))
      .mockResolvedValueOnce(page([skill("s2", "REACT")], false));
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("GOLANG");
    await user.click(screen.getByRole("button", { name: "Carregar mais" }));

    expect(await screen.findByText("REACT")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Carregar mais" })).not.toBeInTheDocument();
    expect(mockedList).toHaveBeenLastCalledWith({ page: 2, name: "" });
  });

  it("USER não vê o painel de administração", async () => {
    mockedList.mockResolvedValue(page([skill("s1", "GOLANG")], false));
    renderPage();

    await screen.findByText("GOLANG");
    expect(screen.queryByText("Administrar habilidades")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cadastrar habilidade" })).not.toBeInTheDocument();
  });

  it("MODERATOR vê o painel de administração", async () => {
    seedSession("MODERATOR");
    mockedList.mockResolvedValue(page([skill("s1", "GOLANG")], false));
    renderPage();

    expect(await screen.findByText("Administrar habilidades")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cadastrar habilidade" })).toBeInTheDocument();
  });

  it("cadastrar habilidade chama o service e recarrega a lista", async () => {
    seedSession("MODERATOR");
    mockedList.mockResolvedValue(page([], false));
    mockedCreate.mockResolvedValue(skill("s9", "RUST"));
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Nenhuma habilidade encontrada.");
    await user.type(screen.getByLabelText("Nova habilidade"), "RUST");
    await user.click(screen.getByRole("button", { name: "Cadastrar habilidade" }));

    await waitFor(() => expect(mockedCreate).toHaveBeenCalledWith("RUST"));
    await waitFor(() => expect(mockedList).toHaveBeenCalledTimes(2));
  });

  it("nome duplicado mostra o erro do campo vindo da API", async () => {
    seedSession("MODERATOR");
    mockedList.mockResolvedValue(page([skill("s1", "GOLANG")], false));
    mockedCreate.mockRejectedValue(
      apiError(400, {
        message: "Invalid skill data",
        causes: [{ field: "name", message: "Skill already exists" }],
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole("button", { name: "Renomear GOLANG" });
    await user.type(screen.getByLabelText("Nova habilidade"), "GOLANG");
    await user.click(screen.getByRole("button", { name: "Cadastrar habilidade" }));

    expect(await screen.findByText("Já existe uma habilidade com este nome")).toBeInTheDocument();
  });

  it("renomear habilidade abre o formulário e salva o novo nome", async () => {
    seedSession("MODERATOR");
    mockedList.mockResolvedValue(page([skill("s1", "GOLANG")], false));
    mockedUpdate.mockResolvedValue(skill("s1", "GO"));
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole("button", { name: "Renomear GOLANG" });
    await user.click(screen.getByRole("button", { name: "Renomear GOLANG" }));

    const editInput = screen.getByLabelText("Renomear GOLANG");
    await user.clear(editInput);
    await user.type(editInput, "GO");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(mockedUpdate).toHaveBeenCalledWith("s1", "GO"));
  });

  it("arquivar habilidade pede confirmação antes de excluir", async () => {
    seedSession("MODERATOR");
    mockedList.mockResolvedValue(page([skill("s1", "GOLANG")], false));
    mockedDelete.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole("button", { name: "Renomear GOLANG" });
    await user.click(screen.getByRole("button", { name: "Arquivar GOLANG" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Arquivar habilidade")).toBeInTheDocument();
    expect(mockedDelete).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Arquivar" }));

    await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith("s1"));
  });

  it("403 ao arquivar mostra a mensagem traduzida", async () => {
    seedSession("MODERATOR");
    mockedList.mockResolvedValue(page([skill("s1", "GOLANG")], false));
    mockedDelete.mockRejectedValue(
      apiError(403, { message: "only moderators and admins can delete skills" }),
    );
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole("button", { name: "Renomear GOLANG" });
    await user.click(screen.getByRole("button", { name: "Arquivar GOLANG" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Arquivar" }));

    expect(
      await screen.findByText("Apenas moderadores e administradores podem arquivar habilidades"),
    ).toBeInTheDocument();
  });
});
