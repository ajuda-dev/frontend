import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Skill } from "../../types/api";
import { SkillAdminPanel } from "./SkillAdminPanel";

vi.mock("../../services/skill", () => ({
  createSkill: vi.fn(),
  updateSkill: vi.fn(),
  deleteSkill: vi.fn(),
}));

import { createSkill, deleteSkill, updateSkill } from "../../services/skill";

const mockedCreate = vi.mocked(createSkill);
const mockedUpdate = vi.mocked(updateSkill);
const mockedDelete = vi.mocked(deleteSkill);

function skill(id: string, name: string): Skill {
  return { id, name };
}

function apiError(status: number, data: unknown) {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data },
  });
}

interface Handlers {
  onCreated?: (skill: Skill) => void;
  onUpdated?: (skill: Skill) => void;
  onDeleted?: (skillId: string) => void;
}

function renderPanel(handlers: Handlers = {}) {
  const onCreated = handlers.onCreated ?? vi.fn();
  const onUpdated = handlers.onUpdated ?? vi.fn();
  const onDeleted = handlers.onDeleted ?? vi.fn();

  render(
    <SkillAdminPanel onCreated={onCreated} onUpdated={onUpdated} onDeleted={onDeleted}>
      {({ onEdit, onRemove }) => (
        <div>
          <button type="button" onClick={() => onEdit(skill("s1", "GOLANG"))}>
            editar
          </button>
          <button type="button" onClick={() => onRemove(skill("s1", "GOLANG"))}>
            remover
          </button>
        </div>
      )}
    </SkillAdminPanel>,
  );

  return { onCreated, onUpdated, onDeleted };
}

describe("SkillAdminPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("não chama a API com nome vazio", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "Cadastrar habilidade" }));

    expect(await screen.findByText("Informe o nome da habilidade")).toBeInTheDocument();
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("cadastra com o nome sem espaços nas pontas e limpa o campo", async () => {
    mockedCreate.mockResolvedValue(skill("s9", "RUST"));
    const onCreated = vi.fn();
    const user = userEvent.setup();
    renderPanel({ onCreated });

    const input = screen.getByLabelText("Nova habilidade");
    await user.type(input, "  RUST  ");
    await user.click(screen.getByRole("button", { name: "Cadastrar habilidade" }));

    await waitFor(() => expect(mockedCreate).toHaveBeenCalledWith("RUST"));
    expect(onCreated).toHaveBeenCalledWith(skill("s9", "RUST"));
    expect(input).toHaveValue("");
  });

  it("erro de campo da API vira erro do input, não alerta", async () => {
    mockedCreate.mockRejectedValue(
      apiError(400, {
        message: "Invalid skill data",
        causes: [{ field: "name", message: "Skill already exists" }],
      }),
    );
    const user = userEvent.setup();
    renderPanel();

    await user.type(screen.getByLabelText("Nova habilidade"), "GOLANG");
    await user.click(screen.getByRole("button", { name: "Cadastrar habilidade" }));

    expect(await screen.findByText("Já existe uma habilidade com este nome")).toBeInTheDocument();
    expect(screen.queryByText("Dados da habilidade inválidos")).not.toBeInTheDocument();
  });

  it("erro sem campo cai no alerta com a mensagem traduzida", async () => {
    mockedCreate.mockRejectedValue(
      apiError(500, { message: "something brand new", error: "boom" }),
    );
    const user = userEvent.setup();
    renderPanel();

    await user.type(screen.getByLabelText("Nova habilidade"), "RUST");
    await user.click(screen.getByRole("button", { name: "Cadastrar habilidade" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Não foi possível concluir a operação. Tente novamente.");
    expect(alert).toHaveTextContent("HTTP 500");
  });

  it("renomear exige confirmação do formulário e envia o novo nome", async () => {
    mockedUpdate.mockResolvedValue(skill("s1", "GO"));
    const onUpdated = vi.fn();
    const user = userEvent.setup();
    renderPanel({ onUpdated });

    await user.click(screen.getByRole("button", { name: "editar" }));

    const editInput = screen.getByLabelText("Renomear GOLANG");
    expect(editInput).toHaveValue("GOLANG");

    await user.clear(editInput);
    await user.type(editInput, "GO");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(mockedUpdate).toHaveBeenCalledWith("s1", "GO"));
    expect(onUpdated).toHaveBeenCalledWith(skill("s1", "GO"));
    expect(screen.queryByLabelText("Renomear GOLANG")).not.toBeInTheDocument();
  });

  it("cancelar a edição fecha o formulário sem chamar a API", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "editar" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByLabelText("Renomear GOLANG")).not.toBeInTheDocument();
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("remover pede confirmação e avisa sobre o impacto nos perfis", async () => {
    mockedDelete.mockResolvedValue(undefined);
    const onDeleted = vi.fn();
    const user = userEvent.setup();
    renderPanel({ onDeleted });

    await user.click(screen.getByRole("button", { name: "remover" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("removida do perfil de todos os usuários");
    expect(mockedDelete).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Arquivar" }));

    await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith("s1"));
    expect(onDeleted).toHaveBeenCalledWith("s1");
  });

  it("cancelar a remoção não exclui", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "remover" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    expect(mockedDelete).not.toHaveBeenCalled();
  });

  it("falha ao remover mostra o alerta e fecha o modal", async () => {
    mockedDelete.mockRejectedValue(
      apiError(403, { message: "only moderators and admins can delete skills" }),
    );
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "remover" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Arquivar" }));

    expect(
      await screen.findByText("Apenas moderadores e administradores podem arquivar habilidades"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
